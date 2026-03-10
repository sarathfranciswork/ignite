-- CreateTable
CREATE TABLE "campaign_kpi_snapshots" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "snapshot_date" TIMESTAMP(3) NOT NULL,
    "total_views" INTEGER NOT NULL DEFAULT 0,
    "unique_visitors" INTEGER NOT NULL DEFAULT 0,
    "total_participants" INTEGER NOT NULL DEFAULT 0,
    "ideas_submitted" INTEGER NOT NULL DEFAULT 0,
    "ideas_qualified" INTEGER NOT NULL DEFAULT 0,
    "ideas_hot" INTEGER NOT NULL DEFAULT 0,
    "ideas_evaluated" INTEGER NOT NULL DEFAULT 0,
    "ideas_selected" INTEGER NOT NULL DEFAULT 0,
    "total_comments" INTEGER NOT NULL DEFAULT 0,
    "total_votes" INTEGER NOT NULL DEFAULT 0,
    "total_likes" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_kpi_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "campaign_kpi_snapshots_campaign_id_idx" ON "campaign_kpi_snapshots"("campaign_id");

-- CreateIndex
CREATE INDEX "campaign_kpi_snapshots_snapshot_date_idx" ON "campaign_kpi_snapshots"("snapshot_date");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_kpi_snapshots_campaign_id_snapshot_date_key" ON "campaign_kpi_snapshots"("campaign_id", "snapshot_date");

-- AddForeignKey
ALTER TABLE "campaign_kpi_snapshots" ADD CONSTRAINT "campaign_kpi_snapshots_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
