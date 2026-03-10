"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Settings,
  BarChart3,
  Lightbulb,
  ClipboardCheck,
  LayoutDashboard,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { CampaignHeader } from "@/components/campaigns/CampaignHeader";
import { CampaignSettingsTab } from "@/components/campaigns/CampaignSettingsTab";
import { ComingSoon } from "@/components/shared/ComingSoon";

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "ideas", label: "Ideas", icon: Lightbulb },
  { id: "evaluation", label: "Evaluation", icon: ClipboardCheck },
  { id: "cockpit", label: "Cockpit", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const {
    data: campaign,
    isLoading,
    error,
  } = trpc.campaign.getById.useQuery({ id: params.id }, { enabled: !!params.id });

  const deleteMutation = trpc.campaign.delete.useMutation();
  const transitionMutation = trpc.campaign.transition.useMutation();

  async function handleDelete() {
    if (!campaign) return;
    if (!window.confirm("Are you sure you want to delete this campaign?")) return;
    try {
      await deleteMutation.mutateAsync({ id: campaign.id });
      router.push("/campaigns");
    } catch {
      // Error shown via mutation state
    }
  }

  async function handleTransition(to: string) {
    if (!campaign) return;
    try {
      await transitionMutation.mutateAsync({
        id: campaign.id,
        to: to as
          | "DRAFT"
          | "SEEDING"
          | "SUBMISSION"
          | "DISCUSSION_VOTING"
          | "EVALUATION"
          | "CLOSED",
      });
    } catch {
      // Error shown via mutation state
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-48 animate-pulse rounded-xl bg-gray-100" />
        <div className="h-8 w-64 animate-pulse rounded bg-gray-100" />
        <div className="h-4 w-96 animate-pulse rounded bg-gray-100" />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h2 className="font-display text-lg font-semibold text-gray-900">Campaign not found</h2>
        <p className="mt-1 text-sm text-gray-500">
          The campaign you&apos;re looking for doesn&apos;t exist or you don&apos;t have access.
        </p>
        <Link href="/campaigns" className="mt-4">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Campaigns
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        href="/campaigns"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Campaigns
      </Link>

      {/* Header */}
      <CampaignHeader campaign={campaign} />

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-primary-600 text-primary-600"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "overview" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="font-display text-lg font-semibold text-gray-900">About</h2>
              <p className="mt-2 whitespace-pre-wrap text-gray-600">
                {campaign.description ?? "No description provided."}
              </p>
            </div>

            {/* Phase transition actions */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 font-display text-lg font-semibold text-gray-900">
                Campaign Lifecycle
              </h2>
              <div className="flex flex-wrap gap-2">
                {campaign.status === "DRAFT" && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleTransition("SUBMISSION")}
                      disabled={transitionMutation.isPending}
                    >
                      Open for Submissions
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTransition("SEEDING")}
                      disabled={transitionMutation.isPending}
                    >
                      Start Seeding
                    </Button>
                  </>
                )}
                {campaign.status === "SEEDING" && (
                  <Button
                    size="sm"
                    onClick={() => handleTransition("SUBMISSION")}
                    disabled={transitionMutation.isPending}
                  >
                    Open for Submissions
                  </Button>
                )}
                {campaign.status === "SUBMISSION" && (
                  <Button
                    size="sm"
                    onClick={() => handleTransition("DISCUSSION_VOTING")}
                    disabled={transitionMutation.isPending}
                  >
                    Start Discussion & Voting
                  </Button>
                )}
                {campaign.status === "DISCUSSION_VOTING" && (
                  <Button
                    size="sm"
                    onClick={() => handleTransition("EVALUATION")}
                    disabled={transitionMutation.isPending}
                  >
                    Start Evaluation
                  </Button>
                )}
                {campaign.status === "EVALUATION" && (
                  <Button
                    size="sm"
                    onClick={() => handleTransition("CLOSED")}
                    disabled={transitionMutation.isPending}
                  >
                    Close Campaign
                  </Button>
                )}
              </div>

              {campaign.status === "DRAFT" && (
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? "Deleting..." : "Delete Campaign"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "ideas" && (
          <ComingSoon
            title="Ideas"
            description="Idea submissions, discussions, and voting for this campaign. Coming with Story 3.1."
            icon={Lightbulb}
          />
        )}

        {activeTab === "evaluation" && (
          <ComingSoon
            title="Evaluation"
            description="Structured evaluation of campaign ideas. Coming with Story 4.1."
            icon={ClipboardCheck}
          />
        )}

        {activeTab === "cockpit" && (
          <ComingSoon
            title="Cockpit"
            description="Campaign KPIs, analytics, and management dashboard. Coming with Story 8.1."
            icon={BarChart3}
          />
        )}

        {activeTab === "settings" && <CampaignSettingsTab campaign={campaign} />}
      </div>
    </div>
  );
}
