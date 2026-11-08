# ApplyPilot 🚀

**Paste a job description → the AI scores the fit against your CV → writes the email → (optionally) sends it with your CV attached.**

A personal, single-user job-application autopilot. No inbox, no reply tracking — just clean outbound
applications, with every job description and source URL archived forever.

---

## What's inside

| Piece | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 (dark, colourful, glassy UI) |
| Icons / toasts | `lucide-react`, `sonner` |
| Forms & validation | `react-hook-form` + `zod` |
| Database | PostgreSQL (Supabase free tier) via Prisma ORM |
| AI | OpenRouter (OpenAI-compatible), any model id |
| Email | Nodemailer over SMTP (Gmail app password by default) |
| Styling helpers | `clsx` + `tailwind-merge` |

## The pipeline

```
POST /api/applications
  1. intake      → save job description + source URL (always stored)
  2. ai          → CV text + description + strictness → structured JSON
  3. match       → isMatch / matchScore / reasoning
                   ├─ mismatch + bypass OFF → status SKIPPED_MISMATCH (nothing sent)
                   └─ match (or bypass ON) → continue
  4. draft       → subject + body written by the model
  5. email       → autoSend ON  → Nodemailer + CV PDF → status SENT
                   autoSend OFF → status DRAFTED (you press Send in the UI)
```

Every step writes a colour-coded row to the **Live activity** feed (polled every 3s), so you can
watch exactly what the AI did and why.

### Application statuses

| Status | Meaning |
| --- | --- |
| `DRAFTED` | Email written, waiting for you to send (or no recruiter email supplied) |
| `SENT` | Delivered to SMTP, CV attached |
| `SKIPPED_MISMATCH` | AI said no and bypass is off — nothing was emailed |
| `FAILED` | AI or SMTP error (message stored on the row + in the log) |

---

## Setup (local)

```bash
npm install            # also runs `prisma generate`
cp .env.example .env   # then fill in the values
npm run db:push        # creates ApplyPilot's tables (safe, additive)
npm run dev            # http://localhost:3000
```

Then open **Settings → paste your CV text**, upload your CV **PDF**, and decide your rules
(auto-send, bypass match, strictness, signature, model).

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

> Gmail: create an **App Password** (Google Account → Security → 2-Step Verification → App passwords).
> Spaces in the password are fine — they're stripped automatically.

### ⚠️ About `prisma db push`

This database may host other small projects (Supabase free tier is often shared). `prisma db push`
tries to make the DB match `schema.prisma` **and drops every table it doesn't know about**.

That's why `npm run db:push` does **not** run `prisma db push`. It runs the idempotent, purely
additive SQL in [`prisma/sql/init.sql`](prisma/sql/init.sql) via `prisma db execute`:

```
CREATE TABLE IF NOT EXISTS "JobApplication" ...
CREATE TABLE IF NOT EXISTS "ActivityLog" ...
CREATE TABLE IF NOT EXISTS "Settings" ...
```

Use it as often as you like. `npm run db:push:unsafe` is still there for a truly empty database.

---

## Project layout

```
prisma/
  schema.prisma            # JobApplication · ActivityLog · Settings
  sql/init.sql             # safe, additive DDL (npm run db:push)
src/
  app/
    page.tsx               # Dashboard: stats + job form + live feed + recent
    applications/page.tsx  # Full history with filters, expandable rows
    settings/page.tsx      # Rules, CV text, CV PDF, signature, model, health
    api/
      applications/        # POST (run pipeline) · GET (list)
      applications/[id]/   # GET one · DELETE
      applications/[id]/send/  # POST: send an existing draft
      logs/                # GET feed · DELETE clear
      settings/            # GET · PUT
      cv/                  # POST upload · GET download · DELETE
      health/              # GET (+ ?deep=true to test the SMTP login)
  components/              # app shell, job form, activity feed, list, settings…
  lib/
    ai.ts                  # OpenRouter call + prompts + JSON parsing
    pipeline.ts            # the orchestration (match → bypass → draft → send)
    mail.ts                # Nodemailer transport + verify
    cv-store.ts            # local PDF storage in .data/cv/
    logs.ts                # activity log writer
    prisma.ts / settings.ts / validations.ts / utils.ts
.data/cv/                  # your uploaded master CV (git-ignored)
```

### Data model (the "save everything" part)

`JobApplication` stores: `jobDescription` (required), `sourceUrl`, `recruiterEmail`, `companyName`,
`jobTitle`, `matchScore`, `isMatch`, `matchReasoning`, `status`, `emailSubject`, `emailBody`,
`emailSentAt`, `cvAttached`, `aiModel`, `errorMessage`, timestamps.

`ActivityLog` stores every pipeline message with a level (`INFO · AI · EMAIL · SUCCESS · WARN ·
ERROR`), so the feed survives a page reload and gives you a full audit trail per application.

`Settings` is a single row (`id = "singleton"`): CV text, CV filename, signature, sender name,
default subject template, `autoSend`, `bypassMatch`, `attachCv`, `strictness`, `aiModel`,
`minMatchScore`. **No secrets are stored in the database** — credentials stay in `.env`.

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

curl localhost:3000/api/applications?status=SENT      # history (filter by status)
curl localhost:3000/api/logs?take=40                  # activity feed
curl -X POST localhost:3000/api/applications/<id>/send # send a draft
curl "localhost:3000/api/health?deep=true"            # DB · AI key · CV · SMTP login
```

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `OpenRouter 401` | Bad/expired `OPENROUTER_API_KEY` in `.env`, restart `npm run dev` |
| `OpenRouter 402` | No credits on the OpenRouter account — top up or switch to a `:free` model |
| `OpenRouter 404 model not found` | Model id is wrong/retired — change it in **Settings → AI model** |
| AI returns unparsable JSON | Switch to a stronger model (`openai/gpt-4o-mini` is the reliable default) |
| `Can't reach database server` | Supabase project paused → open the dashboard once to wake it; re-copy the pooler URL |
| `prepared statement "s0" already exists` | Add `?pgbouncer=true` to `DATABASE_URL` (already included) |
| `Invalid login: 535` on send | Gmail needs an **App Password**, not your normal password |
| “no PDF uploaded” in the log | Upload your CV in Settings → Master CV (PDF) |
| Everything is skipped | Your `minMatchScore` is too high or `strictness` is `strict` — loosen it in Settings |
| Prisma types missing after clone | `npm run postinstall` (or just `npx prisma generate`) |

---

## Deliberately not included

- No inbox reading / reply tracking (out of scope by design)
- No auth — it's a single-user local app. **Don't deploy it publicly as-is**: anyone with the URL
  could send email from your address. If you ever host it, put auth in front of it.
- No multi-CV support yet (one master CV at a time)

## Checklist coverage

- **Phase 1** — Next.js + TS + Tailwind, `lucide-react`, `clsx`/`tailwind-merge`, `sonner`, `zod`,
  `react-hook-form` ✅
- **Phase 2** — `JobApplication` schema (description + source URL persisted), Prisma client wired to
  Postgres ✅
- **Phase 3** — colourful config dashboard, job submission form, verbose live log feed ✅
- **Phase 4** — OpenRouter helper, strict JSON matching + drafting prompt, mismatch-bypass toggle ✅
- **Phase 5** — Nodemailer transport, CV PDF attachment, full history log ✅
