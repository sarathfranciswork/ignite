-- CreateEnum
CREATE TYPE "campaign_message_status" AS ENUM ('DRAFT', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "audience_segment" AS ENUM ('ALL_MEMBERS', 'CONTRIBUTORS', 'NON_CONTRIBUTORS', 'VIEWERS_NO_CONTRIBUTION', 'SELECTED_IDEA_AUTHORS', 'MANAGERS', 'COACHES', 'EVALUATORS', 'SEEDERS', 'SPONSORS', 'CUSTOM_ROLE');

-- CreateEnum
CREATE TYPE "communication_channel" AS ENUM ('EMAIL', 'IN_APP', 'FEED');

-- CreateEnum
CREATE TYPE "communication_status" AS ENUM ('PENDING', 'DELIVERED', 'FAILED');

-- CreateTable
CREATE TABLE "campaign_messages" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "segment" "audience_segment" NOT NULL DEFAULT 'ALL_MEMBERS',
    "status" "campaign_message_status" NOT NULL DEFAULT 'DRAFT',
    "sent_at" TIMESTAMP(3),
    "sent_by_id" TEXT NOT NULL,
    "recipient_count" INTEGER NOT NULL DEFAULT 0,
    "delivered_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "post_to_feed" BOOLEAN NOT NULL DEFAULT true,
    "send_email" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_logs" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "channel" "communication_channel" NOT NULL,
    "status" "communication_status" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communication_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "campaign_messages_campaign_id_idx" ON "campaign_messages"("campaign_id");

-- CreateIndex
CREATE INDEX "campaign_messages_campaign_id_status_idx" ON "campaign_messages"("campaign_id", "status");

-- CreateIndex
CREATE INDEX "campaign_messages_sent_by_id_idx" ON "campaign_messages"("sent_by_id");

-- CreateIndex
CREATE INDEX "campaign_messages_sent_at_idx" ON "campaign_messages"("sent_at");

-- CreateIndex
CREATE INDEX "communication_logs_message_id_idx" ON "communication_logs"("message_id");

-- CreateIndex
CREATE INDEX "communication_logs_user_id_idx" ON "communication_logs"("user_id");

-- CreateIndex
CREATE INDEX "communication_logs_message_id_status_idx" ON "communication_logs"("message_id", "status");

-- AddForeignKey
ALTER TABLE "campaign_messages" ADD CONSTRAINT "campaign_messages_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_messages" ADD CONSTRAINT "campaign_messages_sent_by_id_fkey" FOREIGN KEY ("sent_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_logs" ADD CONSTRAINT "communication_logs_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "campaign_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
