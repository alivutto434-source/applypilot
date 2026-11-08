"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ExternalLink,
  Mail,
  RefreshCw,
  Send,
  Trash2,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { Button, Card } from "@/components/ui";
import { ScoreBadge, StatusBadge } from "@/components/status-badge";
import { cn, formatDate, hostname, truncate } from "@/lib/utils";

export type ApplicationRow = {
  id: string;
  createdAt: string;
  jobTitle: string | null;
  companyName: string | null;
  jobDescription: string;
  sourceUrl: string | null;
  recruiterEmail: string | null;
  matchScore: number | null;
  isMatch: boolean | null;
  matchReasoning: string | null;
  status: string;
  emailSubject: string | null;
  emailBody: string | null;
  emailSentAt: string | null;
  errorMessage: string | null;
  cvAttached: boolean;
  aiModel: string | null;
};

const FILTERS = [
  { key: "ALL", label: "All" },
  { key: "SENT", label: "Sent" },
  { key: "DRAFTED", label: "Drafted" },
  { key: "SKIPPED_MISMATCH", label: "Skipped" },
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
    <div className="space-y-3">
      {!compact ? (
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "focus-ring rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
                filter === f.key
                  ? "bg-gradient-to-r from-violet-600 to-indigo-500 text-white shadow-lg shadow-violet-900/30"
                  : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
              )}
            >
              {f.label}
            </button>
          ))}
          <Button variant="ghost" size="sm" onClick={() => void load(filter)} className="ml-auto">
            <RefreshCw className="size-3.5" /> Refresh
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-2xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card className="py-10 text-center">
          <p className="text-sm font-semibold text-slate-300">No applications here yet</p>
          <p className="mt-1 text-xs text-slate-500">
            Every job you paste is archived with its full description and source URL.
          </p>
        </Card>
      ) : (
        rows.map((row) => {
          const expanded = open === row.id;
          return (
            <Card key={row.id} className="p-0">
              <div className="flex flex-wrap items-start gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={row.status} />
                    <ScoreBadge score={row.matchScore} isMatch={row.isMatch} />
                    {row.cvAttached ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-slate-300 ring-1 ring-white/10">
                        <FileText className="size-2.5" /> CV attached
                      </span>
                    ) : null}
                    <span className="text-[11px] text-slate-500">{formatDate(row.createdAt)}</span>
                  </div>

                  <h3 className="mt-1.5 truncate text-sm font-semibold text-white">
                    {row.jobTitle || "Untitled role"}
                    {row.companyName ? (
                      <span className="font-normal text-slate-400"> · {row.companyName}</span>
                    ) : null}
                  </h3>

                  <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-400">
                    {truncate(row.jobDescription.replace(/\s+/g, " "), 180)}
                  </p>

                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px]">
                    {row.recruiterEmail ? (
                      <span className="inline-flex items-center gap-1 text-amber-300/90">
                        <Mail className="size-3" /> {row.recruiterEmail}
                      </span>
                    ) : (
                      <span className="text-slate-500">no recruiter email</span>
                    )}
                    {row.sourceUrl ? (
                      <a
                        href={row.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sky-300 hover:text-sky-200 hover:underline"
                      >
                        <ExternalLink className="size-3" /> {hostname(row.sourceUrl) ?? "source"}
                      </a>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {row.status === "DRAFTED" && row.recruiterEmail ? (
                    <Button
                      size="sm"
                      variant="success"
                      loading={busyId === row.id}
                      onClick={() => void send(row.id)}
                    >
                      <Send className="size-3.5" /> Send
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setOpen(expanded ? null : row.id)}
                    aria-label="Toggle details"
                  >
                    <ChevronDown
                      className={cn("size-4 transition-transform", expanded && "rotate-180")}
                    />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void remove(row.id)}
                    aria-label="Delete application"
                  >
                    <Trash2 className="size-4 text-rose-300/80" />
                  </Button>
                </div>
              </div>

              {expanded ? (
                <div className="animate-rise space-y-3 border-t border-white/10 bg-slate-950/40 p-4 text-xs">
                  {row.matchReasoning ? (
                    <div>
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-violet-300">
                        AI reasoning
                      </p>
                      <p className="leading-relaxed text-slate-300">{row.matchReasoning}</p>
                    </div>
                  ) : null}

                  {row.emailSubject ? (
                    <div>
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-sky-300">
                        Drafted email
                      </p>
                      <p className="font-semibold text-white">{row.emailSubject}</p>
                      <pre className="mt-1 whitespace-pre-wrap font-sans leading-relaxed text-slate-300">
                        {row.emailBody}
                      </pre>
                    </div>
                  ) : null}

                  {row.errorMessage ? (
                    <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-rose-200 ring-1 ring-rose-400/30">
                      {row.errorMessage}
                    </p>
                  ) : null}

                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Saved job description
                    </p>
                    <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-black/30 p-3 font-mono text-[11px] leading-relaxed text-slate-300">
                      {row.jobDescription}
                    </pre>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                    <span>id: {row.id}</span>
                    {row.aiModel ? <span>model: {row.aiModel}</span> : null}
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
