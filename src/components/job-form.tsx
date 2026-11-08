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
import { Button, Card, Field, SectionHeading, inputClass } from "@/components/ui";
import { StatusBadge, ScoreBadge } from "@/components/status-badge";

const formSchema = z.object({
  jobDescription: z.string().trim().min(80, "Paste the full job description (80+ characters)."),
  sourceUrl: z
    .string()
    .trim()
    .refine((value) => !value || /^https?:\/\/.+\..+/.test(value), "Must start with http:// or https://"),
  recruiterEmail: z
    .string()
    .trim()
    .refine((value) => !value || /^\S+@\S+\.\S+$/.test(value), "Enter a valid email or leave it blank"),
  companyName: z.string().trim(),
  jobTitle: z.string().trim(),
});

type FormValues = z.infer<typeof formSchema>;

type Application = {
  id: string;
  status: string;
  jobTitle: string | null;
  companyName: string | null;
  recruiterEmail: string | null;
  recruiterSource: string | null;
  matchScore: number | null;
  isMatch: boolean | null;
  matchReasoning: string | null;
  emailSubject: string | null;
  emailBody: string | null;
  emailBodyHtml: string | null;
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
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      jobDescription: "",
      sourceUrl: "",
      recruiterEmail: "",
      companyName: "",
      jobTitle: "",
    },
  });

  const description = watch("jobDescription") ?? "";
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

      const application = data.application as Application;
      setResult(application);

      if (application.status === "SENT") {
        toast.success("Application sent with your CV and signature");
      } else if (application.status === "FAILED") {
        toast.error(application.errorMessage || "The pipeline failed");
      } else {
        toast.success("Saved as a draft — review it in the history");
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
        icon={<Wand2 className="size-4" />}
        title="New application"
        hint="Paste the job description — the AI scores the fit and drafts the email. Your mail flags decide draft vs. send."
        accent="violet"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
        <Field
          label="Job description"
          required
          icon={<ClipboardPaste className="size-3.5 text-[#b9aaff]" />}
          error={errors.jobDescription?.message}
          hint={`${description.length.toLocaleString()} characters · paste the whole posting`}
        >
          <textarea
            {...register("jobDescription")}
            rows={9}
            placeholder={"Paste the job posting here...\n\nWe are looking for a Frontend Engineer with 3+ years of React experience..."}
            className={inputClass + " resize-y leading-relaxed"}
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Job title" icon={<Briefcase className="size-3.5 text-[#8ec5ff]" />}>
            <input {...register("jobTitle")} placeholder="Senior Frontend Engineer" className={inputClass} />
          </Field>

          <Field label="Company" icon={<Building2 className="size-3.5 text-[#6ee7a8]" />}>
            <input {...register("companyName")} placeholder="Acme Labs" className={inputClass} />
          </Field>

          <Field
            label="Recruiter email"
            icon={<Mail className="size-3.5 text-[#f2c15c]" />}
            error={errors.recruiterEmail?.message}
            hint="Leave blank to let the “fetch recruiter email” flag find it"
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
            icon={<Link2 className="size-3.5 text-[#b9aaff]" />}
            error={errors.sourceUrl?.message}
            hint="Saved with the application · used for email discovery"
          >
            <input
              {...register("sourceUrl")}
              type="url"
              placeholder="https://linkedin.com/jobs/view/12345"
              className={inputClass}
            />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" loading={submitting} className="min-w-40">
            <Sparkles className="size-3.5" />
            {submitting ? "Running pipeline…" : "Analyse & save"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              reset();
              setResult(null);
            }}
          >
            <Trash2 className="size-3.5" /> Clear
          </Button>
          <span className="text-[11px] text-[#77777f]">
            Follow every step in the live activity feed →
          </span>
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
    <div className="animate-rise mt-4 rounded-[4px] border border-[#2a2a30] bg-[#131316] p-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={application.status} />
        <ScoreBadge score={application.matchScore} isMatch={application.isMatch} />
        {application.companyName ? (
          <span className="text-[11.5px] font-medium text-[#c9c9d1]">{application.companyName}</span>
        ) : null}
        {application.recruiterEmail ? (
          <span className="text-[11.5px] text-[#8ec5ff]">
            {application.recruiterEmail}
            {application.recruiterSource ? ` · ${application.recruiterSource}` : ""}
          </span>
        ) : null}
      </div>

      {application.matchReasoning ? (
        <p className="mt-2.5 text-[12.5px] leading-relaxed text-[#b9b9c2]">
          {application.matchReasoning}
        </p>
      ) : null}

      {application.errorMessage ? (
        <p className="mt-2.5 rounded-[3px] border border-[#4d2730] bg-[#331a1f] px-2.5 py-2 text-[11.5px] text-[#ffd4da]">
          {application.errorMessage}
        </p>
      ) : null}

      {application.emailSubject ? (
        <div className="mt-3 space-y-2">
          <div className="rounded-[3px] border border-[#2a2a30] bg-[#0f0f12] px-2.5 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#6b6b76]">Subject</p>
            <p className="text-[12.5px] font-semibold text-white">{application.emailSubject}</p>
          </div>
          <div className="max-h-56 overflow-y-auto rounded-[3px] border border-[#2a2a30] bg-[#0f0f12] px-2.5 py-2">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.06em] text-[#6b6b76]">
              Body
            </p>
            {application.emailBodyHtml ? (
              <div
                className="email-preview"
                dangerouslySetInnerHTML={{ __html: application.emailBodyHtml }}
              />
            ) : (
              <p className="email-preview whitespace-pre-wrap">{application.emailBody}</p>
            )}
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {application.emailSubject ? (
          <Button variant="outline" size="sm" onClick={copy}>
            {copied ? "Copied!" : "Copy email"}
          </Button>
        ) : null}
        {application.status === "DRAFTED" && application.recruiterEmail && application.emailSubject ? (
          <Button variant="success" size="sm" onClick={onSend} loading={sending}>
            <Send className="size-3.5" /> Send now
          </Button>
        ) : null}
      </div>
    </div>
  );
}
