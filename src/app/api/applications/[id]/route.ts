import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  await prisma.jobApplication.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
