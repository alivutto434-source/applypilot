import type { JobApplication, Settings } from "@prisma/client";
import { analyzeJob } from "./ai";
import { log, STAGES } from "./logs";
import { prisma } from "./prisma";
import { getSettings } from "./settings";
import { readCv, cvExists } from "./cv-store";
import { sendApplicationEmail } from "./mail";
import { resolveRecruiterEmail } from "./recruiter";
import { textToHtml } from "./richtext";

function applyTemplate(template: string, app: JobApplication) {
  return template
    .replaceAll("{{jobTitle}}", app.jobTitle || "the advertised role")
    .replaceAll("{{companyName}}", app.companyName || "your team")
    .replaceAll("{{sourceUrl}}", app.sourceUrl || "");
}

function describeFlags(settings: Settings) {
  const on = (value: boolean) => (value ? "ON" : "off");
  return [
    `draft ${on(settings.flagDraft)}`,
    `auto-send ${on(settings.flagAutoSend && !settings.flagDraft)}`,
    `auto-generate email ${on(settings.flagAutoGenerateEmail)}`,
    `fetch recruiter email ${on(settings.flagFetchRecruiterEmail)}`,
    `attach CV ${on(settings.attachCv)}`,
  ].join(" · ");
}

/**
 * analyse → (optionally) draft → (optionally) send.
 *
 * There is NO automatic skipping: a low match score is reported and logged,
 * but the flags alone decide whether we keep a draft or send it.
 */
