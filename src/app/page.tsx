import Link from "next/link";
import { ArrowRight, History, Sparkles, Zap } from "lucide-react";
import { JobForm } from "@/components/job-form";
import { ActivityFeed } from "@/components/activity-feed";
import { ApplicationList } from "@/components/application-list";
import { StatCards } from "@/components/stat-cards";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <section className="animate-rise">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-violet-200">
              <Zap className="size-3" /> autopilot ready
            </span>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Paste a job. Get a <span className="gradient-text">tailored application</span> sent.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
              The AI scores the fit against your master CV, writes the email, and — if you flip
              autopilot on — sends it with your CV attached. Every description and source URL is
              archived, so you never lose a posting again.
            </p>
          </div>
          <Link
            href="/applications"
            className="focus-ring inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
          >
            <History className="size-4" /> View history <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </section>

      <StatCards />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <JobForm />
        <ActivityFeed />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-white">
            <Sparkles className="size-4 text-violet-300" /> Recent applications
          </h2>
          <Link
            href="/applications"
            className="text-xs font-semibold text-violet-300 hover:text-violet-200 hover:underline"
          >
            see all →
          </Link>
        </div>
        <ApplicationList compact />
      </section>
    </div>
  );
}
