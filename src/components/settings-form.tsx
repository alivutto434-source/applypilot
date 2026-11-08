"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Bot,
  FileSignature,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button, Card, Field, SectionHeading, Toggle, inputClass } from "@/components/ui";
import { RichTextEditor } from "@/components/rich-text-editor";
import { FLAG_META, useMailFlags, type MailFlags } from "@/lib/mail-flags";

const schema = z.object({
  cvText: z.string(),
  signatureHtml: z.string(),
  senderName: z.string(),
  defaultSubject: z.string(),
  strictness: z.enum(["strict", "balanced", "lenient"]),
  aiModel: z.string().min(1, "Pick a model"),
  minMatchScore: z.coerce.number().int().min(0).max(100),
});

type Values = z.infer<typeof schema>;

export type SettingsFormInitial = Values & MailFlags;

const MODELS = [
  "openai/gpt-4o-mini",
  "openai/gpt-4.1-mini",
  "google/gemini-2.5-flash",
  "anthropic/claude-3.5-haiku",
  "deepseek/deepseek-chat",
  "meta-llama/llama-3.3-70b-instruct",
];

export function SettingsForm({ initial }: { initial: SettingsFormInitial }) {
  const [saving, setSaving] = React.useState(false);
  const { flags, setFlag, syncing } = useMailFlags({
    flagDraft: initial.flagDraft,
    flagAutoSend: initial.flagAutoSend,
    flagFetchRecruiterEmail: initial.flagFetchRecruiterEmail,
    flagAutoGenerateEmail: initial.flagAutoGenerateEmail,
    attachCv: initial.attachCv,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      cvText: initial.cvText,
      signatureHtml: initial.signatureHtml,
      senderName: initial.senderName,
      defaultSubject: initial.defaultSubject,
      strictness: initial.strictness,
      aiModel: initial.aiModel,
      minMatchScore: initial.minMatchScore,
    },
  });

  const cvText = watch("cvText") ?? "";
  const signatureHtml = watch("signatureHtml") ?? "";

  const onSubmit = async (values: Values) => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, ...flags }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save settings");
      toast.success("Settings saved");
      window.dispatchEvent(new Event("applypilot:refresh"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* ---------------------------------------------------------- mail flags */}
      <Card>
        <SectionHeading
          icon={<Send className="size-4" />}
          title="Mail sending"
          hint="These five switches decide what happens after the AI runs. Saved in localStorage and on the server."
          accent="emerald"
          action={
            <span
              className={`rounded-[3px] border px-2 py-0.5 text-[10.5px] font-semibold ${
                syncing
                  ? "border-[#4d3a1a] bg-[#332612] text-[#f2c15c]"
                  : "border-[#21483a] bg-[#132e23] text-[#6ee7a8]"
              }`}
            >
              {syncing ? "syncing…" : "in sync"}
            </span>
          }
        />

        <div className="grid gap-2 sm:grid-cols-2">
          {FLAG_META.map((flag) => (
            <Toggle
              key={flag.key}
              checked={flags[flag.key]}
              onChange={(value) => setFlag(flag.key, value)}
              label={flag.label}
              description={flag.description}
              accent={flag.accent}
            />
          ))}
        </div>

        <p className="mt-3 rounded-[4px] border border-[#2a2a30] bg-[#131316] px-3 py-2 text-[11.5px] leading-relaxed text-[#8c8c96]">
          <strong className="text-[#dcdce2]">No automatic skipping.</strong> A low match score is
          only logged — whether an application is saved or sent is decided purely by these flags.
        </p>
      </Card>

      {/* ----------------------------------------------------------- signature */}
      <Card>
        <SectionHeading
          icon={<FileSignature className="size-4" />}
          title="Signature (one, rich text)"
          hint="Bold, italic, underline, hyperlinks and lists — appended to every email, Gmail style."
          accent="violet"
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Your name" icon={<UserRound className="size-3.5 text-[#b9aaff]" />}>
            <input {...register("senderName")} placeholder="Saad Huzaifa" className={inputClass} />
          </Field>
          <Field
            label="Default subject template"
            hint="{{jobTitle}} and {{companyName}} are replaced automatically."
          >
            <input {...register("defaultSubject")} className={inputClass} />
          </Field>
        </div>

        <div className="mt-3">
          <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.06em] text-[#a8a8b3]">
            Signature
          </span>
          <RichTextEditor
            value={signatureHtml}
            onChange={(html) => setValue("signatureHtml", html, { shouldDirty: true })}
            ariaLabel="Signature editor"
            minHeight="7rem"
          />
          <p className="mt-1.5 text-[11.5px] text-[#77777f]">
            Select text and use the link button (🔗) to add a hyperlink — exactly like Gmail.
          </p>
        </div>
      </Card>

      {/* ------------------------------------------------------------- CV text */}
      <Card>
        <SectionHeading
          icon={<Sparkles className="size-4" />}
          title="Master CV (text)"
          hint="The AI matches jobs against this text — plain text is perfect."
          accent="sky"
          action={
            <span className="rounded-[3px] border border-[#2a2a30] bg-[#131316] px-2 py-0.5 text-[10.5px] font-semibold text-[#a8a8b3]">
              {cvText.length.toLocaleString()} chars
            </span>
          }
        />
        <Field label="CV text">
          <textarea
            {...register("cvText")}
            rows={10}
            placeholder={"SAAD HUZAIFA\nFrontend Engineer · React, Next.js, TypeScript\n\nEXPERIENCE\n..."}
            className={inputClass + " resize-y font-mono text-[12px] leading-relaxed"}
          />
        </Field>
      </Card>

      {/* --------------------------------------------------------------- model */}
      <Card>
        <SectionHeading
          icon={<Bot className="size-4" />}
          title="Matching & AI model"
          hint="Any OpenRouter model id works — cheaper models are weaker at nuanced matching."
          accent="rose"
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Strictness" icon={<ShieldCheck className="size-3.5 text-[#6ee7a8]" />}>
            <select {...register("strictness")} className={inputClass}>
              <option value="strict">Strict</option>
              <option value="balanced">Balanced</option>
              <option value="lenient">Lenient</option>
            </select>
          </Field>
          <Field
            label="Min score"
            hint="Guidance for the model."
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
          <Field label="Model id" error={errors.aiModel?.message}>
            <input {...register("aiModel")} list="model-options" className={inputClass} />
            <datalist id="model-options">
              {MODELS.map((model) => (
                <option key={model} value={model} />
              ))}
            </datalist>
          </Field>
        </div>
      </Card>

      <div className="sticky bottom-3 z-10 flex justify-end">
        <Button type="submit" loading={saving}>
          <Save className="size-3.5" /> {saving ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </form>
  );
}
