import OpenAI from "openai";
import { z } from "zod";

/** One shared client — OpenRouter speaks the OpenAI protocol. */
let cached: OpenAI | null = null;

function client(): OpenAI {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set. Add it to .env and restart the server.");
  }
  if (cached) return cached;

  cached = new OpenAI({
    apiKey,
    baseURL: (process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/$/, ""),
    timeout: 60_000,
    maxRetries: 1,
    defaultHeaders: {
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:3000",
      "X-Title": process.env.OPENROUTER_APP_NAME || "ApplyPilot",
    },
  });

  return cached;
}

export const aiResultSchema = z.object({
  isMatch: z.boolean(),
  matchScore: z.coerce.number().min(0).max(100),
  reasoning: z.string().default(""),
  keyStrengths: z.array(z.string()).default([]),
  gaps: z.array(z.string()).default([]),
  recruiterEmail: z.string().default(""),
  subject: z.string().default(""),
  body: z.string().default(""),
});

export type AiResult = z.infer<typeof aiResultSchema>;

export type AiInput = {
  cvText: string;
  jobDescription: string;
  jobTitle?: string | null;
  companyName?: string | null;
  sourceUrl?: string | null;
  strictness: "strict" | "balanced" | "lenient";
  minMatchScore: number;
  model: string;
  senderName?: string;
  defaultSubject?: string;
  /** false → only score the fit, do not spend tokens writing an email */
  draftEmail: boolean;
};

const STRICTNESS_RULES: Record<AiInput["strictness"], string> = {
  strict:
    "Be demanding. The candidate must clearly satisfy the core stack, seniority level and domain. Generic overlap is not enough.",
  balanced:
    "Be fair but honest. Reward strong overlap in the core stack and responsibilities, tolerate minor gaps that are easy to learn on the job.",
  lenient:
    "Be encouraging. If the candidate could plausibly do the job with modest ramp-up, treat it as a match.",
};

export function buildSystemPrompt() {
  return [
    "You are an expert technical recruiter and career coach.",
    "You evaluate a candidate's master CV against a single job description and, when asked, draft a short, specific application email.",
    "You are blunt about mismatches: you never invent experience the CV does not contain.",
    "You answer with a single raw JSON object and nothing else. No markdown, no code fences, no commentary.",
  ].join(" ");
}

export function buildUserPrompt(input: AiInput) {
  const target =
    [input.jobTitle, input.companyName].filter(Boolean).join(" at ") || "the role";

  const emailTask = input.draftEmail
    ? `4. Draft a concise application email for ${target}.
   - Subject: specific, max 90 characters, mentions the role and the strongest selling point.
   - Body: 120-180 words, plain text, first person, no markdown, no bullet points, no placeholders like [Name], no signature block (a rich-text signature is appended by the app).
   - Reference at most two concrete achievements from the CV and the company/role where relevant.
   - Sound human and warm, never desperate.`
    : `4. Do NOT write an email. Return empty strings for "subject" and "body".`;

  const schema = `{"isMatch": boolean, "matchScore": number, "reasoning": string, "keyStrengths": string[], "gaps": string[], "recruiterEmail": string, "subject": string, "body": string}`;

  return `## MATCHING RULES
${STRICTNESS_RULES[input.strictness]}
Use this as guidance for the score (threshold ≈ ${input.minMatchScore}/100). The score is information for the human — it never blocks an application.

## MASTER CV
${input.cvText.slice(0, 24_000) || "(no CV text saved yet — say so in the reasoning and score conservatively)"}

## JOB DESCRIPTION
${input.jobDescription.slice(0, 20_000)}

## TASK
1. Score the fit from 0-100 and decide isMatch.
2. Explain the decision in 2-4 sentences (concrete, mention requirements that did or did not line up).
3. List 2-6 key strengths and 0-5 gaps as short phrases. Also put any email address that appears in the job description into "recruiterEmail" (empty string if none).
${emailTask}

## OUTPUT JSON SCHEMA
${schema}`;
}

function extractJson(raw: string): unknown {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("Model did not return valid JSON");
  }
}

export type AiCallMeta = {
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  latencyMs: number;
};

export async function analyzeJob(
  input: AiInput
): Promise<{ result: AiResult; meta: AiCallMeta; raw: string }> {
  const started = Date.now();

  const prompt = buildUserPrompt(input);

  try {
    const completion = await client().chat.completions.create({
      model: input.model,
      temperature: 0.25,
      max_tokens: input.draftEmail ? 1_600 : 700,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content ?? "";
    if (!raw) throw new Error("The model returned an empty response");

    const parsed = aiResultSchema.parse(extractJson(raw));

    return {
      result: parsed,
      raw,
      meta: {
        model: input.model,
        promptTokens: completion.usage?.prompt_tokens,
        completionTokens: completion.usage?.completion_tokens,
        latencyMs: Date.now() - started,
      },
    };
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      const hint =
        error.status === 401
          ? " — check OPENROUTER_API_KEY"
          : error.status === 402
            ? " — your OpenRouter account is out of credits"
            : error.status === 404
              ? ` — model "${input.model}" is not available on OpenRouter`
              : "";
      throw new Error(`OpenRouter ${error.status ?? ""} ${error.message}${hint}`);
    }
    if (error instanceof Error && /abort|timeout/i.test(error.message)) {
      throw new Error("The AI request timed out after 60s. Try a faster model.");
    }
    throw error;
  }
}
