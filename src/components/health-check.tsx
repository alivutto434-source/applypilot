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
      const res = await fetch(`/api/health${isDeep ? "?deep=true" : ""}`, { cache: "no-store" });
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
        icon={<HeartPulse className="size-4" />}
        title="System check"
        hint="Database, AI key, CV and SMTP login."
        accent="rose"
        action={
          <Button variant="outline" size="sm" onClick={() => void run(true)} loading={loading}>
            {deep ? "Re-test" : "Test SMTP"}
          </Button>
        }
      />

      <div className="space-y-1.5">
        {checks.length === 0 && loading ? (
          <div className="flex items-center gap-2 text-[11.5px] text-[#8c8c96]">
            <Loader2 className="size-3.5 animate-spin" /> Running checks…
          </div>
        ) : null}

        {checks.map((check) => (
          <div
            key={check.name}
            className={`flex items-start gap-2 rounded-[3px] border px-2.5 py-2 ${
              check.ok
                ? "border-[#21483a] bg-[#132e23]"
                : "border-[#4d2730] bg-[#331a1f]"
            }`}
          >
            {check.ok ? (
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-[#6ee7a8]" />
            ) : (
              <XCircle className="mt-0.5 size-3.5 shrink-0 text-[#ff9aa8]" />
            )}
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-white">{check.name}</p>
              <p className="break-words text-[10.5px] leading-relaxed text-[#9898a2]">
                {check.detail}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
