import { cn } from "@/lib/utils";

const CONFIG: Record<
  string,
  { label: string; className: string; dot: string }
> = {
  DRAFTED: {
    label: "Drafted",
    className: "bg-indigo-500/15 text-indigo-200 ring-indigo-400/40",
    dot: "bg-indigo-400",
  },
  SENT: {
    label: "Sent",
    className: "bg-emerald-500/15 text-emerald-200 ring-emerald-400/40",
    dot: "bg-emerald-400",
  },
  SKIPPED_MISMATCH: {
    label: "Skipped · mismatch",
    className: "bg-amber-500/15 text-amber-200 ring-amber-400/40",
    dot: "bg-amber-400",
  },
  FAILED: {
    label: "Failed",
    className: "bg-rose-500/15 text-rose-200 ring-rose-400/40",
    dot: "bg-rose-400",
  },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const config = CONFIG[status] ?? {
    label: status,
    className: "bg-slate-500/15 text-slate-200 ring-slate-400/40",
    dot: "bg-slate-400",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1",
        config.className,
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}

export function ScoreBadge({ score, isMatch }: { score?: number | null; isMatch?: boolean | null }) {
  if (score === null || score === undefined) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/15 px-2.5 py-1 text-[11px] font-semibold text-slate-300 ring-1 ring-slate-400/30">
        no score
      </span>
    );
  }

  const tone =
    score >= 75
      ? "bg-emerald-500/15 text-emerald-200 ring-emerald-400/40"
      : score >= 50
        ? "bg-amber-500/15 text-amber-200 ring-amber-400/40"
        : "bg-rose-500/15 text-rose-200 ring-rose-400/40";

  return (
    <span className="inline-flex items-center gap-2">
      <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1", tone)}>
        {score}% fit
      </span>
      {isMatch === false ? (
        <span className="text-[11px] text-amber-300/80">below threshold</span>
      ) : null}
    </span>
  );
}
