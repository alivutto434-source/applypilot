"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ExternalLink,
  FileText,
  Mail,
  PencilLine,
  RefreshCw,
  Save,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button, Card, Field, inputClass } from "@/components/ui";
import { ScoreBadge, StatusBadge } from "@/components/status-badge";
import { RichTextEditor } from "@/components/rich-text-editor";
import { cn, formatDate, hostname, truncate } from "@/lib/utils";

export type ApplicationRow = {
  id: string;
  createdAt: string;
  jobTitle: string | null;
  companyName: string | null;
  jobDescription: string;
  sourceUrl: string | null;
  recruiterEmail: string | null;
  recruiterSource: string | null;
  matchScore: number | null;
  isMatch: boolean | null;
  matchReasoning: string | null;
  status: string;
  emailSubject: string | null;
  emailBody: string | null;
  emailBodyHtml: string | null;
  emailSentAt: string | null;
  errorMessage: string | null;
  cvAttached: boolean;
  aiModel: string | null;
};

const FILTERS = [
  { key: "ALL", label: "All" },
  { key: "SENT", label: "Sent" },
  { key: "DRAFTED", label: "Drafts" },
  { key: "FAILED", label: "Failed" },
];

export function ApplicationList({
  compact = false,
  initialStatus = "ALL",
}: {
  compact?: boolean;
  initialStatus?: string;
}) {
  const router = useRouter();
  const [rows, setRows] = React.useState<ApplicationRow[]>([]);
  const [filter, setFilter] = React.useState(initialStatus);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const load = React.useCallback(
    async (status = filter) => {
      setLoading(true);
      try {
        const query = new URLSearchParams({
          take: compact ? "6" : "50",
          ...(status !== "ALL" ? { status } : {}),
        });
        const res = await fetch(`/api/applications?${query}`, { cache: "no-store" });
        const data = await res.json();
        setRows(data.applications ?? []);
      } finally {
        setLoading(false);
      }
    },
    [compact, filter]
  );

  React.useEffect(() => {
    void load(filter);
  }, [filter, load]);

  React.useEffect(() => {
    const handler = () => void load(filter);
    window.addEventListener("applypilot:refresh", handler);
    return () => window.removeEventListener("applypilot:refresh", handler);
  }, [filter, load]);

  const send = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/applications/${id}/send`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Send failed");
      toast.success("Email sent");
      await load(filter);
      window.dispatchEvent(new Event("applypilot:refresh"));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Send failed");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: string) => {
    setBusyId(id);
    try {
      await fetch(`/api/applications/${id}`, { method: "DELETE" });
      toast.success("Application deleted");
      await load(filter);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-2.5">
      {!compact ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((option) => (
            <button
              key={option.key}
              onClick={() => setFilter(option.key)}
              className={cn(
                "focus-ring rounded-[3px] border px-2.5 py-1 text-[11.5px] font-semibold transition",
                filter === option.key
                  ? "border-[#7c6cf5] bg-[#7c6cf5] text-white"
                  : "border-[#2a2a30] bg-[#131316] text-[#a8a8b3] hover:text-white"
              )}
            >
              {option.label}
            </button>
          ))}
          <Button variant="ghost" size="sm" onClick={() => void load(filter)} className="ml-auto">
            <RefreshCw className="size-3.5" /> Refresh
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((index) => (
            <div key={index} className="skeleton h-20 rounded-[6px]" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card className="py-9 text-center">
          <p className="text-[13px] font-semibold text-[#c9c9d1]">No applications here yet</p>
          <p className="mt-1 text-[11.5px] text-[#6b6b76]">
            Every job you paste is archived with its full description and source URL.
          </p>
        </Card>
      ) : (
        rows.map((row) => {
          const expanded = open === row.id;
          const isEditing = editing === row.id;
          const canSend =
            row.status !== "SENT" && Boolean(row.recruiterEmail) && Boolean(row.emailSubject);

          return (
            <Card key={row.id} className="p-0">
              <div className="flex flex-wrap items-start gap-2.5 p-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={row.status} />
                    <ScoreBadge score={row.matchScore} isMatch={row.isMatch} />
                    {row.cvAttached ? (
                      <span className="inline-flex items-center gap-1 rounded-[3px] border border-[#2a2a30] bg-[#1b1b1f] px-1.5 py-[2px] text-[10px] font-bold uppercase tracking-[0.04em] text-[#a8a8b3]">
                        <FileText className="size-2.5" /> cv
                      </span>
                    ) : null}
                    <span className="text-[10.5px] text-[#6b6b76]">{formatDate(row.createdAt)}</span>
                  </div>

                  <h3 className="mt-1.5 truncate text-[13.5px] font-semibold text-white">
                    {row.jobTitle || "Untitled role"}
                    {row.companyName ? (
                      <span className="font-normal text-[#9898a2]"> · {row.companyName}</span>
                    ) : null}
                  </h3>

                  <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-relaxed text-[#8c8c96]">
                    {truncate(row.jobDescription.replace(/\s+/g, " "), 180)}
                  </p>

                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px]">
                    {row.recruiterEmail ? (
                      <span className="inline-flex items-center gap-1 text-[#f2c15c]">
                        <Mail className="size-3" /> {row.recruiterEmail}
                      </span>
                    ) : (
                      <span className="text-[#6b6b76]">no recruiter email</span>
                    )}
                    {row.sourceUrl ? (
                      <a
                        href={row.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[#8ec5ff] hover:underline"
                      >
                        <ExternalLink className="size-3" /> {hostname(row.sourceUrl) ?? "source"}
                      </a>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {canSend ? (
                    <Button
                      size="sm"
                      variant="success"
                      loading={busyId === row.id}
                      onClick={() => void send(row.id)}
                    >
                      <Send className="size-3" /> Send
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Edit the email (rich text)"
                    onClick={() => {
                      setOpen(row.id);
                      setEditing(isEditing ? null : row.id);
                    }}
                  >
                    <PencilLine className="size-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setOpen(expanded ? null : row.id)}
                    aria-label="Toggle details"
                  >
                    <ChevronDown
                      className={cn("size-3.5 transition-transform", expanded && "rotate-180")}
                    />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void remove(row.id)}
                    aria-label="Delete application"
                  >
                    <Trash2 className="size-3.5 text-[#ff9aa8]" />
                  </Button>
                </div>
              </div>

              {expanded ? (
                <div className="animate-rise space-y-3 border-t border-[#2a2a30] bg-[#0f0f12] p-3.5 text-[11.5px]">
                  {isEditing ? (
                    <DraftEditor
                      row={row}
                      onCancel={() => setEditing(null)}
                      onSaved={async () => {
                        setEditing(null);
                        await load(filter);
                        window.dispatchEvent(new Event("applypilot:refresh"));
                        router.refresh();
                      }}
                    />
                  ) : (
                    <>
                      {row.matchReasoning ? (
                        <div>
                          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.06em] text-[#b9aaff]">
                            AI reasoning
                          </p>
                          <p className="leading-relaxed text-[#c9c9d1]">{row.matchReasoning}</p>
                        </div>
                      ) : null}

                      {row.emailSubject ? (
                        <div>
                          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.06em] text-[#8ec5ff]">
                            Email
                          </p>
                          <p className="font-semibold text-white">{row.emailSubject}</p>
                          <div className="mt-1.5 rounded-[3px] border border-[#2a2a30] bg-[#131316] px-2.5 py-2">
                            {row.emailBodyHtml ? (
                              <div
                                className="email-preview"
                                dangerouslySetInnerHTML={{ __html: row.emailBodyHtml }}
                              />
                            ) : (
                              <p className="email-preview whitespace-pre-wrap">{row.emailBody}</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-[#8c8c96]">
                          No email yet — press the pencil to write one, or turn on
                          “auto-generate email”.
                        </p>
                      )}
                    </>
                  )}

                  {row.errorMessage ? (
                    <p className="rounded-[3px] border border-[#4d2730] bg-[#331a1f] px-2.5 py-2 text-[#ffd4da]">
                      {row.errorMessage}
                    </p>
                  ) : null}

                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.06em] text-[#8c8c96]">
                      Saved job description
                    </p>
                    <pre className="max-h-52 overflow-y-auto whitespace-pre-wrap rounded-[3px] border border-[#2a2a30] bg-[#0a0a0c] p-2.5 font-mono text-[10.5px] leading-relaxed text-[#a8a8b3]">
                      {row.jobDescription}
                    </pre>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] text-[#6b6b76]">
                    <span>id: {row.id}</span>
                    {row.aiModel ? <span>model: {row.aiModel}</span> : null}
                    {row.recruiterSource ? <span>email from: {row.recruiterSource}</span> : null}
                    {row.emailSentAt ? <span>sent: {formatDate(row.emailSentAt)}</span> : null}
                  </div>
                </div>
              ) : null}
            </Card>
          );
        })
      )}
    </div>
  );
}

function DraftEditor({
  row,
  onSaved,
  onCancel,
}: {
  row: ApplicationRow;
  onSaved: () => Promise<void> | void;
  onCancel: () => void;
}) {
  const [subject, setSubject] = React.useState(row.emailSubject ?? "");
  const [recruiter, setRecruiter] = React.useState(row.recruiterEmail ?? "");
  const [bodyHtml, setBodyHtml] = React.useState(row.emailBodyHtml ?? "");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setSubject(row.emailSubject ?? "");
    setRecruiter(row.recruiterEmail ?? "");
    setBodyHtml(row.emailBodyHtml ?? "");
  }, [row.id, row.emailSubject, row.recruiterEmail, row.emailBodyHtml]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/applications/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailSubject: subject,
          emailBodyHtml: bodyHtml,
          recruiterEmail: recruiter,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const detail = data?.issues?.recruiterEmail?.[0] || data.error || "Could not save";
        throw new Error(detail);
      }
      toast.success("Draft updated");
      await onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="grid gap-2.5 sm:grid-cols-2">
        <Field label="Subject">
          <input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className={inputClass}
            placeholder="Application for Frontend Engineer"
          />
        </Field>
        <Field label="Recruiter email">
          <input
            value={recruiter}
            onChange={(event) => setRecruiter(event.target.value)}
            className={inputClass}
            placeholder="hiring@company.com"
          />
        </Field>
      </div>

      <div>
        <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#a8a8b3]">
          Body (rich text)
        </span>
        <RichTextEditor
          value={bodyHtml}
          onChange={setBodyHtml}
          ariaLabel="Email body editor"
          minHeight="11rem"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" onClick={save} loading={saving}>
          <Save className="size-3" /> Save draft
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          <X className="size-3" /> Cancel
        </Button>
      </div>
    </div>
  );
}
