-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateEnum
CREATE TYPE "global_role" AS ENUM ('PLATFORM_ADMIN', 'INNOVATION_MANAGER', 'MEMBER');

-- CreateEnum
CREATE TYPE "notification_frequency" AS ENUM ('IMMEDIATE', 'DAILY', 'WEEKLY');

-- CreateEnum
CREATE TYPE "resource_role_type" AS ENUM ('CAMPAIGN_MANAGER', 'CAMPAIGN_COACH', 'CAMPAIGN_CONTRIBUTOR', 'CAMPAIGN_MODERATOR', 'CAMPAIGN_EVALUATOR', 'CAMPAIGN_SEEDER', 'CHANNEL_MANAGER', 'CHANNEL_CONTRIBUTOR');

-- CreateEnum
CREATE TYPE "coach_assignment_mode" AS ENUM ('GLOBAL', 'PER_CATEGORY');

-- CreateEnum
CREATE TYPE "space_status" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "space_role" AS ENUM ('SPACE_ADMIN', 'SPACE_MANAGER', 'SPACE_MEMBER');

-- CreateEnum
CREATE TYPE "campaign_status" AS ENUM ('DRAFT', 'SEEDING', 'SUBMISSION', 'DISCUSSION_VOTING', 'EVALUATION', 'CLOSED');

-- CreateEnum
CREATE TYPE "submission_type" AS ENUM ('CALL_FOR_IDEAS', 'CALL_FOR_PROPOSALS', 'CALL_FOR_GENERIC');

