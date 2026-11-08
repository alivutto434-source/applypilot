"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Building2,
  Briefcase,
  ClipboardPaste,
  Link2,
  Mail,
  Send,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { Button, Card, Field, SectionHeading, Toggle, inputClass } from "@/components/ui";
import { StatusBadge, ScoreBadge } from "@/components/status-badge";

const formSchema = z.object({
  jobDescription: z.string().trim().min(80, "Paste the full job description (80+ characters)."),
  sourceUrl: z
    .string()
    .trim()
    .refine((v) => !v || /^https?:\/\/.+\..+/.test(v), "Must start with http:// or https://"),
  recruiterEmail: z
    .string()
    .trim()
    .refine((v) => !v || /^\S+@\S+\.\S+$/.test(v), "Enter a valid email or leave it blank"),
  companyName: z.string().trim(),
  jobTitle: z.string().trim(),
  bypassMatch: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

type Application = {
  id: string;
  status: string;
  jobTitle: string | null;
  companyName: string | null;
  recruiterEmail: string | null;
  matchScore: number | null;
  isMatch: boolean | null;
  matchReasoning: string | null;
  emailSubject: string | null;
  emailBody: string | null;
  errorMessage: string | null;
};

export function JobForm() {
  const router = useRouter();
  const [result, setResult] = React.useState<Application | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [sending, setSending] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      jobDescription: "",
      sourceUrl: "",
      recruiterEmail: "",
      companyName: "",
      jobTitle: "",
      bypassMatch: false,
    },
  });

  const description = watch("jobDescription") ?? "";
  const bypassMatch = watch("bypassMatch");

  const bump = () => window.dispatchEvent(new Event("applypilot:refresh"));

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();

      if (!res.ok) {
        const detail =
          data?.issues?.jobDescription?.[0] || data?.issues?.sourceUrl?.[0] || data?.error;
        throw new Error(detail || "Request failed");
      }

      const app = data.application as Application;
      setResult(app);

      if (app.status === "SENT") {
        toast.success("Application sent with your CV attached 🚀");
      } else if (app.status === "SKIPPED_MISMATCH") {
        toast.warning("Skipped — the description did not match your profile");
      } else if (app.status === "FAILED") {
        toast.error(app.errorMessage || "The pipeline failed");
      } else {
        toast.success("Draft ready — review it and hit Send");
      }

      reset({ ...values, jobDescription: "" });
      bump();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const sendNow = async () => {
    if (!result) return;
    setSending(true);
    try {
      const res = await fetch(`/api/applications/${result.id}/send`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Send failed");
      setResult(data.application);
      toast.success("Email dispatched");
      bump();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Send failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <SectionHeading
        icon={<Wand2 className="size-5" />}
        title="New application"
        hint="Paste the job description — the AI scores the fit, drafts the email and (optionally) sends it."
        accent="violet"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field
          label="Job description"
          required
          icon={<ClipboardPaste className="size-3.5 text-violet-300" />}
          error={errors.jobDescription?.message}
          hint={`${description.length.toLocaleString()} characters · paste the whole posting, requirements included`}
        >
          <textarea
            {...register("jobDescription")}
            rows={9}
            placeholder={`Paste the job posting here...\n\nWe are looking for a Frontend Engineer with 3+ years of React experience...`}
            className={inputClass + " resize-y leading-relaxed"}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Job title"
            icon={<Briefcase className="size-3.5 text-sky-300" />}
            error={errors.jobTitle?.message}
            hint="Optional — helps the AI write a better subject"
          >
            <input {...register("jobTitle")} placeholder="Senior Frontend Engineer" className={inputClass} />
          </Field>

          <Field
            label="Company"
            icon={<Building2 className="size-3.5 text-emerald-300" />}
            error={errors.companyName?.message}
            hint="Optional"
          >
            <input {...register("companyName")} placeholder="Acme Labs" className={inputClass} />
          </Field>

          <Field
            label="Recruiter email"
            icon={<Mail className="size-3.5 text-amber-300" />}
            error={errors.recruiterEmail?.message}
            hint="Required to actually send — leave blank to only draft"
          >
            <input
              {...register("recruiterEmail")}
              type="email"
              placeholder="hiring@acme.com"
              className={inputClass}
            />
          </Field>

          <Field
            label="Job source URL"
            icon={<Link2 className="size-3.5 text-violet-300" />}
            error={errors.sourceUrl?.message}
            hint="Optional — stored with the application for your history"
          >
            <input
              {...register("sourceUrl")}
              type="url"
              placeholder="https://linkedin.com/jobs/view/12345"
              className={inputClass}
            />
          </Field>
        </div>

        <Toggle
          checked={Boolean(bypassMatch)}
          onChange={(v) => setValue("bypassMatch", v)}
          label="Send regardless of match (just this one)"
          description="Overrides the global setting: draft and send even if the AI says this job is a mismatch."
          accent="amber"
        />

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button type="submit" loading={submitting} className="min-w-44">
            <Sparkles className="size-4" />
            {submitting ? "Running pipeline…" : "Analyse & apply"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              reset();
              setResult(null);
            }}
          >
            <Trash2 className="size-4" /> Clear
          </Button>
          {submitting ? (
            <span className="text-xs text-violet-300">
              Matching → drafting → sending. Follow along in the live feed →
            </span>
          ) : null}
        </div>
      </form>

      {result ? <ResultCard application={result} onSend={sendNow} sending={sending} /> : null}
    </Card>
  );
}

function ResultCard({
  application,
  onSend,
  sending,
}: {
  application: Application;
  onSend: () => void;
  sending: boolean;
}) {
  const [copied, setCopied] = React.useState(false);

  const copy = async () => {
    const text = `Subject: ${application.emailSubject ?? ""}\n\n${application.emailBody ?? ""}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="animate-rise mt-5 rounded-2xl border border-violet-400/25 bg-gradient-to-br from-violet-500/10 via-indigo-500/5 to-transparent p-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={application.status} />
        <ScoreBadge score={application.matchScore} isMatch={application.isMatch} />
        {application.companyName ? (
          <span className="text-xs font-medium text-slate-300">{application.companyName}</span>
        ) : null}
      </div>

      {application.matchReasoning ? (
        <p className="mt-3 text-sm leading-relaxed text-slate-300">{application.matchReasoning}</p>
      ) : null}

      {application.errorMessage ? (
        <p className="mt-3 rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-200 ring-1 ring-rose-400/30">
          {application.errorMessage}
        </p>
      ) : null}

      {application.emailSubject ? (
        <div className="mt-4 space-y-2">
          <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Subject</p>
            <p className="text-sm font-medium text-white">{application.emailSubject}</p>
          </div>
          <div className="max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-slate-950/50 p-3">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Body</p>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-200">
              {application.emailBody}
            </pre>
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {application.emailSubject ? (
          <Button variant="outline" size="sm" onClick={copy}>
            {copied ? "Copied!" : "Copy email"}
          </Button>
        ) : null}
        {application.status === "DRAFTED" && application.recruiterEmail ? (
          <Button variant="success" size="sm" onClick={onSend} loading={sending}>
            <Send className="size-3.5" /> Send now
          </Button>
        ) : null}
      </div>
    </div>
  );
}
