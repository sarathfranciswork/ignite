"use client";

import { useState } from "react";
import { PlatformSummaryTab } from "./PlatformSummaryTab";
import { PortfolioAnalysisTab } from "./PortfolioAnalysisTab";
import { cn } from "@/lib/utils";
import { BarChart3, FolderKanban } from "lucide-react";

type TabId = "platform" | "portfolio";

const TABS: Array<{ id: TabId; label: string; icon: typeof BarChart3 }> = [
  { id: "platform", label: "Platform Summary", icon: BarChart3 },
  { id: "portfolio", label: "Portfolio Analysis", icon: FolderKanban },
];

export function ReportsView() {
  const [activeTab, setActiveTab] = useState<TabId>("platform");

  return (
    <div className="space-y-6">
      <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700",
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "platform" && <PlatformSummaryTab />}
      {activeTab === "portfolio" && <PortfolioAnalysisTab />}
    </div>
  );
}
