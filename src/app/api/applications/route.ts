import { NextResponse } from "next/server";
import type { AppStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { runPipeline } from "@/lib/pipeline";
import { jobInputSchema } from "@/lib/validations";
import { log, STAGES } from "@/lib/logs";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status") as AppStatus | null;
  const take = Math.min(Number(url.searchParams.get("take") ?? 25), 100);

  const applications = await prisma.jobApplication.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    take,
  });

  return NextResponse.json({ applications });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = jobInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const input = parsed.data;

  const application = await prisma.jobApplication.create({
    data: {
      jobDescription: input.jobDescription,
      sourceUrl: input.sourceUrl ?? null,
      recruiterEmail: input.recruiterEmail ?? null,
      companyName: input.companyName ?? null,
      jobTitle: input.jobTitle ?? null,
      status: "DRAFTED",
    },
  });

  try {
    const result = await runPipeline(application);
    return NextResponse.json({ application: result }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pipeline crashed";
    await log({
      level: "ERROR",
      stage: STAGES.INTAKE,
      message: `Pipeline crashed: ${message}`,
      applicationId: application.id,
    });
    await prisma.jobApplication.update({
      where: { id: application.id },
      data: { status: "FAILED", errorMessage: message },
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
