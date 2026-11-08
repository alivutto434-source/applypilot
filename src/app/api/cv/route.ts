import { NextResponse } from "next/server";
import { deleteCv, readCv, saveCv } from "@/lib/cv-store";
import { log, STAGES } from "@/lib/logs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const cv = await readCv();
  if (!cv) return NextResponse.json({ error: "No CV uploaded" }, { status: 404 });

  return new NextResponse(new Uint8Array(cv.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${cv.meta.fileName || "cv.pdf"}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Attach a file under the `file` field" }, { status: 400 });
  }
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Only PDF files are supported" }, { status: 415 });
  }
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "PDF must be smaller than 8 MB" }, { status: 413 });
  }

  const meta = await saveCv(Buffer.from(await file.arrayBuffer()), file.name);
  await log({
    level: "SUCCESS",
    stage: STAGES.CV,
    message: `Master CV uploaded: ${meta.fileName} (${Math.round(meta.size / 1024)} KB). It will be attached to outgoing applications.`,
  });

  return NextResponse.json({ ok: true, cv: meta });
}

export async function DELETE() {
  await deleteCv();
  await log({ level: "WARN", stage: STAGES.CV, message: "Master CV PDF removed." });
  return NextResponse.json({ ok: true });
}
