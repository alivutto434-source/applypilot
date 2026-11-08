/**
 * Tiny HTML ⇄ text helpers for the rich-text signature and email bodies.
 * Keeps a plain-text part for every email (deliverability + previews).
 */

const ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&mdash;": "—",
  "&ndash;": "–",
};

export function htmlToText(html?: string | null): string {
  if (!html) return "";
  let text = html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "");

  text = text.replace(/&[a-z#0-9]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? m);
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Turn a plain-text body into simple, email-safe HTML paragraphs. */
export function textToHtml(text?: string | null): string {
  if (!text) return "";
  return text
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

export function looksLikeHtml(value?: string | null) {
  return Boolean(value && /<\/(p|div|strong|em|a|ul|ol|li|br|span|h[1-6])>|<br\s*\/?>/i.test(value));
}

/** Anything the editor produces is already HTML; plain text gets wrapped. */
export function toHtml(value?: string | null): string {
  if (!value) return "";
  return looksLikeHtml(value) ? value : textToHtml(value);
}

export type EmailParts = { html: string; text: string };

/**
 * Assemble the final email body: the message + the single global signature.
 * Produces a light-on-dark-independent, inline-styled HTML block so it looks
 * right in Gmail / Outlook.
 */
export function composeEmail(body: string, bodyHtml: string | null | undefined, signatureHtml: string, signatureText: string): EmailParts {
  const bodyBlock = bodyHtml && bodyHtml.trim() ? bodyHtml : textToHtml(body);
  const signatureBlock = signatureHtml?.trim()
    ? signatureHtml
    : textToHtml(signatureText);

  const html = `<div style="font-family:Roboto,Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#202124">
${bodyBlock}
${signatureBlock ? `<div style="margin-top:24px;padding-top:16px;border-top:1px solid #dadce0">${signatureBlock}</div>` : ""}
</div>`;

  const text = [body.trim(), htmlToText(signatureBlock)].filter(Boolean).join("\n\n");

  return { html, text };
}
