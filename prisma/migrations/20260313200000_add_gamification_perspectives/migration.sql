-- CreateEnum
CREATE TYPE "thinking_hat_perspective" AS ENUM ('WHITE_FACTS', 'RED_EMOTION', 'BLACK_CAUTION', 'YELLOW_OPTIMISM', 'GREEN_CREATIVITY', 'BLUE_PROCESS');

-- CreateTable
CREATE TABLE "gamification_configs" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "idea_weight" INTEGER NOT NULL DEFAULT 5,
    "comment_weight" INTEGER NOT NULL DEFAULT 3,
    "like_weight" INTEGER NOT NULL DEFAULT 1,
    "evaluation_weight" INTEGER NOT NULL DEFAULT 4,
    "show_leaderboard" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gamification_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_scores" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "total_score" INTEGER NOT NULL DEFAULT 0,
    "ideas_count" INTEGER NOT NULL DEFAULT 0,
    "comments_count" INTEGER NOT NULL DEFAULT 0,
    "likes_count" INTEGER NOT NULL DEFAULT 0,
    "evaluations_count" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discussion_perspectives" (
    "id" TEXT NOT NULL,
    "comment_id" TEXT NOT NULL,
    "perspective" "thinking_hat_perspective" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discussion_perspectives_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gamification_configs_campaign_id_key" ON "gamification_configs"("campaign_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_scores_user_id_campaign_id_key" ON "user_scores"("user_id", "campaign_id");

-- CreateIndex
CREATE INDEX "user_scores_campaign_id_total_score_idx" ON "user_scores"("campaign_id", "total_score" DESC);

-- CreateIndex
CREATE INDEX "user_scores_user_id_idx" ON "user_scores"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "discussion_perspectives_comment_id_key" ON "discussion_perspectives"("comment_id");

-- CreateIndex
CREATE INDEX "discussion_perspectives_perspective_idx" ON "discussion_perspectives"("perspective");

-- AddForeignKey
ALTER TABLE "gamification_configs" ADD CONSTRAINT "gamification_configs_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_scores" ADD CONSTRAINT "user_scores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_scores" ADD CONSTRAINT "user_scores_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_perspectives" ADD CONSTRAINT "discussion_perspectives_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
