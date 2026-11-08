import type { Settings } from "@prisma/client";
import { prisma } from "./prisma";
import { htmlToText } from "./richtext";

const SINGLETON = "singleton";

function defaultSignature() {
  const name = process.env.SMTP_FROM_NAME || "Your Name";
  const email = process.env.SMTP_USER || "you@example.com";
  return {
    signatureHtml: `<p><strong>${name}</strong><br />${email}</p>`,
  };
}

export async function getSettings(): Promise<Settings> {
  const existing = await prisma.settings.findUnique({ where: { id: SINGLETON } });
  if (existing) return existing;

  const signature = defaultSignature();
  return prisma.settings.create({
    data: {
      id: SINGLETON,
      senderName: process.env.SMTP_FROM_NAME ?? "",
      signatureHtml: signature.signatureHtml,
      signature: htmlToText(signature.signatureHtml),
    },
  });
}

export async function updateSettings(
  data: Partial<Omit<Settings, "id" | "updatedAt">>
): Promise<Settings> {
  await getSettings();
  const patch = { ...data };

  // Keep the plain-text mirror in sync with the rich signature.
  if (typeof patch.signatureHtml === "string") {
    patch.signature = htmlToText(patch.signatureHtml);
  }

  return prisma.settings.update({ where: { id: SINGLETON }, data: patch });
}
