import { History } from "lucide-react";
import { ApplicationList } from "@/components/application-list";

export const dynamic = "force-dynamic";

export default function ApplicationsPage() {
  return (
    <div className="space-y-5">
      <div className="animate-rise">
        <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-white">
          <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-sky-500/25 to-cyan-500/10 ring-1 ring-sky-400/40">
            <History className="size-5 text-sky-200" />
          </span>
          Application history
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Every job you have run through ApplyPilot — including the skipped mismatches. Expand a row
          to read the saved description, the AI reasoning and the exact email that went out.
        </p>
      </div>

      <ApplicationList />
    </div>
  );
}