export async function runPipeline(
  app: JobApplication,
  settingsOverride?: Settings
): Promise<JobApplication> {
  const settings = settingsOverride ?? (await getSettings());
  let current = app;

  await log({
    stage: STAGES.INTAKE,
    message: `Received job${current.companyName ? ` from ${current.companyName}` : ""}${
      current.jobTitle ? ` for “${current.jobTitle}”` : ""
    } — ${current.jobDescription.length.toLocaleString()} characters of description.`,
    applicationId: current.id,
  });

  await log({
    level: "INFO",
    stage: STAGES.CONFIG,
    message: `Flags for this run — ${describeFlags(settings)}.`,
    applicationId: current.id,
  });

  if (current.sourceUrl) {
    await log({
      level: "INFO",
      stage: STAGES.INTAKE,
      message: `Source URL saved: ${current.sourceUrl}`,
      applicationId: current.id,
    });
  }

  // ------------------------------------------------ recruiter email discovery
  if (!current.recruiterEmail && settings.flagFetchRecruiterEmail) {
    await log({
      level: "INFO",
      stage: STAGES.EMAIL,
      message: "No recruiter address given — fetching one (flag is ON).",
      applicationId: current.id,
    });

    const found = await resolveRecruiterEmail({
      sourceUrl: current.sourceUrl,
      jobDescription: current.jobDescription,
    });

    if (found.email) {
      current = await prisma.jobApplication.update({
        where: { id: current.id },
        data: { recruiterEmail: found.email, recruiterSource: found.source },
      });
      await log({
        level: "SUCCESS",
        stage: STAGES.EMAIL,
        message: `Recruiter address resolved — ${found.email} (${found.detail}).`,
        applicationId: current.id,
      });
    } else {
      await log({
        level: "WARN",
        stage: STAGES.EMAIL,
        message: `Could not resolve a recruiter address: ${found.detail}. The email will stay a draft.`,
        applicationId: current.id,
      });
    }
  } else if (!current.recruiterEmail) {
    await log({
      level: "INFO",
      stage: STAGES.EMAIL,
      message: "No recruiter address given and “fetch recruiter email” is off.",
      applicationId: current.id,
    });
  }

  if (!settings.cvText.trim()) {
    await log({
      level: "WARN",
      stage: STAGES.CONFIG,
      message: "No master CV saved yet — the AI is scoring against an empty profile.",
      applicationId: current.id,
    });
  }

  // ---------------------------------------------------------------- AI step
  await log({
    level: "AI",
    stage: STAGES.AI,
    message: `Scoring with ${settings.aiModel} (${settings.strictness} matching${
      settings.flagAutoGenerateEmail ? ", drafting the email" : ", email generation is OFF"
    }).`,
    applicationId: current.id,
  });

  let ai;
  try {
    ai = await analyzeJob({
      cvText: settings.cvText,
      jobDescription: current.jobDescription,
      jobTitle: current.jobTitle,
      companyName: current.companyName,
      sourceUrl: current.sourceUrl,
      strictness: (settings.strictness as "strict" | "balanced" | "lenient") ?? "balanced",
      minMatchScore: settings.minMatchScore,
      model: settings.aiModel,
      senderName: settings.senderName,
      defaultSubject: settings.defaultSubject,
      draftEmail: settings.flagAutoGenerateEmail,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown AI error";
    await log({
      level: "ERROR",
      stage: STAGES.AI,
      message: `AI analysis failed: ${message}`,
      applicationId: current.id,
    });
    return prisma.jobApplication.update({
      where: { id: current.id },
      data: { status: "FAILED", errorMessage: message },
    });
  }

  const { result } = ai;

  await log({
    level: result.isMatch ? "SUCCESS" : "WARN",
    stage: STAGES.MATCH,
    message: `Match ${result.matchScore}/100 → ${
      result.isMatch ? "good fit" : "weak fit (kept anyway — nothing is skipped automatically)"
    }. ${result.reasoning}`,
    applicationId: current.id,
    meta: { strengths: result.keyStrengths, gaps: result.gaps, tokens: ai.meta.completionTokens },
  });

  if (result.keyStrengths.length) {
    await log({
      level: "SUCCESS",
      stage: STAGES.MATCH,
      message: `Strong points: ${result.keyStrengths.join(" · ")}`,
      applicationId: current.id,
    });
  }
  if (result.gaps.length) {
    await log({
      level: "WARN",
      stage: STAGES.MATCH,
      message: `Gaps flagged: ${result.gaps.join(" · ")}`,
      applicationId: current.id,
    });
  }

  // The model may have spotted an address in the posting too.
  if (!current.recruiterEmail && settings.flagFetchRecruiterEmail && result.recruiterEmail) {
    current = await prisma.jobApplication.update({
      where: { id: current.id },
      data: { recruiterEmail: result.recruiterEmail, recruiterSource: "description" },
    });
    await log({
      level: "SUCCESS",
      stage: STAGES.EMAIL,
      message: `The AI spotted a recruiter address in the posting: ${result.recruiterEmail}.`,
      applicationId: current.id,
    });
  }

  // ------------------------------------------------------------ draft email
  let subject = current.emailSubject ?? null;
  let body = current.emailBody ?? null;
  let bodyHtml = current.emailBodyHtml ?? null;

  if (settings.flagAutoGenerateEmail) {
    subject = result.subject?.trim() || applyTemplate(settings.defaultSubject, current) || "Application";
    body = result.body ?? "";
    bodyHtml = textToHtml(body);

    await log({
      level: "AI",
      stage: STAGES.DRAFT,
      message: `Email drafted — subject: “${subject}”`,
      applicationId: current.id,
    });
  } else {
    await log({
      level: "INFO",
      stage: STAGES.DRAFT,
      message:
        "Auto-generate email is OFF — the AI only scored the fit. Write the email in the history row, or turn the flag on.",
      applicationId: current.id,
    });
  }

  const drafted = await prisma.jobApplication.update({
    where: { id: current.id },
    data: {
      emailSubject: subject,
      emailBody: body,
      emailBodyHtml: bodyHtml,
      matchScore: Math.round(result.matchScore),
      isMatch: result.isMatch,
      matchReasoning: result.reasoning,
      aiModel: settings.aiModel,
      status: "DRAFTED",
      errorMessage: null,
    },
  });

  // -------------------------------------------------- draft vs. send decision
  if (settings.flagDraft) {
    await log({
      level: "INFO",
      stage: STAGES.EMAIL,
      message: "Draft flag is ON — saved as a draft. Nothing was sent.",
      applicationId: current.id,
    });
    return drafted;
  }

  if (!settings.flagAutoSend) {
    await log({
      level: "INFO",
      stage: STAGES.EMAIL,
      message: "Auto-send flag is OFF — saved as a draft. Send it from the history row when ready.",
      applicationId: current.id,
    });
    return drafted;
  }

  if (!drafted.recruiterEmail) {
    await log({
      level: "WARN",
      stage: STAGES.EMAIL,
      message: "Auto-send is ON but there is no recruiter address — kept as a draft.",
      applicationId: current.id,
    });
    return drafted;
  }

  if (!drafted.emailSubject || !drafted.emailBody) {
    await log({
      level: "WARN",
      stage: STAGES.EMAIL,
      message: "Auto-send is ON but the email is empty — kept as a draft.",
      applicationId: current.id,
    });
    return drafted;
  }

  return sendApplication(drafted.id, settings);
}

/** Send an existing draft (auto-send or the manual Send button). */
export async function sendApplication(
  applicationId: string,
  settingsOverride?: Settings
): Promise<JobApplication> {
  const settings = settingsOverride ?? (await getSettings());
  const app = await prisma.jobApplication.findUnique({ where: { id: applicationId } });

  if (!app) throw new Error("Application not found");
  if (!app.recruiterEmail) throw new Error("This application has no recruiter email");
  if (!app.emailSubject || (!app.emailBody && !app.emailBodyHtml)) {
    throw new Error("This application has no drafted email yet");
  }

  let attachment: { filename: string; content: Buffer } | null = null;
  if (settings.attachCv) {
    if (await cvExists()) {
      const cv = await readCv();
      if (cv) {
        attachment = { filename: cv.meta.fileName || "CV.pdf", content: cv.bytes };
        await log({
          level: "INFO",
          stage: STAGES.CV,
          message: `Attaching ${attachment.filename} (${Math.round(cv.bytes.byteLength / 1024)} KB).`,
          applicationId,
        });
      }
    } else {
      await log({
        level: "WARN",
        stage: STAGES.CV,
        message: "CV attachment is enabled but no PDF is uploaded — sending without it.",
        applicationId,
      });
    }
  }

  try {
    const info = await sendApplicationEmail({
      to: app.recruiterEmail,
      subject: app.emailSubject,
      body: app.emailBody ?? "",
      bodyHtml: app.emailBodyHtml,
      signature: settings.signature,
      signatureHtml: settings.signatureHtml,
      attachment,
    });

    await log({
      level: "EMAIL",
      stage: STAGES.EMAIL,
      message: `Email dispatched to ${app.recruiterEmail}${
        attachment ? " with your CV attached" : ""
      }${settings.signatureHtml ? " and your rich signature" : ""}. Message id: ${info.messageId}`,
      applicationId,
    });

    return prisma.jobApplication.update({
      where: { id: applicationId },
      data: {
        status: "SENT",
        emailSentAt: new Date(),
        cvAttached: Boolean(attachment),
        errorMessage: null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown SMTP error";
    await log({
      level: "ERROR",
      stage: STAGES.EMAIL,
      message: `Send failed: ${message}`,
      applicationId,
    });
    return prisma.jobApplication.update({
      where: { id: applicationId },
      data: { status: "FAILED", errorMessage: message },
    });
  }
}

/** Fill in a draft manually (used by PATCH /api/applications/[id]). */
export async function saveDraftContent(
  applicationId: string,
  input: { emailSubject?: string; emailBodyHtml?: string; emailBody?: string; recruiterEmail?: string }
) {
  const { htmlToText, toHtml } = await import("./richtext");
  const data: Record<string, unknown> = {};

  if (input.emailSubject !== undefined) data.emailSubject = input.emailSubject;
  if (input.recruiterEmail !== undefined) {
    data.recruiterEmail = input.recruiterEmail || null;
    data.recruiterSource = input.recruiterEmail ? "manual" : null;
  }

  if (input.emailBodyHtml !== undefined) {
    data.emailBodyHtml = input.emailBodyHtml;
    data.emailBody = htmlToText(input.emailBodyHtml);
  } else if (input.emailBody !== undefined) {
    data.emailBody = input.emailBody;
    data.emailBodyHtml = toHtml(input.emailBody);
  }

  return prisma.jobApplication.update({ where: { id: applicationId }, data });
}
