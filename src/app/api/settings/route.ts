import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/settings";
import { settingsSchema } from "@/lib/validations";
import { cvExists } from "@/lib/cv-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json({ settings, cvOnDisk: await cvExists() });
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const settings = await updateSettings(parsed.data);
  return NextResponse.json({ settings });
}
