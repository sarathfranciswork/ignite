-- CreateEnum
CREATE TYPE "evaluation_mode" AS ENUM ('STANDARD', 'AD_HOC', 'ONE_TEAM');

-- CreateEnum
CREATE TYPE "submission_definition_status" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "submission_field_type" AS ENUM ('TEXT', 'TEXTAREA', 'NUMBER', 'SELECT', 'MULTI_SELECT', 'DATE', 'CHECKBOX', 'FILE', 'RICH_TEXT', 'URL');

-- CreateEnum
CREATE TYPE "generic_submission_status" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED');

-- AlterEnum
ALTER TYPE "evaluation_session_type" ADD VALUE 'AD_HOC';
ALTER TYPE "evaluation_session_type" ADD VALUE 'ONE_TEAM';

-- AlterTable: Make campaign_id optional and add new fields
ALTER TABLE "evaluation_sessions" ALTER COLUMN "campaign_id" DROP NOT NULL;
ALTER TABLE "evaluation_sessions" ADD COLUMN "mode" "evaluation_mode" NOT NULL DEFAULT 'STANDARD';
ALTER TABLE "evaluation_sessions" ADD COLUMN "is_collaborative" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "evaluation_sessions" ADD COLUMN "facilitator_id" TEXT;
ALTER TABLE "evaluation_sessions" ADD COLUMN "consensus_required" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "evaluation_sessions" ADD COLUMN "live_session_started" TIMESTAMP(3);
ALTER TABLE "evaluation_sessions" ADD COLUMN "live_session_ended" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "evaluation_sessions_mode_idx" ON "evaluation_sessions"("mode");

-- CreateTable: ConsensusNote
CREATE TABLE "consensus_notes" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "idea_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consensus_notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "consensus_notes_session_id_idx" ON "consensus_notes"("session_id");
CREATE INDEX "consensus_notes_session_id_idea_id_idx" ON "consensus_notes"("session_id", "idea_id");

-- AddForeignKey
ALTER TABLE "consensus_notes" ADD CONSTRAINT "consensus_notes_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "evaluation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: SubmissionDefinition
CREATE TABLE "submission_definitions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "submission_definition_status" NOT NULL DEFAULT 'DRAFT',
    "slug" TEXT NOT NULL,
    "campaign_id" TEXT,
    "is_global" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submission_definitions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "submission_definitions_slug_key" ON "submission_definitions"("slug");
CREATE INDEX "submission_definitions_campaign_id_idx" ON "submission_definitions"("campaign_id");
CREATE INDEX "submission_definitions_status_idx" ON "submission_definitions"("status");
CREATE INDEX "submission_definitions_created_by_id_idx" ON "submission_definitions"("created_by_id");

-- AddForeignKey
ALTER TABLE "submission_definitions" ADD CONSTRAINT "submission_definitions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: SubmissionField
CREATE TABLE "submission_fields" (
    "id" TEXT NOT NULL,
    "definition_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "field_key" TEXT NOT NULL,
    "field_type" "submission_field_type" NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "placeholder" TEXT,
    "help_text" TEXT,
    "options" JSONB,
    "validation" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submission_fields_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "submission_fields_definition_id_field_key_key" ON "submission_fields"("definition_id", "field_key");
CREATE INDEX "submission_fields_definition_id_idx" ON "submission_fields"("definition_id");
CREATE INDEX "submission_fields_definition_id_sort_order_idx" ON "submission_fields"("definition_id", "sort_order");

-- AddForeignKey
ALTER TABLE "submission_fields" ADD CONSTRAINT "submission_fields_definition_id_fkey" FOREIGN KEY ("definition_id") REFERENCES "submission_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: GenericSubmission
CREATE TABLE "generic_submissions" (
    "id" TEXT NOT NULL,
    "definition_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "generic_submission_status" NOT NULL DEFAULT 'DRAFT',
    "submitted_by_id" TEXT NOT NULL,
    "reviewed_by_id" TEXT,
    "review_note" TEXT,
    "submitted_at" TIMESTAMP(3),
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "generic_submissions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "generic_submissions_definition_id_idx" ON "generic_submissions"("definition_id");
CREATE INDEX "generic_submissions_submitted_by_id_idx" ON "generic_submissions"("submitted_by_id");
CREATE INDEX "generic_submissions_status_idx" ON "generic_submissions"("status");
CREATE INDEX "generic_submissions_definition_id_status_idx" ON "generic_submissions"("definition_id", "status");

-- AddForeignKey
ALTER TABLE "generic_submissions" ADD CONSTRAINT "generic_submissions_definition_id_fkey" FOREIGN KEY ("definition_id") REFERENCES "submission_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: SubmissionFieldValue
CREATE TABLE "submission_field_values" (
    "id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "field_id" TEXT NOT NULL,
    "text_value" TEXT,
    "number_value" DOUBLE PRECISION,
    "bool_value" BOOLEAN,
    "date_value" TIMESTAMP(3),
    "json_value" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submission_field_values_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "submission_field_values_submission_id_field_id_key" ON "submission_field_values"("submission_id", "field_id");
CREATE INDEX "submission_field_values_submission_id_idx" ON "submission_field_values"("submission_id");
CREATE INDEX "submission_field_values_field_id_idx" ON "submission_field_values"("field_id");

-- AddForeignKey
ALTER TABLE "submission_field_values" ADD CONSTRAINT "submission_field_values_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "generic_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "submission_field_values" ADD CONSTRAINT "submission_field_values_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "submission_fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Make idea_id optional on evaluation_session_ideas and add ad-hoc fields
ALTER TABLE "evaluation_session_ideas" ALTER COLUMN "idea_id" DROP NOT NULL;
ALTER TABLE "evaluation_session_ideas" ADD COLUMN "ad_hoc_title" TEXT;
ALTER TABLE "evaluation_session_ideas" ADD COLUMN "ad_hoc_description" TEXT;
