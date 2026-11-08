-- ---------------------------------------------------------------------------
-- ApplyPilot — idempotent, additive schema bootstrap.
--
--   npm run db:push
--
-- This script ONLY creates what ApplyPilot needs. It never drops or touches
-- other tables in the same database (Supabase free tier often hosts several
-- small projects), which is why we use `prisma db execute` instead of
-- `prisma db push` (that command tries to drop anything not in schema.prisma).
--
-- Safe to run as many times as you like.
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AppStatus') THEN
    CREATE TYPE "AppStatus" AS ENUM ('DRAFTED', 'SENT', 'SKIPPED_MISMATCH', 'FAILED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LogLevel') THEN
    CREATE TYPE "LogLevel" AS ENUM ('INFO', 'AI', 'EMAIL', 'SUCCESS', 'WARN', 'ERROR');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "JobApplication" (
  "id"             TEXT NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  "jobTitle"       TEXT,
  "companyName"    TEXT,
  "jobDescription" TEXT NOT NULL,
  "sourceUrl"      TEXT,
  "recruiterEmail" TEXT,
  "matchScore"     INTEGER,
  "isMatch"        BOOLEAN,
  "matchReasoning" TEXT,
  "status"         "AppStatus" NOT NULL DEFAULT 'DRAFTED',
  "emailSubject"   TEXT,
  "emailBody"      TEXT,
  "emailSentAt"    TIMESTAMP(3),
  "cvAttached"     BOOLEAN NOT NULL DEFAULT false,
  "aiModel"        TEXT,
  "errorMessage"   TEXT,
  CONSTRAINT "JobApplication_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "JobApplication_status_idx"    ON "JobApplication"("status");
CREATE INDEX IF NOT EXISTS "JobApplication_createdAt_idx" ON "JobApplication"("createdAt");

CREATE TABLE IF NOT EXISTS "ActivityLog" (
  "id"            TEXT NOT NULL,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "level"         "LogLevel" NOT NULL DEFAULT 'INFO',
  "stage"         TEXT NOT NULL,
  "message"       TEXT NOT NULL,
  "applicationId" TEXT,
  "meta"          JSONB,
  CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ActivityLog_createdAt_idx"     ON "ActivityLog"("createdAt");
CREATE INDEX IF NOT EXISTS "ActivityLog_applicationId_idx" ON "ActivityLog"("applicationId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ActivityLog_applicationId_fkey'
  ) THEN
    ALTER TABLE "ActivityLog"
      ADD CONSTRAINT "ActivityLog_applicationId_fkey"
      FOREIGN KEY ("applicationId") REFERENCES "JobApplication"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "Settings" (
  "id"             TEXT NOT NULL DEFAULT 'singleton',
  "cvText"         TEXT NOT NULL DEFAULT '',
  "cvFileName"     TEXT,
  "signature"      TEXT NOT NULL DEFAULT '',
  "senderName"     TEXT NOT NULL DEFAULT '',
  "defaultSubject" TEXT NOT NULL DEFAULT 'Application for {{jobTitle}} at {{companyName}}',
  "autoSend"       BOOLEAN NOT NULL DEFAULT false,
  "bypassMatch"    BOOLEAN NOT NULL DEFAULT false,
  "attachCv"       BOOLEAN NOT NULL DEFAULT true,
  "strictness"     TEXT NOT NULL DEFAULT 'balanced',
  "aiModel"        TEXT NOT NULL DEFAULT 'openai/gpt-4o-mini',
  "minMatchScore"  INTEGER NOT NULL DEFAULT 60,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);
