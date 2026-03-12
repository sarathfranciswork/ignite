-- CreateEnum
CREATE TYPE "MaturityLevel" AS ENUM ('EMERGING', 'GROWING', 'MATURE', 'DECLINING');

-- CreateTable
CREATE TABLE "technologies" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "source_url" TEXT,
    "maturity_level" "MaturityLevel",
    "is_confidential" BOOLEAN NOT NULL DEFAULT false,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "technologies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tech_sia_links" (
    "id" TEXT NOT NULL,
    "tech_id" TEXT NOT NULL,
    "sia_id" TEXT NOT NULL,

    CONSTRAINT "tech_sia_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "technologies_maturity_level_idx" ON "technologies"("maturity_level");

-- CreateIndex
CREATE INDEX "technologies_created_by_id_idx" ON "technologies"("created_by_id");

-- CreateIndex
CREATE INDEX "technologies_is_archived_idx" ON "technologies"("is_archived");

-- CreateIndex
CREATE UNIQUE INDEX "tech_sia_links_tech_id_sia_id_key" ON "tech_sia_links"("tech_id", "sia_id");

-- AddForeignKey
ALTER TABLE "technologies" ADD CONSTRAINT "technologies_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tech_sia_links" ADD CONSTRAINT "tech_sia_links_tech_id_fkey" FOREIGN KEY ("tech_id") REFERENCES "technologies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tech_sia_links" ADD CONSTRAINT "tech_sia_links_sia_id_fkey" FOREIGN KEY ("sia_id") REFERENCES "strategic_innovation_areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
