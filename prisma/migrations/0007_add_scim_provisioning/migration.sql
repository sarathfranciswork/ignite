-- AlterTable: Add SCIM external ID to users
ALTER TABLE "users" ADD COLUMN "scim_external_id" TEXT;

-- CreateIndex: Unique index on scim_external_id
CREATE UNIQUE INDEX "users_scim_external_id_key" ON "users"("scim_external_id");

-- CreateTable: SCIM tokens for API authentication
CREATE TABLE "scim_tokens" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "last_used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scim_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Index on token_hash for lookup
CREATE INDEX "scim_tokens_token_hash_idx" ON "scim_tokens"("token_hash");

-- CreateIndex: Index on created_by_id
CREATE INDEX "scim_tokens_created_by_id_idx" ON "scim_tokens"("created_by_id");

-- AddForeignKey
ALTER TABLE "scim_tokens" ADD CONSTRAINT "scim_tokens_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
