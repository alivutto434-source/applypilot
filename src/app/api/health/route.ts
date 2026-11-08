import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySmtp } from "@/lib/mail";
import { cvExists } from "@/lib/cv-store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const deep = url.searchParams.get("deep") === "true";

  const checks: { name: string; ok: boolean; detail: string }[] = [];

  checks.push({
    name: "OpenRouter key",
    ok: Boolean(process.env.OPENROUTER_API_KEY),
    detail: process.env.OPENROUTER_API_KEY ? "configured" : "missing OPENROUTER_API_KEY",
  });

  try {
    await prisma.$queryRaw`select 1`;
    const count = await prisma.jobApplication.count();
    checks.push({ name: "Database", ok: true, detail: `connected · ${count} applications stored` });
  } catch (error) {
    checks.push({
      name: "Database",
      ok: false,
      detail: error instanceof Error ? error.message.slice(0, 200) : "unreachable",
    });
  }

  checks.push({
    name: "Master CV",
    ok: await cvExists(),
    detail: (await cvExists()) ? "PDF on disk" : "no PDF uploaded (email will send without attachment)",
  });

  if (deep) {
    const smtp = await verifySmtp();
    checks.push({ name: "SMTP", ok: smtp.ok, detail: smtp.message });
  } else {
    checks.push({
      name: "SMTP",
      ok: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
      detail: "credentials present (use ?deep=true to test the login)",
    });
  }

  return NextResponse.json({ ok: checks.every((c) => c.ok), checks });
}
