import { z } from "zod";

const OPENROUTER_URL =
  (process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/$/, "") +
  "/chat/completions";

export const aiResultSchema = z.object({
  isMatch: z.boolean(),
  matchScore: z.coerce.number().min(0).max(100),
  reasoning: z.string().default(""),
  keyStrengths: z.array(z.string()).default([]),
  gaps: z.array(z.string()).default([]),
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
    "You evaluate a candidate's master CV against a single job description and then draft a short, specific application email.",
    "You are blunt about mismatches: you never invent experience the CV does not contain.",
    "You answer with a single raw JSON object and nothing else. No markdown, no code fences, no commentary.",
  ].join(" ");
}

export function buildUserPrompt(input: AiInput) {
  const target =
    [input.jobTitle, input.companyName].filter(Boolean).join(" @ ") || "the role";

  return `## MATCHING RULES
${STRICTNESS_RULES[input.strictness]}
Treat the role as a match when your matchScore is >= ${input.minMatchScore}.
If the job description is clearly unrelated to the candidate's field, isMatch must be false.

## MASTER CV
${input.cvText.slice(0, 24_000)}

## JOB DESCRIPTION
${input.jobDescription.slice(0, 20_000)}

## TASK
1. Score the fit from 0-100 and decide isMatch.
2. Explain the decision in 2-4 sentences (concrete, mention requirements that did or did not line up).
3. List 2-6 key strengths and 0-5 gaps as short phrases.
4. Draft a concise application email for ${target}.
   - Subject: specific, max 90 characters, mentions the role and the strongest selling point.
   - Body: 120-180 words, plain text, first person, no markdown, no bullet points, no placeholders like [Name], no signature block (the signature is appended by the app).
   - Reference at most two concrete achievements from the CV and the company/role where relevant.
   - Sound human and warm, never desperate.

## OUTPUT JSON SCHEMA
{"isMatch": boolean, "matchScore": number, "reasoning": string, "keyStrengths": string[], "gaps": string[], "subject": string, "body": string}`;
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
    if (start !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error("Model did not return valid JSON");
  }
}

export type AiCallMeta = { model: string; promptTokens?: number; completionTokens?: number };

export async function analyzeJob(
  input: AiInput
): Promise<{ result: AiResult; meta: AiCallMeta; raw: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set. Add it to .env and restart the dev server.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:3000",
        "X-Title": process.env.OPENROUTER_APP_NAME || "ApplyPilot",
      },
      body: JSON.stringify({
        model: input.model,
        temperature: 0.25,
        max_tokens: 1_600,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: buildSystemPrompt() },
          { role: "user", content: buildUserPrompt(input) },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenRouter ${response.status}: ${text.slice(0, 400)}`);
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
      error?: { message?: string };
    };

    if (payload.error?.message) throw new Error(`OpenRouter: ${payload.error.message}`);

    const raw = payload.choices?.[0]?.message?.content ?? "";
    if (!raw) throw new Error("OpenRouter returned an empty response");

    const parsed = aiResultSchema.parse(extractJson(raw));

    return {
      result: parsed,
      raw,
      meta: {
        model: input.model,
        promptTokens: payload.usage?.prompt_tokens,
        completionTokens: payload.usage?.completion_tokens,
      },
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("AI request timed out after 60s. Try a faster model.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
