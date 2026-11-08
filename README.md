# ApplyPilot 🚀

**Paste a job description → the AI scores the fit → writes the email → your flags decide draft or send.**

A personal, single-user job-application autopilot. No inbox, no reply tracking — just clean outbound
applications with your CV and a Gmail-style rich-text signature.

---

## What's inside

| Piece | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 — **flat dark theme, no gradients, Roboto, 2–6px radii** |
| Rich text | **TipTap** (MIT, free) — bold / italic / underline / links / lists, Gmail-style |
| AI | **OpenAI SDK** pointed at OpenRouter (drop-in `baseURL`) with strict JSON output |
| Forms & validation | `react-hook-form` + `zod` |
| Icons / toasts | `lucide-react`, `sonner` |
| Database | PostgreSQL (Supabase free tier) via Prisma ORM |
| Email | Nodemailer (multipart: HTML body + text fallback + PDF attachment) |
| Flag storage | `localStorage` (instant) mirrored to the DB (used by the server pipeline) |

## The flags (Settings → *Mail sending*)

| Flag | Effect |
| --- | --- |
| **Keep as draft** | Always save as `DRAFTED`, never send. Wins over "Auto send". |
| **Auto send** | Send immediately. Turns "Keep as draft" off automatically. |
| **Auto-generate email** | AI writes subject + body. Off = you write it in the history row (the AI still scores the fit). |
| **Fetch recruiter email** | No address given? Look inside the description, then scrape the source URL. |
| **Attach CV PDF** | Attach your master CV to outgoing mail. |

Flags live in `localStorage` (`applypilot.mailFlags.v1`) **and** on the server, because the pipeline
runs server-side. Change them on the dashboard or in Settings — both stay in sync.

> **No automatic skipping.** A weak match score is logged and shown, nothing more. Whether an
> application is kept or sent is decided *only* by the flags above.

## The pipeline

```
POST /api/applications
  1. intake       → job description + source URL saved (always persisted)
  2. recruiter    → if no address + flag ON: description → source URL scrape
  3. ai           → OpenAI SDK → OpenRouter → structured JSON
                    (isMatch, matchScore, reasoning, strengths, gaps, recruiterEmail, subject, body)
  4. match        → logged. Never blocks anything.
  5. draft        → body stored twice: rich HTML (emailBodyHtml) + plain text (emailBody)
  6. decide       → Keep-as-draft ON        → DRAFTED
                    Auto-send OFF           → DRAFTED
                    Auto-send ON, no email  → DRAFTED (+ warning)
                    Auto-send ON, complete  → SENT (CV attached, rich signature appended)
```

### Application statuses

| Status | Meaning |
| --- | --- |
| `DRAFTED` | Generated and waiting for you (Send / edit in the history row) |
| `SENT` | Delivered to SMTP with CV + signature |
| `FAILED` | AI or SMTP error (message stored on the row and in the log) |
| `SKIPPED_MISMATCH` | Legacy only — current builds never skip |

---

## Setup (local)

```bash
npm install            # also runs `prisma generate`
cp .env.example .env   # then fill in the values
npm run db:push        # creates/extends ApplyPilot's tables (safe, additive)
npm run dev            # http://localhost:3000
```

Then in **Settings**: paste your CV text, upload the CV **PDF**, write your **signature** (rich text),
and set the five mail flags.

### Environment variables

```env
# Postgres — transaction pooler (port 6543) for the app
DATABASE_URL="postgresql://postgres.<ref>:<pass>@aws-1-....pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
# Session pooler / direct connection (port 5432) used by prisma CLI
DIRECT_URL="postgresql://postgres.<ref>:<pass>@aws-1-....pooler.supabase.com:5432/postgres"

OPENROUTER_API_KEY="sk-or-v1-..."
OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"
OPENROUTER_SITE_URL="http://localhost:3000"
OPENROUTER_APP_NAME="ApplyPilot"

SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="you@gmail.com"
SMTP_PASS="your-16-character-gmail-app-password"
SMTP_FROM_NAME="Your Name"
# SMTP_FROM="you@gmail.com"
```

> Gmail: create an **App Password** (Google Account → Security → 2-Step Verification → App
> passwords). Spaces in the password are fine — they're stripped automatically.

### ⚠️ About `prisma db push`

This database may host other small projects (Supabase free tier is often shared). `prisma db push`
tries to make the DB match `schema.prisma` **and drops every table it doesn't know about**.

`npm run db:push` therefore runs the idempotent, purely additive SQL in
[`prisma/sql/init.sql`](prisma/sql/init.sql) via `prisma db execute` — `CREATE TABLE IF NOT EXISTS`
plus `ALTER TABLE … ADD COLUMN IF NOT EXISTS` for upgrades. Run it as often as you like.
`npm run db:push:unsafe` still exists for a truly empty database.

---

## Project layout

