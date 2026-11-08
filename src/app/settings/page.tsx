import { KeyRound, Settings2 } from "lucide-react";
import { Card, SectionHeading } from "@/components/ui";
import { SettingsForm } from "@/components/settings-form";
import { CvUploader } from "@/components/cv-uploader";
import { HealthCheck } from "@/components/health-check";
import { getSettings } from "@/lib/settings";
import { cvExists, readCv } from "@/lib/cv-store";

export const dynamic = "force-dynamic";

function mask(value?: string | null) {
  if (!value) return "not set";
  if (value.includes("@")) {
    const [name, domain] = value.split("@");
    return `${name.slice(0, 2)}${"•".repeat(Math.max(name.length - 2, 2))}@${domain}`;
  }
  return value.slice(0, 4) + "•".repeat(8);
}

export default async function SettingsPage() {
  const settings = await getSettings();
  const onDisk = await cvExists();
  const cv = onDisk ? await readCv() : null;

  const initial = {
    cvText: settings.cvText,
    signatureHtml: settings.signatureHtml,
    senderName: settings.senderName,
    defaultSubject: settings.defaultSubject,
    strictness: settings.strictness as "strict" | "balanced" | "lenient",
    aiModel: settings.aiModel,
    minMatchScore: settings.minMatchScore,
    flagDraft: settings.flagDraft,
    flagAutoSend: settings.flagAutoSend,
    flagFetchRecruiterEmail: settings.flagFetchRecruiterEmail,
    flagAutoGenerateEmail: settings.flagAutoGenerateEmail,
    attachCv: settings.attachCv,
  };

  const envRows = [
    { label: "SMTP user", value: mask(process.env.SMTP_USER) },
    {
      label: "SMTP host",
      value: `${process.env.SMTP_HOST ?? "not set"}:${process.env.SMTP_PORT ?? "?"}`,
    },
    { label: "OpenRouter key", value: mask(process.env.OPENROUTER_API_KEY) },
    {
      label: "Database",
      value: process.env.DATABASE_URL ? "connected via DATABASE_URL" : "not set",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="animate-rise">
        <h1 className="flex items-center gap-2 text-[22px] font-bold tracking-tight text-white">
          <span className="grid size-8 place-items-center rounded-[4px] border border-[#21483a] bg-[#132e23]">
            <Settings2 className="size-4 text-[#6ee7a8]" />
          </span>
          Configuration
        </h1>
        <p className="mt-1.5 max-w-2xl text-[13px] text-[#9898a2]">
          Mail flags, your single rich-text signature, the master CV and the AI model. Credentials
          stay in <code className="rounded-[2px] bg-[#23232a] px-1 py-0.5 text-[11px] text-[#b9aaff]">.env</code>.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <SettingsForm initial={initial} />

        <div className="space-y-4">
          <CvUploader initial={{ onDisk, meta: cv?.meta ?? undefined }} />
          <HealthCheck />

          <Card>
            <SectionHeading
              icon={<KeyRound className="size-4" />}
              title="Credentials (from .env)"
              hint="Read-only here — edit .env and restart the dev server."
              accent="sky"
            />
            <dl className="space-y-1.5 text-[11.5px]">
              {envRows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-3 rounded-[3px] border border-[#2a2a30] bg-[#131316] px-2.5 py-1.5"
                >
                  <dt className="font-semibold text-[#a8a8b3]">{row.label}</dt>
                  <dd className="truncate font-mono text-[10.5px] text-[#9898a2]">{row.value}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
