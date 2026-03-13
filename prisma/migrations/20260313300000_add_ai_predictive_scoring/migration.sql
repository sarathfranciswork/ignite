-- CreateEnum
CREATE TYPE "auto_tag_source" AS ENUM ('AI_CATEGORIZATION', 'AI_EXTRACTION');

-- CreateTable
CREATE TABLE "predictive_scores" (
    "id" TEXT NOT NULL,
    "idea_id" TEXT NOT NULL,
    "overall_score" DOUBLE PRECISION NOT NULL,
    "feasibility_score" DOUBLE PRECISION NOT NULL,
    "impact_score" DOUBLE PRECISION NOT NULL,
    "alignment_score" DOUBLE PRECISION NOT NULL,
    "confidence_level" DOUBLE PRECISION NOT NULL,
    "reasoning" TEXT NOT NULL,
    "model_version" TEXT NOT NULL,
    "scored_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "predictive_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auto_tags" (
    "id" TEXT NOT NULL,
    "idea_id" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "source" "auto_tag_source" NOT NULL,
    "is_accepted" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auto_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scouting_recommendations" (
    "id" TEXT NOT NULL,
    "sia_id" TEXT NOT NULL,
    "organization_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "relevance_score" DOUBLE PRECISION NOT NULL,
    "reasoning" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "is_dismissed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scouting_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "predictive_scores_idea_id_idx" ON "predictive_scores"("idea_id");

-- CreateIndex
CREATE INDEX "predictive_scores_idea_id_scored_at_idx" ON "predictive_scores"("idea_id", "scored_at" DESC);

-- CreateIndex
CREATE INDEX "predictive_scores_overall_score_idx" ON "predictive_scores"("overall_score" DESC);

-- CreateIndex
CREATE INDEX "auto_tags_idea_id_idx" ON "auto_tags"("idea_id");

-- CreateIndex
CREATE INDEX "auto_tags_idea_id_source_idx" ON "auto_tags"("idea_id", "source");

-- CreateIndex
CREATE INDEX "auto_tags_tag_idx" ON "auto_tags"("tag");

-- CreateIndex
CREATE INDEX "scouting_recommendations_sia_id_idx" ON "scouting_recommendations"("sia_id");

-- CreateIndex
CREATE INDEX "scouting_recommendations_sia_id_relevance_score_idx" ON "scouting_recommendations"("sia_id", "relevance_score" DESC);

-- CreateIndex
CREATE INDEX "scouting_recommendations_organization_id_idx" ON "scouting_recommendations"("organization_id");

-- CreateIndex
CREATE INDEX "scouting_recommendations_is_dismissed_idx" ON "scouting_recommendations"("is_dismissed");

-- AddForeignKey
ALTER TABLE "predictive_scores" ADD CONSTRAINT "predictive_scores_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_tags" ADD CONSTRAINT "auto_tags_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scouting_recommendations" ADD CONSTRAINT "scouting_recommendations_sia_id_fkey" FOREIGN KEY ("sia_id") REFERENCES "strategic_innovation_areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scouting_recommendations" ADD CONSTRAINT "scouting_recommendations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
