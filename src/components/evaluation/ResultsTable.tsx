"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, AlertTriangle, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface CriterionScore {
  criterionId: string;
  criterionTitle: string;
  weight: number;
  average: number;
  standardDeviation: number;
  responseCount: number;
  min: number | null;
  max: number | null;
}

interface IdeaResult {
  ideaId: string;
  ideaTitle: string;
  ideaTeaser: string | null;
  ideaStatus: string;
  weightedScore: number;
  criteriaScores: CriterionScore[];
}

interface PairwiseIdeaResult {
  ideaId: string;
  ideaTitle: string;
  ideaTeaser: string | null;
  ideaStatus: string;
  btScore: number;
  weightedScore: number;
  record: { wins: number; losses: number; ties: number };
  criteriaScores: Array<{
    criterionId: string;
    criterionTitle: string;
    score: number;
  }>;
}

interface Criterion {
  id: string;
  title: string;
  fieldType: string;
  weight: number;
}

type SortField = "rank" | "weightedScore" | "stdDev" | string;
type SortDirection = "asc" | "desc";

interface ResultsTableProps {
  type: "SCORECARD" | "PAIRWISE";
  results: IdeaResult[] | PairwiseIdeaResult[];
  criteria: Criterion[];
  controversialThreshold?: number;
  selectedIdeaIds?: Set<string>;
  onToggleSelection?: (ideaId: string) => void;
  onToggleShortlist?: (ideaId: string, isShortlisted: boolean) => void;
  shortlistLocked?: boolean;
}

const STD_DEV_THRESHOLD = 1.5;

