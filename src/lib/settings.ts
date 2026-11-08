import type { Settings } from "@prisma/client";
import { prisma } from "./prisma";

const SINGLETON = "singleton";

export async function getSettings(): Promise<Settings> {
  const existing = await prisma.settings.findUnique({ where: { id: SINGLETON } });
  if (existing) return existing;

  return prisma.settings.create({
    data: {
      id: SINGLETON,
      senderName: process.env.SMTP_FROM_NAME ?? "",
      signature: [
        "Best regards,",
        process.env.SMTP_FROM_NAME ?? "",
        process.env.SMTP_USER ?? "",
      ]
        .filter(Boolean)
        .join("\n"),
    },
  });
}

export async function updateSettings(
  data: Partial<Omit<Settings, "id" | "updatedAt">>
): Promise<Settings> {
  await getSettings();
  return prisma.settings.update({ where: { id: SINGLETON }, data });
}
