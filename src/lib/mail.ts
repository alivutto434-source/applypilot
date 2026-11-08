import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | null = null;

export function getTransporter(): Transporter {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error(
      "SMTP is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS in .env."
    );
  }

  const port = Number(process.env.SMTP_PORT || 465);
  const secure = (process.env.SMTP_SECURE ?? "true") !== "false";

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass: pass.replace(/\s+/g, "") },
  });

  return transporter;
}

export async function verifySmtp(): Promise<{ ok: boolean; message: string }> {
  try {
    await getTransporter().verify();
    return { ok: true, message: `SMTP login OK as ${process.env.SMTP_USER}` };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "SMTP verification failed",
    };
  }
}

export type MailPayload = {
  to: string;
  subject: string;
  body: string;
  signature?: string;
  attachment?: { filename: string; content: Buffer } | null;
};

export async function sendApplicationEmail(payload: MailPayload) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER!;
  const fromName = process.env.SMTP_FROM_NAME;
  const text = [payload.body.trim(), payload.signature?.trim()]
    .filter(Boolean)
    .join("\n\n");

  const info = await getTransporter().sendMail({
    from: fromName ? `"${fromName}" <${from}>` : from,
    to: payload.to,
    subject: payload.subject,
    text,
    attachments: payload.attachment
      ? [
          {
            filename: payload.attachment.filename,
            content: payload.attachment.content,
            contentType: "application/pdf",
          },
        ]
      : [],
  });

  return { messageId: info.messageId, accepted: info.accepted };
}
