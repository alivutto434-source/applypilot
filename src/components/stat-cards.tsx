import { CheckCircle2, Filter, Send, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";

export async function StatCards() {
  const [total, sent, skipped, drafted, avg] = await Promise.all([
    prisma.jobApplication.count(),
    prisma.jobApplication.count({ where: { status: "SENT" } }),
    prisma.jobApplication.count({ where: { status: "SKIPPED_MISMATCH" } }),
    prisma.jobApplication.count({ where: { status: "DRAFTED" } }),
    prisma.jobApplication.aggregate({ _avg: { matchScore: true } }),
  ]);

  const cards = [
    {
      label: "Applications",
      value: total,
      hint: `${drafted} drafted · awaiting send`,
      suffix: "",
      icon: Sparkles,
      ring: "ring-violet-400/30",
      bg: "from-violet-500/20 to-fuchsia-500/5",
      text: "text-violet-200",
    },
    {
      label: "Emails sent",
      value: sent,
      hint: "CV attached automatically",
      suffix: "",
      icon: Send,
      ring: "ring-emerald-400/30",
      bg: "from-emerald-500/20 to-teal-500/5",
      text: "text-emerald-200",
    },
    {
      label: "Skipped mismatches",
      value: skipped,
      hint: "filtered out by the AI",
      suffix: "",
      icon: Filter,
      ring: "ring-amber-400/30",
      bg: "from-amber-500/20 to-orange-500/5",
      text: "text-amber-200",
    },
    {
      label: "Average fit",
      value: avg._avg.matchScore ? Math.round(avg._avg.matchScore) : 0,
      suffix: "%",
      hint: "across scored applications",
      icon: CheckCircle2,
      ring: "ring-sky-400/30",
      bg: "from-sky-500/20 to-cyan-500/5",
      text: "text-sky-200",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="glass animate-rise flex items-center gap-3 p-4">
            <span
              className={`grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ring-1 ${card.bg} ${card.ring}`}
            >
              <Icon className={`size-5 ${card.text}`} />
            </span>
            <div className="min-w-0">
              <p className="text-xl font-bold leading-none text-white">
                {card.value}
                {card.suffix ?? ""}
              </p>
              <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {card.label}
              </p>
              <p className="truncate text-[10px] text-slate-500">{card.hint}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
