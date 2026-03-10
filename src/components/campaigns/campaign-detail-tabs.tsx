"use client";

import { useState } from "react";
import type { BeInspiredContent } from "@/types/campaign-sia";
import { BeInspiredTab } from "./be-inspired-tab";

// ============================================================
// Campaign Detail Tabs (Story 9.6)
//
// Tab bar with conditional "Be Inspired" tab that only appears
// when the campaign is linked to at least one SIA.
//
// Tab order: [Overview] [Ideas] [Be Inspired] [Community] [Results]
// Manager tabs: [Cockpit] [Idea Board] [Evaluation] [Settings]
// ============================================================

type TabId =
  | "overview"
  | "ideas"
  | "be-inspired"
  | "community"
  | "results"
  | "cockpit"
  | "idea-board"
  | "evaluation"
  | "settings";

interface CampaignDetailTabsProps {
  /** Campaign ID */
  campaignId: string;
  /** Number of ideas (for tab badge) */
  ideaCount: number;
  /** Whether the current user is a campaign manager */
  isManager: boolean;
  /** "Be Inspired" content (null if no SIA links) */
  beInspiredContent: BeInspiredContent | null;
  /** Whether "Be Inspired" content is loading */
  isBeInspiredLoading?: boolean;
  /** Render function for each tab's content */
  renderTabContent?: (tabId: TabId) => React.ReactNode;
}

export function CampaignDetailTabs({
  ideaCount,
  isManager,
  beInspiredContent,
  isBeInspiredLoading = false,
  renderTabContent,
}: CampaignDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const showBeInspired =
    beInspiredContent?.hasSiaLinks === true || isBeInspiredLoading;

  const publicTabs: Array<{ id: TabId; label: string; badge?: string }> = [
    { id: "overview", label: "Overview" },
    {
      id: "ideas",
      label: "Ideas",
      badge: ideaCount > 0 ? String(ideaCount) : undefined,
    },
    ...(showBeInspired
      ? [{ id: "be-inspired" as TabId, label: "Be Inspired" }]
      : []),
    { id: "community", label: "Community" },
    { id: "results", label: "Results" },
  ];

  const managerTabs: Array<{ id: TabId; label: string; badge?: string }> =
    isManager
      ? [
          { id: "cockpit", label: "Cockpit" },
          { id: "idea-board", label: "Idea Board" },
          { id: "evaluation", label: "Evaluation" },
          { id: "settings", label: "Settings" },
        ]
      : [];

  const allTabs = [...publicTabs, ...managerTabs];

  return (
    <div>
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav
          className="-mb-px flex space-x-6 overflow-x-auto px-4"
          aria-label="Campaign tabs"
        >
          {allTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
              aria-selected={activeTab === tab.id}
              role="tab"
              data-testid={`tab-${tab.id}`}
            >
              {tab.label}
              {tab.badge != null && (
                <span className="ml-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="px-4 py-6" role="tabpanel">
        {activeTab === "be-inspired" && (
          <BeInspiredTab
            content={
              beInspiredContent ?? {
                sias: [],
                trends: [],
                technologies: [],
                insights: [],
                hasSiaLinks: false,
              }
            }
            isLoading={isBeInspiredLoading}
          />
        )}
        {activeTab !== "be-inspired" && renderTabContent?.(activeTab)}
      </div>
    </div>
  );
}
