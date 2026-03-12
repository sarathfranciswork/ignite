-- CreateTable
CREATE TABLE "campaign_sia_links" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "sia_id" TEXT NOT NULL,

    CONSTRAINT "campaign_sia_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "campaign_sia_links_campaign_id_sia_id_key" ON "campaign_sia_links"("campaign_id", "sia_id");

-- AddForeignKey
ALTER TABLE "campaign_sia_links" ADD CONSTRAINT "campaign_sia_links_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_sia_links" ADD CONSTRAINT "campaign_sia_links_sia_id_fkey" FOREIGN KEY ("sia_id") REFERENCES "strategic_innovation_areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
