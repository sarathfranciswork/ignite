-- CreateEnum
CREATE TYPE "slack_integration_status" AS ENUM ('ACTIVE', 'PAUSED', 'ERROR');

-- CreateTable
CREATE TABLE "slack_integrations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "space_id" TEXT,
    "team_id" TEXT,
    "access_token" TEXT,
    "bot_user_id" TEXT,
    "webhook_url" TEXT,
    "channel_mappings" JSONB NOT NULL DEFAULT '{}',
    "status" "slack_integration_status" NOT NULL DEFAULT 'ACTIVE',
    "events" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "description" TEXT,
    "campaign_id" TEXT,
    "channel_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "last_error" TEXT,
    "last_sent_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "slack_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "slack_integrations_created_by_id_idx" ON "slack_integrations"("created_by_id");

-- CreateIndex
CREATE INDEX "slack_integrations_status_idx" ON "slack_integrations"("status");

-- CreateIndex
CREATE INDEX "slack_integrations_campaign_id_idx" ON "slack_integrations"("campaign_id");

-- CreateIndex
CREATE INDEX "slack_integrations_channel_id_idx" ON "slack_integrations"("channel_id");

-- CreateIndex
CREATE INDEX "slack_integrations_space_id_idx" ON "slack_integrations"("space_id");

-- AddForeignKey
ALTER TABLE "slack_integrations" ADD CONSTRAINT "slack_integrations_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slack_integrations" ADD CONSTRAINT "slack_integrations_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slack_integrations" ADD CONSTRAINT "slack_integrations_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;
