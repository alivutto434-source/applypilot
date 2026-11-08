"use client";

import * as React from "react";

/**
 * Mail-sending flags.
 *
 * They are kept in localStorage (instant, survives reloads) AND pushed to the
 * server, because the pipeline runs server-side and must read the same values.
 * localStorage is the fast cache; the DB is the source of truth for the run.
 */
export type MailFlags = {
  flagDraft: boolean;
  flagAutoSend: boolean;
  flagFetchRecruiterEmail: boolean;
  flagAutoGenerateEmail: boolean;
  attachCv: boolean;
};

export const DEFAULT_FLAGS: MailFlags = {
  flagDraft: true,
  flagAutoSend: false,
  flagFetchRecruiterEmail: false,
  flagAutoGenerateEmail: true,
  attachCv: true,
};

export const FLAGS_KEY = "applypilot.mailFlags.v1";

export const FLAG_META: {
  key: keyof MailFlags;
  label: string;
  description: string;
  accent: "violet" | "emerald" | "amber" | "sky";
}[] = [
  {
    key: "flagDraft",
    label: "Keep as draft",
    description: "Generate everything but never send — you review and hit Send yourself.",
    accent: "sky",
  },
  {
    key: "flagAutoSend",
    label: "Auto send",
    description: "Send the email immediately. Ignored while “Keep as draft” is on.",
    accent: "emerald",
  },
  {
    key: "flagAutoGenerateEmail",
    label: "Auto-generate email",
    description: "Let the AI write the subject and body. Off = you write it in the history row.",
    accent: "violet",
  },
  {
    key: "flagFetchRecruiterEmail",
    label: "Fetch recruiter email",
    description: "When no address is given, look for one in the description and the job page.",
    accent: "amber",
  },
  {
    key: "attachCv",
    label: "Attach CV PDF",
    description: "Attach your master CV to every outgoing email.",
    accent: "sky",
  },
];

export function readFlagsFromStorage(): MailFlags | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(FLAGS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<MailFlags>;
    return { ...DEFAULT_FLAGS, ...parsed };
  } catch {
    return null;
  }
}

export function writeFlagsToStorage(flags: MailFlags) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FLAGS_KEY, JSON.stringify(flags));
  } catch {
    /* storage full / disabled — flags still live on the server */
  }
}

/** Push the flags to the API so the server-side pipeline uses them. */
export async function pushFlagsToServer(flags: MailFlags) {
  const res = await fetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(flags),
  });
  if (!res.ok) throw new Error("Could not save the mail flags on the server");
  return res.json();
}

export function useMailFlags(initial: MailFlags) {
  const [flags, setFlags] = React.useState<MailFlags>(initial);
  const [syncing, setSyncing] = React.useState(false);
  const hydrated = React.useRef(false);

  React.useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    const stored = readFlagsFromStorage();
    if (!stored) {
      writeFlagsToStorage(initial);
      return;
    }

    setFlags(stored);

    // Local copy wins on load, then we make the server agree with it.
    if (JSON.stringify(stored) !== JSON.stringify(initial)) {
      setSyncing(true);
      pushFlagsToServer(stored)
        .catch(() => undefined)
        .finally(() => setSyncing(false));
      window.dispatchEvent(new Event("applypilot:refresh"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setFlag = React.useCallback(
    <K extends keyof MailFlags>(key: K, value: MailFlags[K]) => {
      setFlags((previous) => {
        const next = { ...previous, [key]: value };

        // Both flags on makes no sense — draft wins, so auto-send follows it.
        if (key === "flagDraft" && value === true) next.flagAutoSend = false;
        if (key === "flagAutoSend" && value === true) next.flagDraft = false;

        writeFlagsToStorage(next);
        setSyncing(true);
        pushFlagsToServer(next)
          .then(() => window.dispatchEvent(new Event("applypilot:refresh")))
          .catch(() => undefined)
          .finally(() => setSyncing(false));
        return next;
      });
    },
    []
  );

  const replace = React.useCallback((next: MailFlags) => {
    setFlags(next);
    writeFlagsToStorage(next);
  }, []);

  return { flags, setFlag, replace, syncing };
}
