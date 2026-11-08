import { CheckCircle2, FilePenLine, Send, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";

const TONES = {
  violet: "border-[#3b3263] bg-[#241f3d] text-[#b9aaff]",
  emerald: "border-[#21483a] bg-[#132e23] text-[#6ee7a8]",
  sky: "border-[#26405c] bg-[#152a3d] text-[#8ec5ff]",
  amber: "border-[#4d3a1a] bg-[#332612] text-[#f2c15c]",
} as const;

export async function StatCards() {
  const [total, sent, drafted, avg] = await Promise.all([
    prisma.jobApplication.count(),
    prisma.jobApplication.count({ where: { status: "SENT" } }),
    prisma.jobApplication.count({ where: { status: "DRAFTED" } }),
    prisma.jobApplication.aggregate({ _avg: { matchScore: true } }),
  ]);

  const cards = [
    {
      label: "Applications",
      value: String(total),
      hint: "every job description saved",
      icon: Sparkles,
      tone: TONES.violet,
    },
    {
      label: "Sent",
      value: String(sent),
      hint: "CV + rich signature attached",
      icon: Send,
      tone: TONES.emerald,
    },
    {
      label: "Drafts waiting",
      value: String(drafted),
      hint: "review and press Send",
      icon: FilePenLine,
      tone: TONES.sky,
    },
    {
      label: "Average fit",
      value: `${avg._avg.matchScore ? Math.round(avg._avg.matchScore) : 0}%`,
      hint: "informational, never blocking",
      icon: CheckCircle2,
      tone: TONES.amber,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="panel flex items-center gap-2.5 p-3.5">
            <span
              className={`grid size-9 shrink-0 place-items-center rounded-[4px] border ${card.tone}`}
            >
              <Icon className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-lg font-bold leading-none text-white">{card.value}</p>
              <p className="mt-1 truncate text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#a8a8b3]">
                {card.label}
              </p>
              <p className="truncate text-[10px] text-[#6b6b76]">{card.hint}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
