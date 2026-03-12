"use client";

import { EvaluatorDashboard } from "@/components/evaluation/EvaluatorDashboard";
import { CheckSquare } from "lucide-react";

export default function TasksPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CheckSquare className="h-6 w-6 text-gray-400" />
        <h1 className="text-xl font-semibold text-gray-900">My Tasks</h1>
      </div>

      <EvaluatorDashboard />
    </div>
  );
}
