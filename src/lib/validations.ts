import { z } from "zod";

export const jobInputSchema = z.object({
  jobDescription: z
    .string()
    .trim()
    .min(80, "Paste the full job description (at least 80 characters).")
    .max(60_000, "Job description is too long (60k character limit)."),
  sourceUrl: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => !v || /^https?:\/\/.+\..+/.test(v), {
      message: "Source URL must start with http:// or https://",
    }),
  recruiterEmail: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => !v || z.string().email().safeParse(v).success, {
      message: "That does not look like a valid email address.",
    }),
  companyName: z.string().trim().max(160).optional(),
  jobTitle: z.string().trim().max(160).optional(),
  /** Force a send even when the AI says it's a mismatch. */
  bypassMatch: z.boolean().optional(),
});

export type JobInput = z.infer<typeof jobInputSchema>;

export const settingsSchema = z.object({
  cvText: z.string().max(60_000).optional(),
  signature: z.string().max(4_000).optional(),
  senderName: z.string().max(120).optional(),
  defaultSubject: z.string().max(300).optional(),
  autoSend: z.boolean().optional(),
  bypassMatch: z.boolean().optional(),
  attachCv: z.boolean().optional(),
  strictness: z.enum(["strict", "balanced", "lenient"]).optional(),
  aiModel: z.string().max(120).optional(),
  minMatchScore: z.coerce.number().int().min(0).max(100).optional(),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
