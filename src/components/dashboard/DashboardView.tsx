"use client";

import { trpc } from "@/lib/trpc";
import { PlatformKpisWidget } from "./PlatformKpisWidget";
import { PendingEvaluationsWidget } from "./PendingEvaluationsWidget";
import { ActiveCampaignsWidget } from "./ActiveCampaignsWidget";
import { RecentIdeasWidget } from "./RecentIdeasWidget";
import { ActivityFeedWidget } from "./ActivityFeedWidget";

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl border border-gray-200 bg-gray-50"
          />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-64 animate-pulse rounded-xl border border-gray-200 bg-gray-50"
          />
        ))}
      </div>
    </div>
  );
}

export function DashboardView() {
  const dashboardQuery = trpc.dashboard.overview.useQuery({
    activityLimit: 10,
  });

  if (dashboardQuery.isLoading) {
    return <DashboardSkeleton />;
  }

  if (dashboardQuery.isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-600">Failed to load dashboard data. Please try again.</p>
      </div>
    );
  }

  const data = dashboardQuery.data;

  if (!data) {
    return <DashboardSkeleton />;
  }

  const isManager = data.userRole === "PLATFORM_ADMIN" || data.userRole === "INNOVATION_MANAGER";

  return (
    <div className="space-y-6">
      {isManager && data.platformKpis && <PlatformKpisWidget kpis={data.platformKpis} />}

      <div className="grid gap-6 lg:grid-cols-2">
        <PendingEvaluationsWidget evaluations={data.pendingEvaluations} />
        <ActiveCampaignsWidget campaigns={data.activeCampaigns} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <RecentIdeasWidget ideas={data.recentIdeas} />
        <ActivityFeedWidget
          items={data.activityFeed.items}
          nextCursor={data.activityFeed.nextCursor}
        />
      </div>
    </div>
  );
}
