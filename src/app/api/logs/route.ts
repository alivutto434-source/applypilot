import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const take = Math.min(Number(url.searchParams.get("take") ?? 60), 200);
  const applicationId = url.searchParams.get("applicationId") ?? undefined;

  const logs = await prisma.activityLog.findMany({
    where: applicationId ? { applicationId } : undefined,
    orderBy: { createdAt: "desc" },
    take,
  });

  return NextResponse.json({ logs });
}

export async function DELETE() {
  await prisma.activityLog.deleteMany({});
  return NextResponse.json({ ok: true });
}
