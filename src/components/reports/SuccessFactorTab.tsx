"use client";

import { trpc } from "@/lib/trpc";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { cn } from "@/lib/utils";
import { Loader2, TrendingUp, TrendingDown, Minus, Lightbulb, Trophy } from "lucide-react";

const CHART_COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"];

interface SuccessFactorEntry {
  campaignId: string;
  title: string;
  successScore: number;
  configuration: {
    durationDays: number | null;
    phaseCount: number;
    hasVoting: boolean;
    hasLikes: boolean;
    hasSeedingPhase: boolean;
    hasDiscussionPhase: boolean;
    hasCommunityGraduation: boolean;
    hasQualificationPhase: boolean;
    hasIdeaCoach: boolean;
  };
  outcomes: {
    totalIdeas: number;
    hotIdeas: number;
    evaluatedIdeas: number;
    selectedIdeas: number;
    totalLikes: number;
    totalComments: number;
    totalVotes: number;
    memberCount: number;
    ideasPerMember: number;
  };
}

export function SuccessFactorTab() {
  const query = trpc.campaignComparison.successFactors.useQuery({}, { staleTime: 60_000 });

  if (query.isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white p-12 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Analyzing success factors...
      </div>
    );
  }

  if (query.error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {query.error.message}
      </div>
    );
  }

  const data = query.data;
  if (!data) return null;

  const { entries, averages } = data;

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        No campaigns available for analysis. Launch some campaigns to see success factor insights.
      </div>
    );
  }

  // Build correlation data
  const durationVsParticipation = entries
    .filter((e) => e.configuration.durationDays !== null)
    .map((e) => ({
      campaignId: e.campaignId,
      title: e.title,
      x: e.configuration.durationDays ?? 0,
      y: e.outcomes.ideasPerMember,
    }));

  const phaseCountVsHot = entries.map((e) => ({
    campaignId: e.campaignId,
    title: e.title,
    x: e.configuration.phaseCount,
    y: e.outcomes.hotIdeas,
  }));

  const audienceVsParticipation = entries.map((e) => ({
    campaignId: e.campaignId,
    title: e.title,
    x: e.outcomes.memberCount,
    y: e.outcomes.ideasPerMember,
  }));

  // Coach analysis
  const withCoach = entries.filter((e) => e.configuration.hasIdeaCoach);
  const withoutCoach = entries.filter((e) => !e.configuration.hasIdeaCoach);
  const coachAvgScore =
    withCoach.length > 0 ? withCoach.reduce((s, e) => s + e.successScore, 0) / withCoach.length : 0;
  const noCoachAvgScore =
    withoutCoach.length > 0
      ? withoutCoach.reduce((s, e) => s + e.successScore, 0) / withoutCoach.length
      : 0;

  const recommendations = generateRecommendations(entries, averages);

  const correlationPanels: Array<{
    title: string;
    xLabel: string;
    yLabel: string;
    data: Array<{ campaignId: string; title: string; x: number; y: number }>;
    color: string;
  }> = [
    {
      title: "Duration vs. Participation",
      xLabel: "Duration (days)",
      yLabel: "Ideas per Member",
      data: durationVsParticipation,
      color: CHART_COLORS[0] ?? "#3b82f6",
    },
    {
      title: "Phase Count vs. HOT! Ideas",
      xLabel: "Active Phases",
      yLabel: "HOT! Ideas",
      data: phaseCountVsHot,
      color: CHART_COLORS[1] ?? "#ef4444",
    },
    {
      title: "Audience Size vs. Participation",
      xLabel: "Members",
      yLabel: "Ideas per Member",
      data: audienceVsParticipation,
      color: CHART_COLORS[2] ?? "#10b981",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">Campaigns Analyzed</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{entries.length}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">Avg Success Score</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {averages.avgSuccessScore.toFixed(1)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">Avg Ideas/Member</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{averages.avgIdeasPerMember}</p>
        </div>
      </div>

      {/* Success Score Ranking */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-gray-900">Campaign Success Ranking</h3>
        </div>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={entries.slice(0, 10).map((e) => ({
                name: e.title.length > 20 ? e.title.slice(0, 20) + "..." : e.title,
                score: e.successScore,
              }))}
              layout="vertical"
              margin={{ left: 120, right: 20, top: 5, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={120} />
              <Tooltip />
              <Bar dataKey="score" name="Success Score">
                {entries.slice(0, 10).map((_, i) => (
                  <Cell key={i} fill={i === 0 ? "#f59e0b" : "#3b82f6"} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Correlation Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {correlationPanels.map((panel) => (
          <div key={panel.title} className="rounded-lg border border-gray-200 bg-white p-4">
            <h4 className="mb-3 text-sm font-semibold text-gray-900">{panel.title}</h4>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="x"
                    name={panel.xLabel}
                    type="number"
                    tick={{ fontSize: 10 }}
                    label={{
                      value: panel.xLabel,
                      position: "insideBottom",
                      offset: -10,
                      style: { fontSize: 10, fill: "#6b7280" },
                    }}
                  />
                  <YAxis
                    dataKey="y"
                    name={panel.yLabel}
                    type="number"
                    tick={{ fontSize: 10 }}
                    label={{
                      value: panel.yLabel,
                      angle: -90,
                      position: "insideLeft",
                      style: { fontSize: 10, fill: "#6b7280" },
                    }}
                  />
                  <Tooltip
                    content={({ payload }) => {
                      if (!payload?.length) return null;
                      const d = payload[0]?.payload as
                        | { title: string; x: number; y: number }
                        | undefined;
                      if (!d) return null;
                      return (
                        <div className="rounded border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg">
                          <p className="font-semibold text-gray-900">{d.title}</p>
                          <p className="text-gray-600">
                            {panel.xLabel}: {d.x}
                          </p>
                          <p className="text-gray-600">
                            {panel.yLabel}: {d.y}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Scatter data={panel.data}>
                    {panel.data.map((_, i) => (
                      <Cell key={i} fill={panel.color} fillOpacity={0.7} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}

        {/* Coach Impact */}
        {withCoach.length > 0 && withoutCoach.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h4 className="mb-3 text-sm font-semibold text-gray-900">Idea Coach Impact</h4>
            <div className="flex items-end gap-8 pt-4">
              <CoachBar
                label="With Coach"
                value={coachAvgScore}
                count={withCoach.length}
                color="#10b981"
              />
              <CoachBar
                label="Without Coach"
                value={noCoachAvgScore}
                count={withoutCoach.length}
                color="#6b7280"
              />
            </div>
            <CorrelationIndicator coachAvg={coachAvgScore} noCoachAvg={noCoachAvgScore} />
          </div>
        )}
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            <h3 className="text-sm font-semibold text-gray-900">Actionable Insights</h3>
          </div>
          <div className="space-y-4">
            {recommendations.map((rec, i) => (
              <div key={i} className="rounded-md border border-gray-100 bg-gray-50 p-4">
                <div className="mb-1 flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-800">{rec.factor}</h4>
                  <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                    {rec.recommendedRange}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{rec.insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CoachBar({
  label,
  value,
  count,
  color,
}: {
  label: string;
  value: number;
  count: number;
  color: string;
}) {
  return (
    <div className="flex-1 text-center">
      <div className="mx-auto mb-2 h-[120px] w-16 rounded-t-md bg-gray-100">
        <div
          className="w-full rounded-t-md transition-all"
          style={{
            height: `${Math.min(value, 100)}%`,
            backgroundColor: color,
          }}
        />
      </div>
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <p className="text-xs text-gray-500">
        Score: {value.toFixed(1)} ({count} campaigns)
      </p>
    </div>
  );
}

function CorrelationIndicator({ coachAvg, noCoachAvg }: { coachAvg: number; noCoachAvg: number }) {
  const diff = coachAvg - noCoachAvg;
  const direction = diff > 2 ? "positive" : diff < -2 ? "negative" : "none";
  const Icon =
    direction === "positive" ? TrendingUp : direction === "negative" ? TrendingDown : Minus;

  return (
    <div
      className={cn(
        "mt-4 flex items-center justify-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
        direction === "positive" && "bg-green-100 text-green-700",
        direction === "negative" && "bg-red-100 text-red-700",
        direction === "none" && "bg-gray-100 text-gray-600",
      )}
    >
      <Icon className="h-3 w-3" />
      {direction === "positive"
        ? `Coach adds +${diff.toFixed(1)} to success score`
        : direction === "negative"
          ? `Coach reduces score by ${Math.abs(diff).toFixed(1)}`
          : "No significant impact detected"}
    </div>
  );
}

interface Recommendation {
  factor: string;
  insight: string;
  recommendedRange: string;
}

function generateRecommendations(
  entries: SuccessFactorEntry[],
  averages: { avgDurationDays: number | null; avgIdeasPerMember: number; avgSuccessScore: number },
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  if (entries.length < 2) return recommendations;

  // Sort by success score
  const sorted = [...entries].sort((a, b) => b.successScore - a.successScore);
  const topHalf = sorted.slice(0, Math.ceil(sorted.length / 2));

  // Duration insight
  const topWithDuration = topHalf.filter((e) => e.configuration.durationDays !== null);
  if (topWithDuration.length > 0 && averages.avgDurationDays !== null) {
    const avgTopDuration =
      topWithDuration.reduce((s, e) => s + (e.configuration.durationDays ?? 0), 0) /
      topWithDuration.length;
    if (Math.abs(avgTopDuration - averages.avgDurationDays) > 5) {
      recommendations.push({
        factor: "Campaign Duration",
        insight: `Top-performing campaigns averaged ${Math.round(avgTopDuration)} days vs. overall ${Math.round(averages.avgDurationDays)} days.`,
        recommendedRange: `${Math.round(Math.min(...topWithDuration.map((e) => e.configuration.durationDays ?? 0)))}-${Math.round(Math.max(...topWithDuration.map((e) => e.configuration.durationDays ?? 0)))} days`,
      });
    }
  }

  // Coach insight
  const withCoach = entries.filter((e) => e.configuration.hasIdeaCoach);
  const withoutCoach = entries.filter((e) => !e.configuration.hasIdeaCoach);
  if (withCoach.length > 0 && withoutCoach.length > 0) {
    const coachAvg =
      withCoach.reduce((s, e) => s + e.outcomes.ideasPerMember, 0) / withCoach.length;
    const noCoachAvg =
      withoutCoach.reduce((s, e) => s + e.outcomes.ideasPerMember, 0) / withoutCoach.length;
    if (coachAvg > noCoachAvg * 1.1) {
      const improvement = Math.round(((coachAvg - noCoachAvg) / (noCoachAvg || 1)) * 100);
      recommendations.push({
        factor: "Idea Coach",
        insight: `Campaigns with idea coaching enabled had ${improvement}% higher participation rates.`,
        recommendedRange: "Enabled",
      });
    }
  }

  // Audience size insight
  const topAudiences = topHalf.map((e) => e.outcomes.memberCount);
  const avgTopAudience = topAudiences.reduce((s, v) => s + v, 0) / topAudiences.length;
  const avgAllAudience = entries.reduce((s, e) => s + e.outcomes.memberCount, 0) / entries.length;
  if (topAudiences.length > 0) {
    recommendations.push({
      factor: "Audience Size",
      insight: `Best-performing campaigns had an average audience of ${Math.round(avgTopAudience)} members vs. overall ${Math.round(avgAllAudience)}.`,
      recommendedRange: `${Math.min(...topAudiences)}-${Math.max(...topAudiences)} members`,
    });
  }

  return recommendations;
}
