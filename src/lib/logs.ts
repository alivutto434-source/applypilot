import type { LogLevel } from "@prisma/client";
import { prisma } from "./prisma";

type LogInput = {
  level?: LogLevel;
  stage: string;
  message: string;
  applicationId?: string | null;
  meta?: Record<string, unknown> | null;
};

/**
 * Persist a pipeline log line. Never throws — logging must not break a run.
 */
export async function log({
  level = "INFO",
  stage,
  message,
  applicationId,
  meta,
}: LogInput) {
  try {
    return await prisma.activityLog.create({
      data: {
        level,
        stage,
        message: message.slice(0, 2_000),
        applicationId: applicationId ?? null,
        meta: meta ? (meta as object) : undefined,
      },
    });
  } catch (error) {
    console.error("[activity-log] failed to persist", stage, message, error);
    return null;
  }
}

export const STAGES = {
  INTAKE: "intake",
  AI: "ai",
  MATCH: "match",
  DRAFT: "draft",
  EMAIL: "email",
  CV: "cv",
  CONFIG: "config",
} as const;
