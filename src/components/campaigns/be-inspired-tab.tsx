"use client";

import { useState } from "react";
import type {
  BeInspiredContent,
  TrendCard,
  TechnologyCard,
  InsightCard,
  SiaSummary,
} from "@/types/campaign-sia";

// ============================================================
// "Be Inspired" Tab Component (Story 9.6)
//
// Displays strategic context from linked SIAs:
// - SIA descriptions
// - Related trends
// - Related technologies
// - Community insights
// ============================================================

type FilterType = "all" | "trends" | "technologies" | "insights";

interface BeInspiredTabProps {
  content: BeInspiredContent;
  isLoading?: boolean;
}

export function BeInspiredTab({ content, isLoading }: BeInspiredTabProps) {
  const [filter, setFilter] = useState<FilterType>("all");

  if (isLoading) {
    return <BeInspiredSkeleton />;
  }

  if (!content.hasSiaLinks) {
    return null;
  }

  const { sias, trends, technologies, insights } = content;
  const totalItems = trends.length + technologies.length + insights.length;

  return (
    <div className="space-y-8">
      {/* SIA Overview Section */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Strategic Innovation Areas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sias.map((sia) => (
            <SiaCard key={sia.id} sia={sia} />
          ))}
        </div>
      </section>

      {/* Filter Bar */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
        <span className="text-sm text-gray-500 mr-2">{totalItems} items</span>
        <FilterPill
          label="All"
          active={filter === "all"}
          onClick={() => setFilter("all")}
        />
        <FilterPill
          label={`Trends (${trends.length})`}
          active={filter === "trends"}
          onClick={() => setFilter("trends")}
        />
        <FilterPill
          label={`Technologies (${technologies.length})`}
          active={filter === "technologies"}
          onClick={() => setFilter("technologies")}
        />
        <FilterPill
          label={`Insights (${insights.length})`}
          active={filter === "insights"}
          onClick={() => setFilter("insights")}
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(filter === "all" || filter === "trends") &&
          trends.map((trend) => (
            <TrendCardComponent key={trend.id} trend={trend} />
          ))}
        {(filter === "all" || filter === "technologies") &&
          technologies.map((tech) => (
            <TechnologyCardComponent key={tech.id} technology={tech} />
          ))}
        {(filter === "all" || filter === "insights") &&
          insights.map((insight) => (
            <InsightCardComponent key={insight.id} insight={insight} />
          ))}
      </div>

      {totalItems === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg font-medium">No content yet</p>
          <p className="text-sm mt-1">
            Content will appear here as trends, technologies, and insights are
            linked to the strategic innovation areas.
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function SiaCard({ sia }: { sia: SiaSummary }) {
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
      <div className="flex items-start gap-3">
        {sia.imageUrl ? (
          <img
            src={sia.imageUrl}
            alt={sia.name}
            className="h-10 w-10 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-200 text-blue-700 font-semibold">
            {sia.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-blue-900 truncate">{sia.name}</h3>
          {sia.description && (
            <p className="text-sm text-blue-700 mt-1 line-clamp-2">
              {sia.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function TrendCardComponent({ trend }: { trend: TrendCard }) {
  return (
    <article
      className="rounded-lg border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow cursor-pointer"
      data-testid={`trend-card-${trend.id}`}
    >
      <div className="flex items-start gap-3">
        {trend.imageUrl && (
          <img
            src={trend.imageUrl}
            alt={trend.title}
            className="h-12 w-12 rounded-lg object-cover flex-shrink-0"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <TrendTypeBadge type={trend.type} />
            <span className="text-xs text-gray-400">{trend.siaName}</span>
          </div>
          <h3 className="font-medium text-gray-900 truncate">{trend.title}</h3>
          {trend.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {trend.description}
            </p>
          )}
          {trend.businessRelevance !== null && (
            <div className="flex items-center gap-1 mt-2">
              <span className="text-xs text-gray-500">Relevance:</span>
              <RelevanceBar value={trend.businessRelevance} />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function TechnologyCardComponent({
  technology,
}: {
  technology: TechnologyCard;
}) {
  return (
    <article
      className="rounded-lg border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow cursor-pointer"
      data-testid={`tech-card-${technology.id}`}
    >
      <div className="flex items-start gap-3">
        {technology.imageUrl && (
          <img
            src={technology.imageUrl}
            alt={technology.title}
            className="h-12 w-12 rounded-lg object-cover flex-shrink-0"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
              Technology
            </span>
            <span className="text-xs text-gray-400">{technology.siaName}</span>
          </div>
          <h3 className="font-medium text-gray-900 truncate">
            {technology.title}
          </h3>
          {technology.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {technology.description}
            </p>
          )}
          {technology.maturityLevel && (
            <span className="mt-2 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {technology.maturityLevel}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function InsightCardComponent({ insight }: { insight: InsightCard }) {
  return (
    <article
      className="rounded-lg border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow cursor-pointer"
      data-testid={`insight-card-${insight.id}`}
    >
      <div className="flex items-start gap-3">
        {insight.imageUrl && (
          <img
            src={insight.imageUrl}
            alt={insight.title}
            className="h-12 w-12 rounded-lg object-cover flex-shrink-0"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              Insight
            </span>
            <span className="text-xs text-gray-400">{insight.trendTitle}</span>
          </div>
          <h3 className="font-medium text-gray-900 truncate">
            {insight.title}
          </h3>
          {insight.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {insight.description}
            </p>
          )}
          {insight.sourceUrl && (
            <a
              href={insight.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center text-xs text-blue-600 hover:text-blue-800"
              onClick={(e) => e.stopPropagation()}
            >
              View source
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

function TrendTypeBadge({ type }: { type: TrendCard["type"] }) {
  const styles = {
    MEGA: "bg-red-100 text-red-700",
    MACRO: "bg-orange-100 text-orange-700",
    MICRO: "bg-green-100 text-green-700",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[type]}`}
    >
      {type.charAt(0) + type.slice(1).toLowerCase()} Trend
    </span>
  );
}

function RelevanceBar({ value }: { value: number }) {
  const percentage = Math.min(Math.max(value * 100, 0), 100);
  return (
    <div className="flex items-center gap-1">
      <div className="h-1.5 w-16 rounded-full bg-gray-200">
        <div
          className="h-1.5 rounded-full bg-blue-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-gray-500">{Math.round(percentage)}%</span>
    </div>
  );
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
        active
          ? "bg-blue-100 text-blue-800"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      {label}
    </button>
  );
}

function BeInspiredSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="space-y-4">
        <div className="h-6 w-48 bg-gray-200 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
      <div className="h-8 w-64 bg-gray-200 rounded" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
