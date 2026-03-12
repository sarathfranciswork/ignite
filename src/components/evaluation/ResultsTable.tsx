"use client";

import * as React from "react";
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, Star } from "lucide-react";

interface CriteriaScore {
  criterionId: string;
  criterionTitle: string;
  weight: number;
  average: number;
  normalizedAverage: number;
  standardDeviation: number;
  isControversial: boolean;
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
  normalizedScore: number;
  overallStdDev: number;
  isControversial: boolean;
  isShortlisted: boolean;
  rank: number;
  criteriaScores: CriteriaScore[];
}

interface CriterionInfo {
  id: string;
  title: string;
  fieldType: string;
  weight: number;
}

type SortField = "rank" | "weightedScore" | "normalizedScore" | "stdDev" | string;
type SortDirection = "asc" | "desc";

interface ResultsTableProps {
  results: IdeaResult[];
  criteria: CriterionInfo[];
  onToggleShortlist?: (ideaId: string, isShortlisted: boolean) => void;
  shortlistLocked?: boolean;
}

export function ResultsTable({
  results,
  criteria,
  onToggleShortlist,
  shortlistLocked,
}: ResultsTableProps) {
  const [sortField, setSortField] = React.useState<SortField>("rank");
  const [sortDirection, setSortDirection] = React.useState<SortDirection>("asc");

  const scoreCriteria = criteria.filter((c) => c.fieldType === "SELECTION_SCALE");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(field === "rank" ? "asc" : "desc");
    }
  };

  const sortedResults = React.useMemo(() => {
    const sorted = [...results];
    sorted.sort((a, b) => {
      let aVal: number;
      let bVal: number;

      switch (sortField) {
        case "rank":
          aVal = a.rank;
          bVal = b.rank;
          break;
        case "weightedScore":
          aVal = a.weightedScore;
          bVal = b.weightedScore;
          break;
        case "normalizedScore":
          aVal = a.normalizedScore;
          bVal = b.normalizedScore;
          break;
        case "stdDev":
          aVal = a.overallStdDev;
          bVal = b.overallStdDev;
          break;
        default: {
          const aCrit = a.criteriaScores.find((c) => c.criterionId === sortField);
          const bCrit = b.criteriaScores.find((c) => c.criterionId === sortField);
          aVal = aCrit?.average ?? 0;
          bVal = bCrit?.average ?? 0;
          break;
        }
      }

      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });
    return sorted;
  }, [results, sortField, sortDirection]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-40" />;
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 inline h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 inline h-3 w-3" />
    );
  };

  if (results.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-gray-500">
        No evaluation responses yet. Results will appear once evaluators submit their scores.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th
              className="cursor-pointer px-3 py-2 text-left font-medium text-gray-600"
              onClick={() => handleSort("rank")}
            >
              # <SortIcon field="rank" />
            </th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">Idea</th>
            <th
              className="cursor-pointer px-3 py-2 text-right font-medium text-gray-600"
              onClick={() => handleSort("weightedScore")}
            >
              Score <SortIcon field="weightedScore" />
            </th>
            <th
              className="cursor-pointer px-3 py-2 text-right font-medium text-gray-600"
              onClick={() => handleSort("normalizedScore")}
            >
              Normalized <SortIcon field="normalizedScore" />
            </th>
            {scoreCriteria.map((c) => (
              <th
                key={c.id}
                className="cursor-pointer px-3 py-2 text-right font-medium text-gray-600"
                onClick={() => handleSort(c.id)}
                title={`${c.title} (weight: ${c.weight})`}
              >
                {c.title.length > 15 ? `${c.title.slice(0, 15)}...` : c.title}
                <SortIcon field={c.id} />
              </th>
            ))}
            <th
              className="cursor-pointer px-3 py-2 text-right font-medium text-gray-600"
              onClick={() => handleSort("stdDev")}
            >
              Std Dev <SortIcon field="stdDev" />
            </th>
            {onToggleShortlist && (
              <th className="px-3 py-2 text-center font-medium text-gray-600">Shortlist</th>
            )}
          </tr>
        </thead>
        <tbody>
          {sortedResults.map((result) => (
            <tr
              key={result.ideaId}
              className={`border-b border-gray-100 hover:bg-gray-50 ${
                result.isShortlisted ? "bg-yellow-50" : ""
              }`}
            >
              <td className="px-3 py-2 text-gray-500">{result.rank}</td>
              <td className="max-w-[200px] px-3 py-2">
                <div className="truncate font-medium text-gray-900" title={result.ideaTitle}>
                  {result.ideaTitle}
                </div>
                {result.ideaTeaser && (
                  <div className="truncate text-xs text-gray-500">{result.ideaTeaser}</div>
                )}
              </td>
              <td className="px-3 py-2 text-right font-mono text-gray-900">
                {result.weightedScore.toFixed(2)}
              </td>
              <td className="px-3 py-2 text-right font-mono text-gray-700">
                {result.normalizedScore.toFixed(1)}%
              </td>
              {scoreCriteria.map((c) => {
                const cs = result.criteriaScores.find((s) => s.criterionId === c.id);
                return (
                  <td key={c.id} className="px-3 py-2 text-right font-mono">
                    <span className={cs?.isControversial ? "text-amber-600" : "text-gray-700"}>
                      {cs?.average.toFixed(2) ?? "-"}
                    </span>
                    {cs?.isControversial && (
                      <span title={`Controversial: std dev ${cs.standardDeviation.toFixed(2)}`}>
                        <AlertTriangle className="ml-1 inline h-3 w-3 text-amber-500" />
                      </span>
                    )}
                  </td>
                );
              })}
              <td className="px-3 py-2 text-right font-mono">
                <span className={result.isControversial ? "text-amber-600" : "text-gray-500"}>
                  {result.overallStdDev.toFixed(2)}
                </span>
                {result.isControversial && (
                  <AlertTriangle className="ml-1 inline h-3 w-3 text-amber-500" />
                )}
              </td>
              {onToggleShortlist && (
                <td className="px-3 py-2 text-center">
                  <button
                    type="button"
                    onClick={() => onToggleShortlist(result.ideaId, result.isShortlisted)}
                    disabled={shortlistLocked}
                    className={`transition-colors ${
                      shortlistLocked ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                    }`}
                    title={
                      shortlistLocked
                        ? "Shortlist is locked"
                        : result.isShortlisted
                          ? "Remove from shortlist"
                          : "Add to shortlist"
                    }
                  >
                    <Star
                      className={`h-5 w-5 ${
                        result.isShortlisted
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300 hover:text-yellow-400"
                      }`}
                    />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
