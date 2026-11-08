"use client";

import * as React from "react";
import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { Card, SectionHeading, Toggle } from "@/components/ui";
import { FLAG_META, useMailFlags, type MailFlags } from "@/lib/mail-flags";

/** Compact control of the mail flags on the dashboard (mirrors Settings). */
export function MailFlagsCard({ initial }: { initial: MailFlags }) {
  const { flags, setFlag, syncing } = useMailFlags(initial);

  const active = FLAG_META.filter((flag) => flags[flag.key]).map((flag) => flag.label);

  return (
    <Card>
      <SectionHeading
        icon={<SlidersHorizontal className="size-4" />}
        title="Mail flags"
        hint={syncing ? "syncing…" : active.join(" · ") || "nothing enabled"}
        accent="amber"
        action={
          <Link
            href="/settings"
            className="rounded-[3px] border border-[#2a2a30] bg-[#131316] px-2 py-1 text-[10.5px] font-semibold text-[#a8a8b3] transition hover:text-white"
          >
            settings
          </Link>
        }
      />
      <div className="grid gap-2">
        {FLAG_META.map((flag) => (
          <Toggle
            key={flag.key}
            checked={flags[flag.key]}
            onChange={(value) => setFlag(flag.key, value)}
            label={flag.label}
            accent={flag.accent}
          />
        ))}
      </div>
    </Card>
  );
}
