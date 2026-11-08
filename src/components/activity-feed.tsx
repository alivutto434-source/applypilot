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
  INFO: { chip: "border-[#26405c] bg-[#152a3d] text-[#8ec5ff]", text: "text-[#dcdce2]", label: "info" },
  AI: { chip: "border-[#3b3263] bg-[#241f3d] text-[#b9aaff]", text: "text-[#d8d2ff]", label: "ai" },
  EMAIL: { chip: "border-[#1e3a5f] bg-[#101f33] text-[#7cb0ff]", text: "text-[#c8dcff]", label: "email" },
  SUCCESS: { chip: "border-[#21483a] bg-[#132e23] text-[#6ee7a8]", text: "text-[#c6f3d8]", label: "ok" },
  WARN: { chip: "border-[#4d3a1a] bg-[#332612] text-[#f2c15c]", text: "text-[#f3e2b8]", label: "warn" },
  ERROR: { chip: "border-[#4d2730] bg-[#331a1f] text-[#ff9aa8]", text: "text-[#ffd4da]", label: "error" },
};

export function ActivityFeed({ className }: { className?: string }) {
  const [logs, setLogs] = React.useState<LogRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [live, setLive] = React.useState(true);
  const [seenIds, setSeenIds] = React.useState<Set<string>>(new Set());

  const load = React.useCallback(async (markSeen = false) => {
    try {
      const res = await fetch("/api/logs?take=60", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { logs: LogRow[] };
      setLogs(data.logs);
      if (markSeen) setSeenIds(new Set(data.logs.map((log) => log.id)));
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
    <section className={cn("panel flex flex-col overflow-hidden", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2a2a30] bg-[#131316] px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-[4px] border border-[#21483a] bg-[#132e23]">
            <Activity className="size-3.5 text-[#6ee7a8]" />
          </span>
          <div>
            <h2 className="text-[12px] font-bold uppercase tracking-[0.06em] text-white">
              Live activity
            </h2>
            <p className="text-[10.5px] text-[#77777f]">
              {live ? "every pipeline step · refreshes every 3s" : "paused"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="sm" onClick={() => setLive((value) => !value)} title="Pause/resume">
            {live ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void load()} title="Refresh">
            <RefreshCw className="size-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={clear} title="Clear">
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="max-h-[520px] min-h-[220px] flex-1 space-y-1 overflow-y-auto p-2 font-mono text-[11.5px]">
        {loading ? (
          <div className="space-y-1.5">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="skeleton h-8 rounded-[3px]" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="grid h-full place-items-center px-6 py-12 text-center">
            <div>
              <p className="text-[13px] font-semibold text-[#c9c9d1]">Nothing has happened yet</p>
              <p className="mt-1 text-[11.5px] text-[#6b6b76]">
                Paste a job description on the left and press “Analyse &amp; save”.
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
                  "animate-rise flex items-start gap-2 rounded-[3px] border border-[#23232a] bg-[#131316] px-2 py-1.5",
                  isNew && "border-[#3b3263]"
                )}
              >
                <span className="mt-0.5 shrink-0 text-[10px] text-[#6b6b76]">
                  {timeAgo(entry.createdAt)}
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded-[2px] border px-1.5 py-[1px] text-[9px] font-bold uppercase",
                    style.chip
                  )}
                >
                  {style.label}
                </span>
                <span className="shrink-0 rounded-[2px] bg-[#1f1f24] px-1.5 py-[1px] text-[10px] text-[#9898a2]">
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
