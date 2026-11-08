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
});

export type JobInput = z.infer<typeof jobInputSchema>;

export const settingsSchema = z.object({
  cvText: z.string().max(60_000).optional(),
  signatureHtml: z.string().max(20_000).optional(),
  senderName: z.string().max(120).optional(),
  defaultSubject: z.string().max(300).optional(),

  // mail sending flags
  flagDraft: z.boolean().optional(),
  flagAutoSend: z.boolean().optional(),
  flagFetchRecruiterEmail: z.boolean().optional(),
  flagAutoGenerateEmail: z.boolean().optional(),
  attachCv: z.boolean().optional(),

  strictness: z.enum(["strict", "balanced", "lenient"]).optional(),
  aiModel: z.string().max(120).optional(),
  minMatchScore: z.coerce.number().int().min(0).max(100).optional(),
});

export type SettingsInput = z.infer<typeof settingsSchema>;

export const draftPatchSchema = z.object({
  emailSubject: z.string().max(300).optional(),
  emailBodyHtml: z.string().max(100_000).optional(),
  emailBody: z.string().max(100_000).optional(),
  recruiterEmail: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || z.string().email().safeParse(v).success, {
      message: "That does not look like a valid email address.",
    }),
});