export function ResultsTable({
  type,
  results,
  criteria,
  controversialThreshold = STD_DEV_THRESHOLD,
  selectedIdeaIds,
  onToggleSelection,
  onToggleShortlist,
  shortlistLocked,
}: ResultsTableProps) {
  const [sortField, setSortField] = React.useState<SortField>("weightedScore");
  const [sortDirection, setSortDirection] = React.useState<SortDirection>("desc");

  const handleSort = React.useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDirection("desc");
      }
    },
    [sortField],
  );

  const scoreCriteria = criteria.filter((c) => c.fieldType === "SELECTION_SCALE");

  const sortedResults = React.useMemo(() => {
    type ResultItem = IdeaResult | PairwiseIdeaResult;
    const sorted: ResultItem[] = [...results];
    const getSortValue = (item: ResultItem, idx: number): number => {
      if (sortField === "weightedScore") return item.weightedScore;
      if (sortField === "rank") return idx;
      if (sortField === "stdDev" && type === "SCORECARD") {
        const r = item as IdeaResult;
        return Math.max(...r.criteriaScores.map((c) => c.standardDeviation), 0);
      }
      if (type === "SCORECARD") {
        const r = item as IdeaResult;
        return r.criteriaScores.find((c) => c.criterionId === sortField)?.average ?? 0;
      }
      const r = item as PairwiseIdeaResult;
      return r.criteriaScores.find((c) => c.criterionId === sortField)?.score ?? 0;
    };

    const indexMap = new Map(sorted.map((item, i) => [item.ideaId, i]));
    sorted.sort((a, b) => {
      const aVal = getSortValue(a, indexMap.get(a.ideaId) ?? 0);
      const bVal = getSortValue(b, indexMap.get(b.ideaId) ?? 0);
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });
    return sorted;
  }, [results, sortField, sortDirection, type]);

  const SortHeader = ({
    field,
    children,
    className,
  }: {
    field: SortField;
    children: React.ReactNode;
    className?: string;
  }) => (
    <th className={cn("px-3 py-2 text-left text-xs font-medium text-gray-500", className)}>
      <button
        type="button"
        onClick={() => handleSort(field)}
        className="inline-flex items-center gap-1 hover:text-gray-900"
      >
        {children}
        {sortField === field ? (
          sortDirection === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </button>
    </th>
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {onToggleSelection && (
              <th className="w-10 px-3 py-2">
                <span className="sr-only">Select</span>
              </th>
            )}
            <SortHeader field="rank" className="w-12">
              #
            </SortHeader>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Idea</th>
            <SortHeader field="weightedScore">Score</SortHeader>
            {type === "SCORECARD" && <SortHeader field="stdDev">Controversy</SortHeader>}
            {type === "PAIRWISE" && (
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Record</th>
            )}
            {scoreCriteria.map((c) => (
              <SortHeader key={c.id} field={c.id}>
                {c.title}
              </SortHeader>
            ))}
            {onToggleShortlist && (
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Shortlist</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sortedResults.map((result, idx) => {
            const isControversial =
              type === "SCORECARD" &&
              (result as IdeaResult).criteriaScores.some(
                (c) => c.standardDeviation >= controversialThreshold,
              );

            return (
              <tr
                key={result.ideaId}
                className={cn(
                  "transition-colors hover:bg-gray-50",
                  selectedIdeaIds?.has(result.ideaId) && "bg-primary-50",
                  isControversial && "border-l-2 border-l-amber-400",
                )}
              >
                {onToggleSelection && (
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedIdeaIds?.has(result.ideaId) ?? false}
                      onChange={() => onToggleSelection(result.ideaId)}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </td>
                )}
                <td className="px-3 py-2 text-sm font-medium text-gray-400">{idx + 1}</td>
                <td className="max-w-xs px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="truncate text-sm font-medium text-gray-900">
                        {result.ideaTitle}
                      </p>
                      {result.ideaTeaser && (
                        <p className="truncate text-xs text-gray-400">{result.ideaTeaser}</p>
                      )}
                    </div>
                    {isControversial && (
                      <AlertTriangle
                        className="h-4 w-4 shrink-0 text-amber-500"
                        aria-label="Controversial - high standard deviation"
                      />
                    )}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <span className="text-sm font-semibold text-gray-900">
                    {result.weightedScore.toFixed(2)}
                  </span>
                </td>
                {type === "SCORECARD" && (
                  <td className="px-3 py-2">
                    <ControversyIndicator
                      criteriaScores={(result as IdeaResult).criteriaScores}
                      threshold={controversialThreshold}
                    />
                  </td>
                )}
                {type === "PAIRWISE" && (
                  <td className="px-3 py-2 text-xs text-gray-600">
                    {(result as PairwiseIdeaResult).record.wins}W /{" "}
                    {(result as PairwiseIdeaResult).record.losses}L /{" "}
                    {(result as PairwiseIdeaResult).record.ties}T
                  </td>
                )}
                {scoreCriteria.map((criterion) => {
                  if (type === "SCORECARD") {
                    const cs = (result as IdeaResult).criteriaScores.find(
                      (c) => c.criterionId === criterion.id,
                    );
                    return (
                      <td key={criterion.id} className="px-3 py-2">
                        <div className="text-sm text-gray-700">{cs?.average.toFixed(2) ?? "-"}</div>
                        {cs && cs.standardDeviation >= controversialThreshold && (
                          <div className="text-xs text-amber-600">
                            SD: {cs.standardDeviation.toFixed(2)}
                          </div>
                        )}
                      </td>
                    );
                  }
                  const cs = (result as PairwiseIdeaResult).criteriaScores.find(
                    (c) => c.criterionId === criterion.id,
                  );
                  return (
                    <td key={criterion.id} className="px-3 py-2 text-sm text-gray-700">
                      {cs?.score.toFixed(2) ?? "-"}
                    </td>
                  );
                })}
                {onToggleShortlist && (
                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() =>
                        onToggleShortlist(
                          result.ideaId,
                          selectedIdeaIds?.has(result.ideaId) ?? false,
                        )
                      }
                      disabled={shortlistLocked}
                      className={`transition-colors ${
                        shortlistLocked ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                      }`}
                      title={shortlistLocked ? "Shortlist is locked" : "Toggle shortlist"}
                    >
                      <Star
                        className={`h-5 w-5 ${
                          selectedIdeaIds?.has(result.ideaId)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300 hover:text-yellow-400"
                        }`}
                      />
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {sortedResults.length === 0 && (
        <div className="py-12 text-center text-sm text-gray-400">No results available yet.</div>
      )}
    </div>
  );
}

function ControversyIndicator({
  criteriaScores,
  threshold,
}: {
  criteriaScores: CriterionScore[];
  threshold: number;
}) {
  const maxStdDev = Math.max(...criteriaScores.map((c) => c.standardDeviation), 0);
  const isControversial = maxStdDev >= threshold;

  return (
    <div className="flex items-center gap-1.5">
      <div
        className={cn(
          "h-2 w-8 rounded-full",
          maxStdDev < threshold * 0.5 && "bg-emerald-300",
          maxStdDev >= threshold * 0.5 && maxStdDev < threshold && "bg-yellow-300",
          isControversial && "bg-amber-500",
        )}
      />
      <span
        className={cn("text-xs", isControversial ? "font-medium text-amber-600" : "text-gray-400")}
      >
        {maxStdDev.toFixed(2)}
      </span>
    </div>
  );
}
