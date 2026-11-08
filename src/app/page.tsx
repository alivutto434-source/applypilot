import Link from "next/link";
import { ArrowRight, History, Sparkles, Zap } from "lucide-react";
import { JobForm } from "@/components/job-form";
import { ActivityFeed } from "@/components/activity-feed";
import { ApplicationList } from "@/components/application-list";
import { MailFlagsCard } from "@/components/mail-flags-card";
import { StatCards } from "@/components/stat-cards";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const settings = await getSettings();

  return (
    <div className="space-y-4">
      <section className="animate-rise flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-[3px] border border-[#3b3263] bg-[#241f3d] px-2 py-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#b9aaff]">
            <Zap className="size-3" /> autopilot ready
          </span>
          <h1 className="mt-2 text-[26px] font-bold leading-tight tracking-tight text-white sm:text-[30px]">
            Paste a job. Get a tailored application.
          </h1>
          <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-[#9898a2]">
            The AI scores the fit against your master CV, writes the email and appends your rich-text
            signature. Your mail flags decide whether it is kept as a draft or sent with the CV
            attached.
          </p>
        </div>
        <Link
          href="/applications"
          className="focus-ring inline-flex items-center gap-1.5 rounded-[4px] border border-[#2a2a30] bg-[#1b1b1f] px-3 py-2 text-[12.5px] font-semibold text-[#dcdce2] transition hover:border-[#3a3a44] hover:bg-[#23232a]"
        >
          <History className="size-3.5" /> View history <ArrowRight className="size-3" />
        </Link>
      </section>

      <StatCards />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <JobForm />
        <div className="space-y-4">
          <MailFlagsCard
            initial={{
              flagDraft: settings.flagDraft,
              flagAutoSend: settings.flagAutoSend,
              flagFetchRecruiterEmail: settings.flagFetchRecruiterEmail,
              flagAutoGenerateEmail: settings.flagAutoGenerateEmail,
              attachCv: settings.attachCv,
            }}
          />
          <ActivityFeed />
        </div>
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.06em] text-white">
            <Sparkles className="size-3.5 text-[#b9aaff]" /> Recent applications
          </h2>
          <Link href="/applications" className="text-[11.5px] font-semibold text-[#b9aaff] hover:underline">
            see all →
          </Link>
        </div>
        <ApplicationList compact />
      </section>
    </div>
  );
}
