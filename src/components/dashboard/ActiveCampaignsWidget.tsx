"use client";

import { Megaphone, Lightbulb, Users } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import Link from "next/link";

interface ActiveCampaign {
  id: string;
  title: string;
  status: string;
  role: string;
  ideaCount: number;
  memberCount: number;
  submissionCloseDate: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  CAMPAIGN_MANAGER: "Manager",
  CAMPAIGN_COACH: "Coach",
  CAMPAIGN_CONTRIBUTOR: "Contributor",
  CAMPAIGN_MODERATOR: "Moderator",
  CAMPAIGN_EVALUATOR: "Evaluator",
  CAMPAIGN_SEEDER: "Seeder",
  CAMPAIGN_SPONSOR: "Sponsor",
};

interface ActiveCampaignsWidgetProps {
  campaigns: ActiveCampaign[];
}

export function ActiveCampaignsWidget({ campaigns }: ActiveCampaignsWidgetProps) {
  if (campaigns.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Megaphone className="h-4 w-4 text-primary-600" />
          Active Campaigns
        </h3>
        <p className="mt-4 text-center text-sm text-gray-500">
          No active campaigns. Join one to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
        <Megaphone className="h-4 w-4 text-primary-600" />
        Active Campaigns
        <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
          {campaigns.length}
        </span>
      </h3>
      <div className="mt-4 space-y-3">
        {campaigns.map((campaign) => (
          <Link
            key={campaign.id}
            href={`/campaigns/${campaign.id}`}
            className="block rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50"
          >
            <div className="flex items-start justify-between">
              <p className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">
                {campaign.title}
              </p>
              <StatusBadge
                status={campaign.status as Parameters<typeof StatusBadge>[0]["status"]}
                className="ml-2"
              />
            </div>
            <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Lightbulb className="h-3 w-3" />
                {campaign.ideaCount} ideas
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {campaign.memberCount} members
              </span>
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">
                {ROLE_LABELS[campaign.role] ?? campaign.role}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
