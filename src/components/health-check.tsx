"use client";

import * as React from "react";
import { CheckCircle2, HeartPulse, Loader2, XCircle } from "lucide-react";
import { Button, Card, SectionHeading } from "@/components/ui";

type Check = { name: string; ok: boolean; detail: string };

export function HealthCheck() {
  const [checks, setChecks] = React.useState<Check[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [deep, setDeep] = React.useState(false);

  const run = React.useCallback(async (isDeep: boolean) => {
    setLoading(true);
    setDeep(isDeep);
    try {
      const res = await fetch(`/api/health${isDeep ? "?deep=true" : ""}`, {
        cache: "no-store",
      });
      const data = await res.json();
      setChecks(data.checks ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void run(false);
  }, [run]);

  return (
    <Card>
      <SectionHeading
        icon={<HeartPulse className="size-5" />}
        title="System check"
        hint="Verify the database, AI key, CV and SMTP login before you rely on autopilot."
        accent="rose"
        action={
          <Button variant="outline" size="sm" onClick={() => void run(true)} loading={loading}>
            {deep ? "Re-test" : "Test SMTP login"}
          </Button>
        }
      />

      <div className="space-y-2">
        {checks.length === 0 && loading ? (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Loader2 className="size-3.5 animate-spin" /> Running checks…
          </div>
        ) : null}

        {checks.map((check) => (
          <div
            key={check.name}
            className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 ${
              check.ok
                ? "border-emerald-400/20 bg-emerald-500/[0.07]"
                : "border-rose-400/25 bg-rose-500/[0.07]"
            }`}
          >
            {check.ok ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />
            ) : (
              <XCircle className="mt-0.5 size-4 shrink-0 text-rose-400" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">{check.name}</p>
              <p className="break-words text-[11px] leading-relaxed text-slate-400">{check.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
