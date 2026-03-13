"use client";

import { useState } from "react";
import { PlatformSummaryTab } from "./PlatformSummaryTab";
import { PortfolioAnalysisTab } from "./PortfolioAnalysisTab";
import { PortfolioAnalyzerTab } from "./PortfolioAnalyzerTab";
import { CampaignComparisonTab } from "./CampaignComparisonTab";
import { SuccessFactorTab } from "./SuccessFactorTab";
import { CustomKpiReportTab } from "./CustomKpiReportTab";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  FolderKanban,
  GitBranch,
  ArrowLeftRight,
  Sparkles,
  FileSpreadsheet,
} from "lucide-react";

type TabId = "platform" | "portfolio" | "analyzer" | "comparison" | "successFactors" | "customKpi";

const TABS: Array<{ id: TabId; label: string; icon: typeof BarChart3 }> = [
  { id: "platform", label: "Platform Summary", icon: BarChart3 },
  { id: "portfolio", label: "Portfolio Analysis", icon: FolderKanban },
  { id: "analyzer", label: "Deep Analytics", icon: GitBranch },
  { id: "comparison", label: "Campaign Comparison", icon: ArrowLeftRight },
  { id: "successFactors", label: "Success Factors", icon: Sparkles },
  { id: "customKpi", label: "Custom Reports", icon: FileSpreadsheet },
];

export function ReportsView() {
  const [activeTab, setActiveTab] = useState<TabId>("platform");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
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
      {activeTab === "analyzer" && <PortfolioAnalyzerTab />}
      {activeTab === "comparison" && <CampaignComparisonTab />}
      {activeTab === "successFactors" && <SuccessFactorTab />}
      {activeTab === "customKpi" && <CustomKpiReportTab />}
    </div>
  );
}
