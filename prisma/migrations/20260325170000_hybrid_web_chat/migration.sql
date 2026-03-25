-- CreateEnum
CREATE TYPE "ConversationChannel" AS ENUM ('WHATSAPP', 'WEB');

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN "channel" "ConversationChannel" NOT NULL DEFAULT 'WHATSAPP';
ALTER TABLE "Conversation" ADD COLUMN "sessionKey" TEXT;
ALTER TABLE "Conversation" ALTER COLUMN "patientId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Patient" ALTER COLUMN "phone" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN "serviceType" TEXT NOT NULL DEFAULT 'GENERAL';

-- AlterTable
ALTER TABLE "FollowUpTemplate"
ADD COLUMN "offsetDirection" TEXT NOT NULL DEFAULT 'BEFORE',
ADD COLUMN "offsetValue" INTEGER NOT NULL DEFAULT 24,
ADD COLUMN "offsetUnit" TEXT NOT NULL DEFAULT 'HOURS',
ADD COLUMN "serviceScope" TEXT NOT NULL DEFAULT 'ALL';

-- RecreateForeignKey
ALTER TABLE "Conversation" DROP CONSTRAINT "Conversation_patientId_fkey";
ALTER TABLE "Conversation"
ADD CONSTRAINT "Conversation_patientId_fkey"
FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Index
CREATE INDEX "Conversation_sessionKey_channel_updatedAt_idx" ON "Conversation"("sessionKey", "channel", "updatedAt");

-- Data migration for existing templates
UPDATE "FollowUpTemplate"
SET
  "offsetDirection" = CASE
    WHEN "trigger" IN ('AFTER_1D', 'AFTER_3D') THEN 'AFTER'
    ELSE 'BEFORE'
  END,
  "offsetValue" = CASE
    WHEN "trigger" = 'BEFORE_2H' THEN 2
    WHEN "trigger" = 'AFTER_1D' THEN 1
    WHEN "trigger" = 'AFTER_3D' THEN 3
    ELSE 24
  END,
  "offsetUnit" = CASE
    WHEN "trigger" = 'BEFORE_2H' THEN 'HOURS'
    WHEN "trigger" IN ('AFTER_1D', 'AFTER_3D') THEN 'DAYS'
    ELSE 'HOURS'
  END,
  "serviceScope" = 'ALL';
