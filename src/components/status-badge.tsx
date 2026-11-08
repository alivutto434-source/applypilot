import { cn } from "@/lib/utils";

const CONFIG: Record<string, { label: string; className: string; dot: string }> = {
  DRAFTED: {
    label: "Draft",
    className: "border-[#26405c] bg-[#152a3d] text-[#8ec5ff]",
    dot: "bg-[#3b82f6]",
  },
  SENT: {
    label: "Sent",
    className: "border-[#21483a] bg-[#132e23] text-[#6ee7a8]",
    dot: "bg-[#17a34a]",
  },
  SKIPPED_MISMATCH: {
    label: "Skipped (legacy)",
    className: "border-[#4d3a1a] bg-[#332612] text-[#f2c15c]",
    dot: "bg-[#d97706]",
  },
  FAILED: {
    label: "Failed",
    className: "border-[#4d2730] bg-[#331a1f] text-[#ff9aa8]",
    dot: "bg-[#dc2626]",
  },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const config = CONFIG[status] ?? {
    label: status,
    className: "border-[#33333c] bg-[#1d1d21] text-[#c9c9d1]",
    dot: "bg-[#8c8c96]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[3px] border px-2 py-[3px] text-[10.5px] font-bold uppercase tracking-[0.04em]",
        config.className,
        className
      )}
    >
      <span className={cn("size-1.5 rounded-[1px]", config.dot)} />
      {config.label}
    </span>
  );
}

export function ScoreBadge({
  score,
  isMatch,
}: {
  score?: number | null;
  isMatch?: boolean | null;
}) {
  if (score === null || score === undefined) {
    return (
      <span className="inline-flex items-center rounded-[3px] border border-[#33333c] bg-[#1d1d21] px-2 py-[3px] text-[10.5px] font-bold uppercase tracking-[0.04em] text-[#8c8c96]">
        no score
      </span>
    );
  }

  const tone =
    score >= 75
      ? "border-[#21483a] bg-[#132e23] text-[#6ee7a8]"
      : score >= 50
        ? "border-[#4d3a1a] bg-[#332612] text-[#f2c15c]"
        : "border-[#4d2730] bg-[#331a1f] text-[#ff9aa8]";

  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={cn(
          "rounded-[3px] border px-2 py-[3px] text-[10.5px] font-bold uppercase tracking-[0.04em]",
          tone
        )}
      >
        {score}% fit
      </span>
      {isMatch === false ? (
        <span className="text-[10.5px] font-medium text-[#f2c15c]">weak fit · kept</span>
      ) : null}
    </span>
  );
}
