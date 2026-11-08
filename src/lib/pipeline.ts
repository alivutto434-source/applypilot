import type { JobApplication, Settings } from "@prisma/client";
import { analyzeJob } from "./ai";
import { log, STAGES } from "./logs";
import { prisma } from "./prisma";
import { getSettings } from "./settings";
import { readCv, cvExists } from "./cv-store";
import { sendApplicationEmail } from "./mail";

function applyTemplate(template: string, app: JobApplication) {
  return template
    .replaceAll("{{jobTitle}}", app.jobTitle || "the advertised role")
    .replaceAll("{{companyName}}", app.companyName || "your team")
    .replaceAll("{{sourceUrl}}", app.sourceUrl || "");
}

/**
 * Runs the full analyse → draft → (optionally) send pipeline for one application.
 * Always leaves the row in a terminal state (DRAFTED / SENT / SKIPPED_MISMATCH / FAILED)
 * and writes a colour-coded log line for every step.
 */
export async function runPipeline(
  app: JobApplication,
  settingsOverride?: Settings
): Promise<JobApplication> {
  const settings = settingsOverride ?? (await getSettings());

  await log({
    stage: STAGES.INTAKE,
    message: `Received job${
      app.companyName ? ` from ${app.companyName}` : ""
    }${app.jobTitle ? ` for “${app.jobTitle}”` : ""} — ${app.jobDescription.length.toLocaleString()} characters of description.`,
    applicationId: app.id,
  });

  if (!settings.cvText.trim()) {
    await log({
      level: "WARN",
      stage: STAGES.CONFIG,
      message:
        "No master CV saved yet — the AI is matching against an empty profile. Add your CV text in Settings.",
      applicationId: app.id,
    });
  }

  if (app.sourceUrl) {
    await log({
      level: "INFO",
      stage: STAGES.INTAKE,
      message: `Source URL saved: ${app.sourceUrl}`,
      applicationId: app.id,
    });
  }

  // ---------------------------------------------------------------- AI step
  await log({
    level: "AI",
    stage: STAGES.AI,
    message: `Sending CV + job description to ${settings.aiModel} (${settings.strictness} matching, threshold ${settings.minMatchScore}).`,
    applicationId: app.id,
  });

  let ai;
  try {
    ai = await analyzeJob({
      cvText: settings.cvText,
      jobDescription: app.jobDescription,
      jobTitle: app.jobTitle,
      companyName: app.companyName,
      sourceUrl: app.sourceUrl,
      strictness: (settings.strictness as "strict" | "balanced" | "lenient") ?? "balanced",
      minMatchScore: settings.minMatchScore,
      model: settings.aiModel,
      senderName: settings.senderName,
      defaultSubject: settings.defaultSubject,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown AI error";
    await log({
      level: "ERROR",
      stage: STAGES.AI,
      message: `AI analysis failed: ${message}`,
      applicationId: app.id,
    });
    return prisma.jobApplication.update({
      where: { id: app.id },
      data: { status: "FAILED", errorMessage: message },
    });
  }

  const { result } = ai;

  await log({
    level: result.isMatch ? "SUCCESS" : "WARN",
    stage: STAGES.MATCH,
    message: `Match score ${result.matchScore}/100 → ${
      result.isMatch ? "MATCH" : "MISMATCH"
    }. ${result.reasoning}`,
    applicationId: app.id,
    meta: { strengths: result.keyStrengths, gaps: result.gaps },
  });

  if (result.keyStrengths.length) {
    await log({
      level: "SUCCESS",
      stage: STAGES.MATCH,
      message: `Strong points: ${result.keyStrengths.join(" · ")}`,
      applicationId: app.id,
    });
  }

  if (result.gaps.length) {
    await log({
      level: "WARN",
      stage: STAGES.MATCH,
      message: `Gaps flagged: ${result.gaps.join(" · ")}`,
      applicationId: app.id,
    });
  }

  // --------------------------------------------------- mismatch bypass logic
  const bypass = settings.bypassMatch;
  if (!result.isMatch && !bypass) {
    await log({
      level: "WARN",
      stage: STAGES.MATCH,
      message:
        "Skipping this one — description does not match your profile and “Send regardless of match” is OFF. Nothing was emailed.",
      applicationId: app.id,
    });

    return prisma.jobApplication.update({
      where: { id: app.id },
      data: {
        status: "SKIPPED_MISMATCH",
        matchScore: Math.round(result.matchScore),
        isMatch: false,
        matchReasoning: result.reasoning,
        aiModel: settings.aiModel,
      },
    });
  }

  if (!result.isMatch && bypass) {
    await log({
      level: "INFO",
      stage: STAGES.MATCH,
      message:
        "Overriding the mismatch: “Send regardless of match” is ON, so drafting the email anyway.",
      applicationId: app.id,
    });
  }

  // ------------------------------------------------------------ draft email
  const subject =
    result.subject?.trim() ||
    applyTemplate(settings.defaultSubject, app) ||
    "Application";

  const drafted = await prisma.jobApplication.update({
    where: { id: app.id },
    data: {
      emailSubject: subject,
      emailBody: result.body,
      matchScore: Math.round(result.matchScore),
      isMatch: result.isMatch,
      matchReasoning: result.reasoning,
      aiModel: settings.aiModel,
      status: "DRAFTED",
      errorMessage: null,
    },
  });

  await log({
    level: "AI",
    stage: STAGES.DRAFT,
    message: `Email drafted — subject: “${subject}”`,
    applicationId: app.id,
  });

  // -------------------------------------------------------------- send step
  if (!app.recruiterEmail) {
    await log({
      level: "WARN",
      stage: STAGES.EMAIL,
      message:
        "No recruiter email provided, so the draft is parked. Add an address to send it.",
      applicationId: app.id,
    });
    return drafted;
  }

  if (!settings.autoSend) {
    await log({
      level: "INFO",
      stage: STAGES.EMAIL,
      message:
        "“Send CV automatically” is OFF — draft saved. Hit Send on the history row when you are ready.",
      applicationId: app.id,
    });
    return drafted;
  }

  return sendApplication(app.id, settings);
}

/** Send an existing draft (used both by auto-send and the manual Send button). */
export async function sendApplication(
  applicationId: string,
  settingsOverride?: Settings
): Promise<JobApplication> {
  const settings = settingsOverride ?? (await getSettings());
  const app = await prisma.jobApplication.findUnique({ where: { id: applicationId } });

  if (!app) throw new Error("Application not found");
  if (!app.recruiterEmail) throw new Error("This application has no recruiter email");
  if (!app.emailSubject || !app.emailBody) {
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
      body: app.emailBody,
      signature: settings.signature,
      attachment,
    });

    await log({
      level: "EMAIL",
      stage: STAGES.EMAIL,
      message: `Email dispatched to ${app.recruiterEmail}${
        attachment ? " with your CV attached" : ""
      }. Message id: ${info.messageId}`,
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
