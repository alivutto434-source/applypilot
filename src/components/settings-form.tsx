"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Bot,
  FileSignature,
  Save,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button, Card, Field, SectionHeading, Toggle, inputClass } from "@/components/ui";

const schema = z.object({
  cvText: z.string(),
  signature: z.string(),
  senderName: z.string(),
  defaultSubject: z.string(),
  autoSend: z.boolean(),
  bypassMatch: z.boolean(),
  attachCv: z.boolean(),
  strictness: z.enum(["strict", "balanced", "lenient"]),
  aiModel: z.string().min(1, "Pick a model"),
  minMatchScore: z.coerce.number().int().min(0).max(100),
});

type Values = z.infer<typeof schema>;

const MODELS = [
  "openai/gpt-4o-mini",
  "openai/gpt-4.1-mini",
  "google/gemini-2.5-flash",
  "anthropic/claude-3.5-haiku",
  "deepseek/deepseek-chat",
  "meta-llama/llama-3.3-70b-instruct",
];

const SIGNATURE_PRESETS: Record<string, string> = {
  Professional: "Best regards,\n{{name}}\n{{email}}",
  Warm: "Thanks so much for your time,\n{{name}}\n{{email}}",
  Concise: "— {{name}} · {{email}}",
};

export function SettingsForm({
  initial,
}: {
  initial: Values & { id: string };
}) {
  const [saving, setSaving] = React.useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: initial,
  });

  const autoSend = watch("autoSend");
  const bypassMatch = watch("bypassMatch");
  const attachCv = watch("attachCv");
  const cvText = watch("cvText") ?? "";
  const signature = watch("signature") ?? "";

  const onSubmit = async (values: Values) => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save settings");
      toast.success("Settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = (preset: string) => {
    const template = SIGNATURE_PRESETS[preset];
    if (!template) return;
    const filled = template
      .replace("{{name}}", watch("senderName") || "Your Name")
      .replace("{{email}}", "you@gmail.com");
    setValue("signature", filled, { shouldDirty: true });
    toast.success(`${preset} signature applied`);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Card>
        <SectionHeading
          icon={<Sparkles className="size-5" />}
          title="Matching & sending rules"
          hint="Global defaults applied to every new application."
          accent="violet"
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Matching strictness"
            icon={<ShieldCheck className="size-3.5 text-emerald-300" />}
            hint="Strict = only near-perfect fits. Lenient = plausible fits pass."
          >
            <select {...register("strictness")} className={inputClass}>
              <option value="strict">Strict — near-perfect fit only</option>
              <option value="balanced">Balanced — recommended</option>
              <option value="lenient">Lenient — plausible fits pass</option>
            </select>
          </Field>

          <Field
            label="Minimum match score"
            hint="Anything below this is treated as a mismatch."
            error={errors.minMatchScore?.message}
          >
            <input
              type="number"
              min={0}
              max={100}
              {...register("minMatchScore")}
              className={inputClass}
            />
          </Field>

          <div className="md:col-span-2 grid gap-3 sm:grid-cols-2">
            <Toggle
              checked={autoSend}
              onChange={(v) => setValue("autoSend", v, { shouldDirty: true })}
              label="Send CV automatically"
              description="When ON, a matching job is emailed instantly. When OFF, drafts wait for your approval."
              accent="emerald"
            />
            <Toggle
              checked={bypassMatch}
              onChange={(v) => setValue("bypassMatch", v, { shouldDirty: true })}
              label="Send regardless of match"
              description="Bypass the match check and send every application anyway."
              accent="amber"
            />
            <Toggle
              checked={attachCv}
              onChange={(v) => setValue("attachCv", v, { shouldDirty: true })}
              label="Attach the CV PDF"
              description="Attach your uploaded master CV to every outgoing email."
              accent="sky"
            />
          </div>
        </div>
      </Card>

      <Card>
        <SectionHeading
          icon={<UserRound className="size-5" />}
          title="Your master CV (text)"
          hint="The AI matches jobs against this text — paste your full CV here."
          accent="sky"
          action={
            <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-300 ring-1 ring-white/10">
              {cvText.length.toLocaleString()} chars
            </span>
          }
        />
        <Field label="CV text" hint="Skills, experience, achievements. Plain text is perfect.">
          <textarea
            {...register("cvText")}
            rows={12}
            placeholder={"SAAD HUZAIFA\nFrontend Engineer · React, Next.js, TypeScript\n\nEXPERIENCE\n..."}
            className={inputClass + " resize-y font-mono text-[12px] leading-relaxed"}
          />
        </Field>
      </Card>

      <Card>
        <SectionHeading
          icon={<FileSignature className="size-5" />}
          title="Identity & signature"
          hint="Appended to the bottom of every email."
          accent="emerald"
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Your name" icon={<UserRound className="size-3.5 text-emerald-300" />}>
            <input {...register("senderName")} placeholder="Saad Huzaifa" className={inputClass} />
          </Field>
          <Field
            label="Default subject template"
            hint="Used if the AI does not return a subject. {{jobTitle}} and {{companyName}} are replaced."
          >
            <input {...register("defaultSubject")} className={inputClass} />
          </Field>
        </div>

        <div className="mt-4">
          <Field
            label="Signature"
            hint={`${signature.length} characters — leave blank for none`}
          >
            <textarea {...register("signature")} rows={4} className={inputClass + " resize-y"} />
          </Field>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Presets:
            </span>
            {Object.keys(SIGNATURE_PRESETS).map((preset) => (
              <Button
                key={preset}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => applyPreset(preset)}
              >
                {preset}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <SectionHeading
          icon={<Bot className="size-5" />}
          title="AI model"
          hint="Any OpenRouter model id works — cheaper models are weaker at nuanced matching."
          accent="rose"
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Model id" error={errors.aiModel?.message}>
            <input {...register("aiModel")} list="model-options" className={inputClass} />
            <datalist id="model-options">
              {MODELS.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </Field>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs leading-relaxed text-slate-400">
            <p className="font-semibold text-slate-200">Suggested</p>
            <p>
              <code className="text-violet-300">openai/gpt-4o-mini</code> is cheap and reliable for
              JSON output. Switch to <code className="text-violet-300">google/gemini-2.5-flash</code>{" "}
              for more speed.
            </p>
          </div>
        </div>
      </Card>

      <div className="sticky bottom-4 z-10 flex justify-end">
        <Button type="submit" loading={saving} className="shadow-2xl">
          <Save className="size-4" /> {saving ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </form>
  );
}
