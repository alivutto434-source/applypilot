import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { draftPatchSchema } from "@/lib/validations";
import { saveDraftContent } from "@/lib/pipeline";
import { log, STAGES } from "@/lib/logs";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const application = await prisma.jobApplication.findUnique({
    where: { id },
    include: { logs: { orderBy: { createdAt: "desc" }, take: 50 } },
  });
  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }
  return NextResponse.json({ application });
}

/** Edit the drafted email (rich text body, subject, recruiter address). */
export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = draftPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const application = await saveDraftContent(id, parsed.data);

  await log({
    level: "SUCCESS",
    stage: STAGES.DRAFT,
    message: `Draft edited manually — subject: “${application.emailSubject ?? "(none)"}”.`,
    applicationId: id,
  });

  return NextResponse.json({ application });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  await prisma.jobApplication.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
