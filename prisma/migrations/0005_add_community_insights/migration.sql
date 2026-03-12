-- CreateEnum
CREATE TYPE "insight_type" AS ENUM ('SIGNAL', 'OBSERVATION', 'OPPORTUNITY', 'RISK');

-- CreateEnum
CREATE TYPE "insight_scope" AS ENUM ('GLOBAL', 'CAMPAIGN', 'TREND');

-- AlterTable: Add new columns to insights
ALTER TABLE "insights" ADD COLUMN "type" "insight_type" NOT NULL DEFAULT 'SIGNAL';
ALTER TABLE "insights" ADD COLUMN "scope" "insight_scope" NOT NULL DEFAULT 'GLOBAL';
ALTER TABLE "insights" ADD COLUMN "is_archived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "insights" ADD COLUMN "created_by_id" TEXT;

-- CreateIndex
CREATE INDEX "insights_type_idx" ON "insights"("type");
CREATE INDEX "insights_scope_idx" ON "insights"("scope");
CREATE INDEX "insights_created_by_id_idx" ON "insights"("created_by_id");
CREATE INDEX "insights_is_archived_idx" ON "insights"("is_archived");

-- AddForeignKey
ALTER TABLE "insights" ADD CONSTRAINT "insights_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: Set created_by_id to the first admin user for existing insights
UPDATE "insights" SET "created_by_id" = (SELECT "id" FROM "users" LIMIT 1) WHERE "created_by_id" IS NULL;

-- Now make it required (after backfill)
ALTER TABLE "insights" ALTER COLUMN "created_by_id" SET NOT NULL;