```
prisma/
  schema.prisma            # JobApplication · ActivityLog · Settings
  sql/init.sql             # safe, additive DDL + column migrations
src/
  app/
    page.tsx               # Dashboard: stats · job form · mail flags · live feed
    applications/page.tsx  # History: filters, expandable rows, rich draft editing
    settings/page.tsx      # Mail sending flags · signature · CV · model · health
    api/
      applications/        # POST (run pipeline) · GET (list)
      applications/[id]/   # GET · PATCH (edit draft) · DELETE
      applications/[id]/send/  # POST: send an existing draft
      logs/ settings/ cv/ health/
  components/
    rich-text-editor.tsx   # TipTap editor + toolbar (links, bold, lists…)
    mail-flags-card.tsx    # dashboard flag switches (localStorage-synced)
    settings-form.tsx      # Mail sending section + signature + model
    job-form.tsx           # submission form + result preview
    application-list.tsx   # history + inline rich draft editor
    activity-feed.tsx      # colour-coded live log
  lib/
    ai.ts                  # OpenAI SDK → OpenRouter, strict JSON, analyse-only mode
    pipeline.ts            # intake → recruiter → AI → draft → flag decision → send
    recruiter.ts           # email discovery (description + page scrape, blocklist)
    richtext.ts            # HTML ⇄ text, email assembly (html + text parts)
    mail.ts                # Nodemailer multipart transport
    mail-flags.ts          # localStorage ⇄ server flag sync hook
    settings.ts / prisma.ts / logs.ts / validations.ts / utils.ts / cv-store.ts
.data/cv/                  # uploaded master CV (git-ignored)
```

### Data model

`JobApplication` — `jobDescription` (required), `sourceUrl`, `recruiterEmail` + `recruiterSource`,
`companyName`, `jobTitle`, `matchScore`, `isMatch`, `matchReasoning`, `status`, `emailSubject`,
`emailBody` (text), `emailBodyHtml` (rich), `emailSentAt`, `cvAttached`, `aiModel`, `errorMessage`.

`Settings` — one row (`singleton`): `cvText`, `signatureHtml` (+ `signature` text mirror), `senderName`,
`defaultSubject`, the five flags (`flagDraft`, `flagAutoSend`, `flagFetchRecruiterEmail`,
`flagAutoGenerateEmail`, `attachCv`), `strictness`, `aiModel`, `minMatchScore`.
**No secrets in the DB** — credentials stay in `.env`.

`ActivityLog` — every pipeline step with a level (`INFO · AI · EMAIL · SUCCESS · WARN · ERROR`).

---

## API quick reference

```bash
# run the pipeline for a new job
curl -X POST localhost:3000/api/applications -H 'content-type: application/json' -d '{
  "jobDescription": "…full posting…",
  "sourceUrl": "https://…",
  "recruiterEmail": "hiring@company.com",
  "companyName": "Acme",
  "jobTitle": "Frontend Engineer"
}'

curl -X PATCH localhost:3000/api/applications/<id> \
  -H 'content-type: application/json' \
  -d '{"emailSubject":"…","emailBodyHtml":"<p>Hi <strong>there</strong></p>","recruiterEmail":"…"}'

curl -X POST localhost:3000/api/applications/<id>/send   # send a draft
curl "localhost:3000/api/health?deep=true"               # DB · AI key · CV · SMTP login
```

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Flags look right but the app ignores them | `localStorage` wins on page load and is pushed to the server; check the "in sync" badge in Settings, then reload |
| `OpenRouter 401 / 402 / 404` | Bad key / no credits / unknown model id — fix in `.env` or Settings |
| AI returns unparsable JSON | Switch to a stronger model (`openai/gpt-4o-mini` is the reliable default) |
| `Can't reach database server` | Supabase project paused → open the dashboard once; re-copy the pooler URL |
| `prepared statement "s0" already exists` | Keep `?pgbouncer=true` on `DATABASE_URL` |
| `Invalid login: 535` on send | Gmail needs an **App Password**, not your normal password |
| "no PDF uploaded" in the log | Upload your CV in Settings → Master CV (PDF) |
| Recruiter email not found | Many boards hide addresses behind JS/login — paste one manually |
| Prisma types missing after clone | `npx prisma generate` |

---

## Deliberately not included

- No inbox reading / reply tracking
- No auth — single-user local app. **Don't deploy it publicly as-is**: anyone with the URL could
  send email from your address.
- One master CV and one signature at a time (by design)

## Checklist coverage

- **Phase 1** — Next.js + TS + Tailwind, `lucide-react`, `clsx`/`tailwind-merge`, `sonner`, `zod`,
  `react-hook-form` ✅
- **Phase 2** — `JobApplication` schema (description + source URL persisted), Prisma → Postgres ✅
- **Phase 3** — dark flat dashboard, submission form, verbose live log feed ✅
- **Phase 4** — OpenAI SDK → OpenRouter, strict JSON matching + drafting, flags instead of skipping ✅
- **Phase 5** — Nodemailer (HTML + text), CV PDF attachment, rich signature, full history ✅
- **Follow-up round** — TipTap rich signature & body editing, five mail flags stored in
  `localStorage` + DB, no automatic skip, flat dark Roboto "squared" UI ✅
