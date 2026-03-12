-- AlterEnum
ALTER TYPE "global_role" ADD VALUE 'EXTERNAL';

-- CreateEnum
CREATE TYPE "external_invitation_status" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "external_campaign_ids" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "external_invitations" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "inviter_user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" "external_invitation_status" NOT NULL DEFAULT 'PENDING',
    "campaign_ids" TEXT[],
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "external_invitations_token_key" ON "external_invitations"("token");

-- CreateIndex
CREATE INDEX "external_invitations_email_idx" ON "external_invitations"("email");

-- CreateIndex
CREATE INDEX "external_invitations_token_idx" ON "external_invitations"("token");

-- CreateIndex
CREATE INDEX "external_invitations_status_idx" ON "external_invitations"("status");

-- AddForeignKey
ALTER TABLE "external_invitations" ADD CONSTRAINT "external_invitations_inviter_user_id_fkey" FOREIGN KEY ("inviter_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
