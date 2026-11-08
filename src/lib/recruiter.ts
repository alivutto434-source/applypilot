/**
 * Recruiter-email discovery for the "fetch recruiter email automatically" flag.
 *
 * 1. anything already written in the description wins
 * 2. otherwise we fetch the job posting page and scrape the first plausible address
 *
 * Deliberately conservative: no crawling beyond the source URL, short timeout,
 * and a blocklist for addresses that are never a human recruiter.
 */

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

const BLOCKED_LOCAL = [
  "noreply",
  "no-reply",
  "donotreply",
  "do-not-reply",
  "support",
  "privacy",
  "legal",
  "abuse",
  "postmaster",
  "unsubscribe",
  "notifications",
  "bounce",
  "mailer-daemon",
];

const BLOCKED_DOMAIN = [
  "example.com",
  "example.org",
  "sentry.io",
  "wixpress.com",
  "sentry-next.wixpress.com",
  "domain.com",
  "email.com",
  "yoursite.com",
];

const BLOCKED_EXT = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".css", ".js"];

const PREFERRED_LOCAL = ["hiring", "jobs", "careers", "career", "recruit", "recruiting", "talent", "hr", "people"];

export function extractEmails(text: string): string[] {
  const found = text.match(EMAIL_RE) ?? [];
  return [...new Set(found.map((e) => e.toLowerCase().trim()))];
}

export function isPlausibleRecruiterEmail(email: string): boolean {
  const [local, domain] = email.split("@");
  if (!local || !domain) return false;
  if (BLOCKED_DOMAIN.some((d) => domain.endsWith(d))) return false;
  if (BLOCKED_LOCAL.some((l) => local.startsWith(l))) return false;
  if (BLOCKED_EXT.some((ext) => email.endsWith(ext))) return false;
  if (domain.split(".").length < 2) return false;
  return true;
}

export function pickBestEmail(emails: string[]): string | null {
  const candidates = emails.filter(isPlausibleRecruiterEmail);
  if (candidates.length === 0) return null;

  const preferred = candidates.find((email) =>
    PREFERRED_LOCAL.some((prefix) => email.split("@")[0].startsWith(prefix))
  );
  return preferred ?? candidates[0];
}

/** Pull whatever the job description itself already contains. */
export function emailFromDescription(description: string): string | null {
  return pickBestEmail(extractEmails(description));
}

export type FetchResult = {
  email: string | null;
  source: "description" | "page" | null;
  detail: string;
};

/** Best-effort: look at the posting page when the description has no address. */
export async function scrapeEmailFromUrl(url: string): Promise<FetchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      return { email: null, source: null, detail: `job page returned HTTP ${response.status}` };
    }

    const html = (await response.text()).slice(0, 800_000);
    const candidates = extractEmails(html);
    const picked = pickBestEmail(candidates);

    if (!picked) {
      return {
        email: null,
        source: null,
        detail: `job page fetched, but no recruiter address found (${candidates.length} address(es) rejected as noise)`,
      };
    }

    return { email: picked, source: "page", detail: `found ${picked} on the job page` };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return {
      email: null,
      source: null,
      detail: /abort/i.test(message) ? "job page timed out" : `job page could not be fetched (${message})`,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function resolveRecruiterEmail({
  sourceUrl,
  jobDescription,
}: {
  sourceUrl?: string | null;
  jobDescription: string;
}): Promise<FetchResult> {
  const fromDescription = emailFromDescription(jobDescription);
  if (fromDescription) {
    return {
      email: fromDescription,
      source: "description",
      detail: `found ${fromDescription} inside the job description`,
    };
  }

  if (!sourceUrl) {
    return { email: null, source: null, detail: "no recruiter address and no source URL to check" };
  }

  return scrapeEmailFromUrl(sourceUrl);
}
