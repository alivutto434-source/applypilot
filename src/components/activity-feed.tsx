"use client";

import * as React from "react";
import { Activity, Pause, Play, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import { cn, timeAgo } from "@/lib/utils";

type LogRow = {
  id: string;
  createdAt: string;
  level: "INFO" | "AI" | "EMAIL" | "SUCCESS" | "WARN" | "ERROR";
  stage: string;
  message: string;
  applicationId: string | null;
};

const LEVEL_STYLE: Record<LogRow["level"], { chip: string; text: string; label: string }> = {
  INFO: { chip: "bg-sky-500/15 text-sky-300 ring-sky-400/30", text: "text-slate-200", label: "info" },
  AI: { chip: "bg-violet-500/15 text-violet-300 ring-violet-400/30", text: "text-violet-100", label: "ai" },
  EMAIL: { chip: "bg-blue-500/15 text-blue-300 ring-blue-400/30", text: "text-blue-100", label: "email" },
  SUCCESS: { chip: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30", text: "text-emerald-100", label: "ok" },
  WARN: { chip: "bg-amber-500/15 text-amber-300 ring-amber-400/30", text: "text-amber-100", label: "warn" },
  ERROR: { chip: "bg-rose-500/15 text-rose-300 ring-rose-400/30", text: "text-rose-100", label: "error" },
};

export function ActivityFeed({ className }: { className?: string }) {
  const [logs, setLogs] = React.useState<LogRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [live, setLive] = React.useState(true);
  const [seenIds, setSeenIds] = React.useState<Set<string>>(new Set());

  const load = React.useCallback(async (markNew = false) => {
    try {
      const res = await fetch("/api/logs?take=60", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { logs: LogRow[] };
      setLogs(data.logs);
      if (markNew) setSeenIds(new Set(data.logs.map((l) => l.id)));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load(true);
  }, [load]);

  React.useEffect(() => {
    if (!live) return;
    const timer = setInterval(() => void load(), 3000);
    const handler = () => void load();
    window.addEventListener("applypilot:refresh", handler);
    return () => {
      clearInterval(timer);
      window.removeEventListener("applypilot:refresh", handler);
    };
  }, [live, load]);

  const clear = async () => {
    await fetch("/api/logs", { method: "DELETE" });
    setLogs([]);
    toast.success("Activity feed cleared");
  };

  return (
    <section className={cn("glass flex flex-col overflow-hidden", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-white/[0.03] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="relative grid size-8 place-items-center rounded-lg bg-emerald-500/15 ring-1 ring-emerald-400/30">
            <Activity className="size-4 text-emerald-300" />
            <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-emerald-400 animate-pulse-ring" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-white">Live activity</h2>
            <p className="text-[11px] text-slate-400">
              {live ? "Streaming every pipeline step · refreshes every 3s" : "Paused"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setLive((v) => !v)} title="Pause/resume polling">
            {live ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void load()} title="Refresh now">
            <RefreshCw className="size-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={clear} title="Clear feed">
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="max-h-[520px] min-h-[220px] flex-1 space-y-1.5 overflow-y-auto p-3 font-mono text-[12px]">
        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton h-9 rounded-lg" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="grid h-full place-items-center px-6 py-12 text-center">
            <div>
              <p className="text-sm font-semibold text-slate-300">Nothing has happened yet</p>
              <p className="mt-1 text-xs text-slate-500">
                Paste a job description on the left and hit “Analyse &amp; apply”.
              </p>
            </div>
          </div>
        ) : (
          logs.map((entry, index) => {
            const style = LEVEL_STYLE[entry.level] ?? LEVEL_STYLE.INFO;
            const isNew = !seenIds.has(entry.id) && index === 0;
            return (
              <div
                key={entry.id}
                className={cn(
                  "animate-rise flex items-start gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-2",
                  isNew && "ring-1 ring-violet-400/40"
                )}
              >
                <span className="mt-0.5 text-[10px] text-slate-500">{timeAgo(entry.createdAt)}</span>
                <span
                  className={cn(
                    "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ring-1",
                    style.chip
                  )}
                >
                  {style.label}
                </span>
                <span className="shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400">
                  {entry.stage}
                </span>
                <span className={cn("min-w-0 flex-1 leading-relaxed", style.text)}>{entry.message}</span>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
