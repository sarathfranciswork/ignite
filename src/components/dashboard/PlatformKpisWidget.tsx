"use client";

import { KpiCard } from "@/components/charts/KpiCard";
import { Megaphone, Lightbulb, Users, ClipboardCheck } from "lucide-react";

interface PlatformKpis {
  activeCampaigns: number;
  totalIdeas: number;
  totalUsers: number;
  pendingEvaluations: number;
}

interface PlatformKpisWidgetProps {
  kpis: PlatformKpis;
}

export function PlatformKpisWidget({ kpis }: PlatformKpisWidgetProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        title="Active Campaigns"
        value={kpis.activeCampaigns}
        icon={Megaphone}
        subtitle="Currently running"
        trend={kpis.activeCampaigns > 0 ? "up" : "neutral"}
      />
      <KpiCard
        title="Total Ideas"
        value={kpis.totalIdeas}
        icon={Lightbulb}
        subtitle="Across all campaigns"
        trend={kpis.totalIdeas > 0 ? "up" : "neutral"}
      />
      <KpiCard
        title="Active Users"
        value={kpis.totalUsers}
        icon={Users}
        subtitle="Registered & active"
        trend={kpis.totalUsers > 0 ? "up" : "neutral"}
      />
      <KpiCard
        title="Active Evaluations"
        value={kpis.pendingEvaluations}
        icon={ClipboardCheck}
        subtitle="Sessions in progress"
        trend={kpis.pendingEvaluations > 0 ? "up" : "neutral"}
      />
    </div>
  );
}
