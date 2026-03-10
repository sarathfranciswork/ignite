"use client";

import type { InsightSummary } from "@/types/insight";
import { InsightTypeBadge } from "./insight-type-badge";

interface InsightCardProps {
  insight: InsightSummary;
  onClick?: (id: string) => void;
}

/**
 * Insight card for the insights feed.
 * Displays title, type badge, author, date, linked trend/campaign, and content excerpt.
 */
export function InsightCard({ insight, onClick }: InsightCardProps) {
  const excerpt =
    insight.content.length > 200
      ? `${insight.content.slice(0, 200)}…`
      : insight.content;

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(insight.createdAt));

  return (
    <article
      className="group cursor-pointer rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
      onClick={() => onClick?.(insight.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.(insight.id);
        }
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <InsightTypeBadge type={insight.insightType} />
            {insight.linkedTrend && (
              <span className="truncate text-xs text-indigo-600 dark:text-indigo-400">
                Trend: {insight.linkedTrend.title}
              </span>
            )}
            {insight.linkedCampaign && (
              <span className="truncate text-xs text-purple-600 dark:text-purple-400">
                Campaign: {insight.linkedCampaign.title}
              </span>
            )}
          </div>

          <h3 className="text-base font-semibold text-gray-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
            {insight.title}
          </h3>

          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {excerpt}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1.5">
          {insight.author.avatarUrl ? (
            <img
              src={insight.author.avatarUrl}
              alt=""
              className="h-5 w-5 rounded-full"
            />
          ) : (
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-medium text-indigo-600">
              {insight.author.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span>{insight.author.name}</span>
        </div>
        <span>{formattedDate}</span>
        {insight.sourceUrl && (
          <a
            href={insight.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-500 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            Source
          </a>
        )}
      </div>
    </article>
  );
}