-- CreateEnum
CREATE TYPE "setup_type" AS ENUM ('SIMPLE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "audience_type" AS ENUM ('ALL_INTERNAL', 'SELECTED_INTERNAL', 'ALL_EXTERNAL', 'SELECTED_EXTERNAL', 'MIXED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified" TIMESTAMP(3),
    "name" TEXT,
    "image" TEXT,
    "password" TEXT,
    "global_role" "global_role" NOT NULL DEFAULT 'MEMBER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "bio" TEXT,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notification_frequency" "notification_frequency" NOT NULL DEFAULT 'IMMEDIATE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "resource_roles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "role" "resource_role_type" NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" TEXT,

    CONSTRAINT "resource_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_units" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parent_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_org_units" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "org_unit_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_org_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_group_memberships" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_group_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "innovation_spaces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT NOT NULL,
    "logo_url" TEXT,
    "status" "space_status" NOT NULL DEFAULT 'ACTIVE',
    "settings" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "innovation_spaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "innovation_space_memberships" (
    "id" TEXT NOT NULL,
    "space_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "space_role" NOT NULL DEFAULT 'SPACE_MEMBER',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "innovation_space_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "teaser" TEXT,
    "description" TEXT,
    "banner_url" TEXT,
    "video_url" TEXT,
    "status" "campaign_status" NOT NULL DEFAULT 'DRAFT',
    "previous_status" "campaign_status",
    "submission_type" "submission_type" NOT NULL DEFAULT 'CALL_FOR_IDEAS',
    "setup_type" "setup_type" NOT NULL DEFAULT 'SIMPLE',
    "audience_type" "audience_type" NOT NULL DEFAULT 'ALL_INTERNAL',
    "submission_close_date" TIMESTAMP(3),
    "voting_close_date" TIMESTAMP(3),
    "planned_close_date" TIMESTAMP(3),
    "launched_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "has_seeding_phase" BOOLEAN NOT NULL DEFAULT true,
    "has_discussion_phase" BOOLEAN NOT NULL DEFAULT true,
    "has_community_graduation" BOOLEAN NOT NULL DEFAULT true,
    "has_qualification_phase" BOOLEAN NOT NULL DEFAULT false,
    "has_voting" BOOLEAN NOT NULL DEFAULT false,
    "has_likes" BOOLEAN NOT NULL DEFAULT true,
    "has_idea_coach" BOOLEAN NOT NULL DEFAULT false,
    "is_confidential_allowed" BOOLEAN NOT NULL DEFAULT false,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "is_show_on_start_page" BOOLEAN NOT NULL DEFAULT true,
    "coach_assignment_mode" "coach_assignment_mode" NOT NULL DEFAULT 'GLOBAL',
    "idea_categories" JSONB,
    "graduation_visitors" INTEGER NOT NULL DEFAULT 10,
    "graduation_commenters" INTEGER NOT NULL DEFAULT 5,
    "graduation_likes" INTEGER NOT NULL DEFAULT 0,
    "graduation_voters" INTEGER NOT NULL DEFAULT 0,
    "graduation_voting_level" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "graduation_days_in_status" INTEGER NOT NULL DEFAULT 0,
    "voting_criteria" JSONB,
    "custom_fields" JSONB,
    "settings" JSONB,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_members" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "resource_role_type" NOT NULL,
    "category" TEXT,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" TEXT,

    CONSTRAINT "campaign_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE INDEX "resource_roles_user_id_idx" ON "resource_roles"("user_id");

-- CreateIndex
CREATE INDEX "resource_roles_resource_id_idx" ON "resource_roles"("resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "resource_roles_user_id_resource_id_role_key" ON "resource_roles"("user_id", "resource_id", "role");

-- CreateIndex
CREATE INDEX "user_org_units_user_id_idx" ON "user_org_units"("user_id");

-- CreateIndex
CREATE INDEX "user_org_units_org_unit_id_idx" ON "user_org_units"("org_unit_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_org_units_user_id_org_unit_id_key" ON "user_org_units"("user_id", "org_unit_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_groups_name_key" ON "user_groups"("name");

-- CreateIndex
CREATE UNIQUE INDEX "user_group_memberships_user_id_group_id_key" ON "user_group_memberships"("user_id", "group_id");

-- CreateIndex
CREATE UNIQUE INDEX "innovation_spaces_slug_key" ON "innovation_spaces"("slug");

-- CreateIndex
CREATE INDEX "innovation_spaces_status_idx" ON "innovation_spaces"("status");

-- CreateIndex
CREATE INDEX "innovation_spaces_slug_idx" ON "innovation_spaces"("slug");

-- CreateIndex
CREATE INDEX "innovation_space_memberships_space_id_idx" ON "innovation_space_memberships"("space_id");

-- CreateIndex
CREATE INDEX "innovation_space_memberships_user_id_idx" ON "innovation_space_memberships"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "innovation_space_memberships_space_id_user_id_key" ON "innovation_space_memberships"("space_id", "user_id");

-- CreateIndex
CREATE INDEX "campaigns_status_idx" ON "campaigns"("status");

-- CreateIndex
CREATE INDEX "campaigns_submission_type_idx" ON "campaigns"("submission_type");

-- CreateIndex
CREATE INDEX "campaigns_created_by_id_idx" ON "campaigns"("created_by_id");

-- CreateIndex
CREATE INDEX "campaign_members_campaign_id_idx" ON "campaign_members"("campaign_id");

-- CreateIndex
CREATE INDEX "campaign_members_user_id_idx" ON "campaign_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_members_campaign_id_user_id_role_key" ON "campaign_members"("campaign_id", "user_id", "role");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_units" ADD CONSTRAINT "org_units_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "org_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_org_units" ADD CONSTRAINT "user_org_units_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_org_units" ADD CONSTRAINT "user_org_units_org_unit_id_fkey" FOREIGN KEY ("org_unit_id") REFERENCES "org_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_group_memberships" ADD CONSTRAINT "user_group_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_group_memberships" ADD CONSTRAINT "user_group_memberships_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "user_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "innovation_space_memberships" ADD CONSTRAINT "innovation_space_memberships_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "innovation_spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "innovation_space_memberships" ADD CONSTRAINT "innovation_space_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_members" ADD CONSTRAINT "campaign_members_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_members" ADD CONSTRAINT "campaign_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

