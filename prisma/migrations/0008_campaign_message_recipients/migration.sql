-- CreateEnum
CREATE TYPE "recipient_email_status" AS ENUM ('PENDING', 'SENT', 'FAILED', 'BOUNCED');

-- CreateTable
CREATE TABLE "campaign_message_recipients" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email_status" "recipient_email_status" NOT NULL DEFAULT 'PENDING',
    "read_at" TIMESTAMP(3),

    CONSTRAINT "campaign_message_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "campaign_message_recipients_message_id_idx" ON "campaign_message_recipients"("message_id");

-- CreateIndex
CREATE INDEX "campaign_message_recipients_user_id_idx" ON "campaign_message_recipients"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_message_recipients_message_id_user_id_key" ON "campaign_message_recipients"("message_id", "user_id");

-- AddForeignKey
ALTER TABLE "campaign_message_recipients" ADD CONSTRAINT "campaign_message_recipients_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "campaign_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_message_recipients" ADD CONSTRAINT "campaign_message_recipients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
