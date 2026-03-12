-- CreateEnum
CREATE TYPE "shortlist_forward_destination" AS ENUM ('IMPLEMENTATION', 'CONCEPT', 'ARCHIVE');

-- CreateTable
CREATE TABLE "shortlists" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" TEXT NOT NULL,
    "locked_by_id" TEXT,
    "locked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shortlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shortlist_entries" (
    "id" TEXT NOT NULL,
    "shortlist_id" TEXT NOT NULL,
    "idea_id" TEXT NOT NULL,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "forwarded_to" "shortlist_forward_destination",
    "forwarded_at" TIMESTAMP(3),
    "forwarded_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shortlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shortlists_session_id_key" ON "shortlists"("session_id");

-- CreateIndex
CREATE INDEX "shortlists_session_id_idx" ON "shortlists"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "shortlist_entries_shortlist_id_idea_id_key" ON "shortlist_entries"("shortlist_id", "idea_id");

-- CreateIndex
CREATE INDEX "shortlist_entries_shortlist_id_idx" ON "shortlist_entries"("shortlist_id");

-- CreateIndex
CREATE INDEX "shortlist_entries_idea_id_idx" ON "shortlist_entries"("idea_id");

-- AddForeignKey
ALTER TABLE "shortlists" ADD CONSTRAINT "shortlists_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "evaluation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shortlist_entries" ADD CONSTRAINT "shortlist_entries_shortlist_id_fkey" FOREIGN KEY ("shortlist_id") REFERENCES "shortlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shortlist_entries" ADD CONSTRAINT "shortlist_entries_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
