"use client";

import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

interface ProcessAnalysisPanelProps {
  processDefinitionId: string;
}

export function ProcessAnalysisPanel({ processDefinitionId }: ProcessAnalysisPanelProps) {
  const analysisQuery = trpc.portfolioAnalyzer.processAnalysis.useQuery({
    processDefinitionId,
  });

  if (analysisQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-20 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
        <div className="h-64 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
      </div>
    );
  }

  if (analysisQuery.isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-600">Failed to load process analysis.</p>
      </div>
    );
  }

  const analysis = analysisQuery.data;
  if (!analysis) return null;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-base font-semibold text-gray-900">{analysis.processDefinitionName}</h3>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MetricBadge label="Projects" value={String(analysis.totalProjects)} />
          <MetricBadge
            label="Completion Rate"
            value={analysis.completionRate !== null ? `${analysis.completionRate}%` : "N/A"}
            variant={
              analysis.completionRate !== null
                ? analysis.completionRate >= 50
                  ? "success"
                  : "warning"
                : "neutral"
            }
          />
          <MetricBadge
            label="Termination Rate"
            value={analysis.terminationRate !== null ? `${analysis.terminationRate}%` : "N/A"}
            variant={
              analysis.terminationRate !== null
                ? analysis.terminationRate <= 20
                  ? "success"
                  : "danger"
                : "neutral"
            }
          />
          <MetricBadge label="Phases" value={String(analysis.phases.length)} />
        </div>
      </div>

      {analysis.phases.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-gray-900">Phase-by-Phase Metrics</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="pb-2 pr-4 font-medium text-gray-500">Phase</th>
                  <th className="pb-2 pr-4 text-right font-medium text-gray-500">Instances</th>
                  <th className="pb-2 pr-4 text-right font-medium text-gray-500">Avg Duration</th>
                  <th className="pb-2 pr-4 text-right font-medium text-gray-500">Gate Pass</th>
                  <th className="pb-2 pr-4 text-right font-medium text-gray-500">Rework</th>
                  <th className="pb-2 text-right font-medium text-gray-500">Termination</th>
                </tr>
              </thead>
              <tbody>
                {analysis.phases.map((phase) => {
                  const isBottleneck = isPhaseBottleneck(phase, analysis.phases);
                  return (
                    <tr
                      key={phase.phaseId}
                      className={cn("border-b border-gray-100", isBottleneck && "bg-amber-50")}
                    >
                      <td className="py-2.5 pr-4 font-medium text-gray-900">
                        {phase.phaseName}
                        {isBottleneck && (
                          <span className="ml-2 rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                            Bottleneck
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-right text-gray-600">
                        {phase.instanceCount}
                      </td>
                      <td className="py-2.5 pr-4 text-right text-gray-600">
                        {phase.averageDurationDays !== null ? `${phase.averageDurationDays}d` : "-"}
                      </td>
                      <td className="py-2.5 pr-4 text-right">
                        <RateBadge value={phase.gatePassRate} goodThreshold={70} />
                      </td>
                      <td className="py-2.5 pr-4 text-right">
                        <RateBadge value={phase.reworkRate} goodThreshold={20} invert />
                      </td>
                      <td className="py-2.5 text-right">
                        <RateBadge value={phase.terminationRate} goodThreshold={10} invert />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

interface PhaseData {
  averageDurationDays: number | null;
  reworkRate: number | null;
}

function isPhaseBottleneck(phase: PhaseData, allPhases: PhaseData[]): boolean {
  const phasesWithDuration = allPhases.filter((p) => p.averageDurationDays !== null);
  if (phasesWithDuration.length < 2) return false;

  const maxDuration = Math.max(...phasesWithDuration.map((p) => p.averageDurationDays ?? 0));
  const isLongest = phase.averageDurationDays === maxDuration && maxDuration > 0;

  const phasesWithRework = allPhases.filter((p) => p.reworkRate !== null);
  const maxRework = Math.max(...phasesWithRework.map((p) => p.reworkRate ?? 0));
  const isHighestRework = phase.reworkRate === maxRework && maxRework > 30;

  return isLongest || isHighestRework;
}

function MetricBadge({
  label,
  value,
  variant = "neutral",
}: {
  label: string;
  value: string;
  variant?: "success" | "warning" | "danger" | "neutral";
}) {
  return (
    <div className="text-center">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p
        className={cn(
          "mt-1 text-lg font-bold",
          variant === "success" && "text-emerald-600",
          variant === "warning" && "text-amber-600",
          variant === "danger" && "text-red-600",
          variant === "neutral" && "text-gray-900",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function RateBadge({
  value,
  goodThreshold,
  invert = false,
}: {
  value: number | null;
  goodThreshold: number;
  invert?: boolean;
}) {
  if (value === null) return <span className="text-gray-400">-</span>;

  const isGood = invert ? value <= goodThreshold : value >= goodThreshold;

  return (
    <span className={cn("text-xs font-semibold", isGood ? "text-emerald-600" : "text-red-600")}>
      {value}%
    </span>
  );
}
