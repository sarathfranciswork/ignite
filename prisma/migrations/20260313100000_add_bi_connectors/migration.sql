-- CreateEnum
CREATE TYPE "bi_connector_provider" AS ENUM ('TABLEAU', 'POWER_BI');

-- CreateTable
CREATE TABLE "bi_connectors" (
    "id" TEXT NOT NULL,
    "space_id" TEXT NOT NULL,
    "provider" "bi_connector_provider" NOT NULL,
    "name" TEXT NOT NULL,
    "refresh_token" TEXT,
    "last_refreshed_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "dataset_config" JSONB NOT NULL DEFAULT '{}',
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bi_connectors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bi_connectors_space_id_idx" ON "bi_connectors"("space_id");

-- CreateIndex
CREATE INDEX "bi_connectors_created_by_id_idx" ON "bi_connectors"("created_by_id");

-- CreateIndex
CREATE INDEX "bi_connectors_provider_idx" ON "bi_connectors"("provider");

-- CreateIndex
CREATE INDEX "bi_connectors_is_active_idx" ON "bi_connectors"("is_active");

-- AddForeignKey
ALTER TABLE "bi_connectors" ADD CONSTRAINT "bi_connectors_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bi_connectors" ADD CONSTRAINT "bi_connectors_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "innovation_spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
