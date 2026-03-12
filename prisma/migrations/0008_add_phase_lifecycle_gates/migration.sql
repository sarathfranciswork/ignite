-- CreateEnum
CREATE TYPE "phase_instance_status" AS ENUM ('ELABORATION', 'GATE_REVIEW', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "gate_decision_type" AS ENUM ('FORWARD', 'REWORK', 'POSTPONE', 'TERMINATE');

-- CreateTable
CREATE TABLE "project_phase_instances" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "phase_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "status" "phase_instance_status" NOT NULL DEFAULT 'ELABORATION',
    "planned_start_at" TIMESTAMP(3),
    "planned_end_at" TIMESTAMP(3),
    "actual_start_at" TIMESTAMP(3),
    "actual_end_at" TIMESTAMP(3),
    "rework_feedback" TEXT,
    "postpone_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_phase_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gate_decisions" (
    "id" TEXT NOT NULL,
    "phase_instance_id" TEXT NOT NULL,
    "gatekeeper_id" TEXT NOT NULL,
    "decision" "gate_decision_type" NOT NULL,
    "feedback" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gate_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_phase_instances_project_id_idx" ON "project_phase_instances"("project_id");

-- CreateIndex
CREATE INDEX "project_phase_instances_phase_id_idx" ON "project_phase_instances"("phase_id");

-- CreateIndex
CREATE INDEX "project_phase_instances_status_idx" ON "project_phase_instances"("status");

-- CreateIndex
CREATE UNIQUE INDEX "project_phase_instances_project_id_phase_id_key" ON "project_phase_instances"("project_id", "phase_id");

-- CreateIndex
CREATE INDEX "gate_decisions_phase_instance_id_idx" ON "gate_decisions"("phase_instance_id");

-- CreateIndex
CREATE INDEX "gate_decisions_gatekeeper_id_idx" ON "gate_decisions"("gatekeeper_id");

-- AddForeignKey
ALTER TABLE "project_phase_instances" ADD CONSTRAINT "project_phase_instances_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_phase_instances" ADD CONSTRAINT "project_phase_instances_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "process_phases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gate_decisions" ADD CONSTRAINT "gate_decisions_phase_instance_id_fkey" FOREIGN KEY ("phase_instance_id") REFERENCES "project_phase_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gate_decisions" ADD CONSTRAINT "gate_decisions_gatekeeper_id_fkey" FOREIGN KEY ("gatekeeper_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
