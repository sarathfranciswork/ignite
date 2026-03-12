"use client";

import { trpc } from "@/lib/trpc";
import { Compass, TrendingUp, Cpu, Lightbulb, ExternalLink } from "lucide-react";

interface BeInspiredTabProps {
  campaignId: string;
}

export function BeInspiredTab({ campaignId }: BeInspiredTabProps) {
  const beInspiredQuery = trpc.campaign.getBeInspired.useQuery(
    { campaignId },
    { enabled: !!campaignId },
  );

  if (beInspiredQuery.isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    );
  }

  if (beInspiredQuery.isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-600">Failed to load Be Inspired content.</p>
      </div>
    );
  }

  const data = beInspiredQuery.data;

  if (!data || data.sias.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
        <Compass className="mx-auto h-12 w-12 text-gray-300" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">No Strategic Alignment</h3>
        <p className="mt-2 text-sm text-gray-500">
          Link this campaign to Strategic Innovation Areas to show related trends, technologies, and
          insights.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <SiaSection sias={data.sias} />
      {data.trends.length > 0 && <TrendSection trends={data.trends} />}
      {data.technologies.length > 0 && <TechnologySection technologies={data.technologies} />}
      {data.insights.length > 0 && <InsightSection insights={data.insights} />}
    </div>
  );
}

function SiaSection({
  sias,
}: {
  sias: Array<{
    id: string;
    name: string;
    description: string | null;
    color: string | null;
    bannerUrl: string | null;
  }>;
}) {
  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
        <Compass className="h-5 w-5 text-primary-600" />
        Strategic Innovation Areas
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {sias.map((sia) => (
          <div key={sia.id} className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-3">
              {sia.color && (
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: sia.color }} />
              )}
              <h3 className="font-semibold text-gray-900">{sia.name}</h3>
            </div>
            {sia.description && (
              <p className="mt-2 line-clamp-3 text-sm text-gray-600">{sia.description}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function TrendSection({
  trends,
}: {
  trends: Array<{
    id: string;
    title: string;
    description: string | null;
    imageUrl: string | null;
    sourceUrl: string | null;
    type: string;
  }>;
}) {
  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
        <TrendingUp className="h-5 w-5 text-blue-600" />
        Related Trends
        <span className="ml-1 text-sm font-normal text-gray-500">({trends.length})</span>
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {trends.map((trend) => (
          <ContentCard
            key={trend.id}
            title={trend.title}
            description={trend.description}
            badge={formatTrendType(trend.type)}
            badgeColor="bg-blue-100 text-blue-700"
            sourceUrl={trend.sourceUrl}
          />
        ))}
      </div>
    </section>
  );
}

function TechnologySection({
  technologies,
}: {
  technologies: Array<{
    id: string;
    title: string;
    description: string | null;
    imageUrl: string | null;
    sourceUrl: string | null;
    maturityLevel: string;
  }>;
}) {
  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
        <Cpu className="h-5 w-5 text-emerald-600" />
        Related Technologies
        <span className="ml-1 text-sm font-normal text-gray-500">({technologies.length})</span>
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {technologies.map((tech) => (
          <ContentCard
            key={tech.id}
            title={tech.title}
            description={tech.description}
            badge={formatMaturityLevel(tech.maturityLevel)}
            badgeColor="bg-emerald-100 text-emerald-700"
            sourceUrl={tech.sourceUrl}
          />
        ))}
      </div>
    </section>
  );
}

function InsightSection({
  insights,
}: {
  insights: Array<{
    id: string;
    title: string;
    description: string | null;
    type: string;
    scope: string;
    sourceUrl: string | null;
  }>;
}) {
  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
        <Lightbulb className="h-5 w-5 text-amber-600" />
        Community Insights
        <span className="ml-1 text-sm font-normal text-gray-500">({insights.length})</span>
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {insights.map((insight) => (
          <ContentCard
            key={insight.id}
            title={insight.title}
            description={insight.description}
            badge={formatInsightType(insight.type)}
            badgeColor="bg-amber-100 text-amber-700"
            sourceUrl={insight.sourceUrl}
          />
        ))}
      </div>
    </section>
  );
}

interface ContentCardProps {
  title: string;
  description: string | null;
  badge: string;
  badgeColor: string;
  sourceUrl: string | null;
}

function ContentCard({ title, description, badge, badgeColor, sourceUrl }: ContentCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 text-gray-400 hover:text-gray-600"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
      <span
        className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${badgeColor}`}
      >
        {badge}
      </span>
      {description && <p className="mt-2 line-clamp-2 text-xs text-gray-600">{description}</p>}
    </div>
  );
}

function formatTrendType(type: string): string {
  const labels: Record<string, string> = {
    MEGA: "Mega Trend",
    MACRO: "Macro Trend",
    MICRO: "Micro Trend",
  };
  return labels[type] ?? type;
}

function formatMaturityLevel(level: string): string {
  const labels: Record<string, string> = {
    EMERGING: "Emerging",
    GROWING: "Growing",
    MATURE: "Mature",
    DECLINING: "Declining",
  };
  return labels[level] ?? level;
}

function formatInsightType(type: string): string {
  const labels: Record<string, string> = {
    SIGNAL: "Signal",
    OBSERVATION: "Observation",
    OPPORTUNITY: "Opportunity",
    RISK: "Risk",
  };
  return labels[type] ?? type;
}
