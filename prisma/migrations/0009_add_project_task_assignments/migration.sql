-- CreateEnum
CREATE TYPE "project_task_status" AS ENUM ('TODO', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "project_task_assignments" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "phase_id" TEXT NOT NULL,
    "assignee_id" TEXT,
    "status" "project_task_status" NOT NULL DEFAULT 'TODO',
    "due_date" TIMESTAMP(3),
    "text_value" TEXT,
    "number_value" DOUBLE PRECISION,
    "date_value" TIMESTAMP(3),
    "keyword_value" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "file_url" TEXT,
    "user_value" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_task_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_task_assignments_project_id_idx" ON "project_task_assignments"("project_id");

-- CreateIndex
CREATE INDEX "project_task_assignments_task_id_idx" ON "project_task_assignments"("task_id");

-- CreateIndex
CREATE INDEX "project_task_assignments_phase_id_idx" ON "project_task_assignments"("phase_id");

-- CreateIndex
CREATE INDEX "project_task_assignments_assignee_id_idx" ON "project_task_assignments"("assignee_id");

-- CreateIndex
CREATE INDEX "project_task_assignments_status_idx" ON "project_task_assignments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "project_task_assignments_project_id_task_id_key" ON "project_task_assignments"("project_id", "task_id");

-- AddForeignKey
ALTER TABLE "project_task_assignments" ADD CONSTRAINT "project_task_assignments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_task_assignments" ADD CONSTRAINT "project_task_assignments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "process_phase_activity_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_task_assignments" ADD CONSTRAINT "project_task_assignments_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "process_phases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_task_assignments" ADD CONSTRAINT "project_task_assignments_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
