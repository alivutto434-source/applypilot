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
    id: settings.id,
    cvText: settings.cvText,
    signature: settings.signature,
    senderName: settings.senderName,
    defaultSubject: settings.defaultSubject,
    autoSend: settings.autoSend,
    bypassMatch: settings.bypassMatch,
    attachCv: settings.attachCv,
    strictness: settings.strictness as "strict" | "balanced" | "lenient",
    aiModel: settings.aiModel,
    minMatchScore: settings.minMatchScore,
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
    <div className="space-y-5">
      <div className="animate-rise">
        <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-white">
          <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500/25 to-teal-500/10 ring-1 ring-emerald-400/40">
            <Settings2 className="size-5 text-emerald-200" />
          </span>
          Configuration
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Your CV, signature and automation rules live in the database. Credentials stay in{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] text-violet-200">.env</code>{" "}
          and never touch the UI.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <SettingsForm initial={initial} />
        </div>

        <div className="space-y-5">
          <CvUploader initial={{ onDisk, meta: cv?.meta ?? undefined }} />
          <HealthCheck />

          <Card>
            <SectionHeading
              icon={<KeyRound className="size-5" />}
              title="Credentials (from .env)"
              hint="Read-only here — edit .env and restart the dev server."
              accent="sky"
            />
            <dl className="space-y-2 text-xs">
              {envRows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2"
                >
                  <dt className="font-semibold text-slate-300">{row.label}</dt>
                  <dd className="truncate font-mono text-[11px] text-slate-400">{row.value}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
