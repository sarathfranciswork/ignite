"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { downloadExcel } from "@/lib/download-excel";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ExportButtonProps {
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm";
}

export function ExportPlatformSummaryButton({
  variant = "outline",
  size = "sm",
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const ideaListExport = trpc.export.ideaList.useMutation({
    onSuccess(data) {
      downloadExcel(data.data, data.filename);
      toast.success("Platform idea list exported successfully");
      setIsExporting(false);
    },
    onError(error) {
      toast.error(`Export failed: ${error.message}`);
      setIsExporting(false);
    },
  });

  function handleExport() {
    setIsExporting(true);
    ideaListExport.mutate({});
  }

  return (
    <Button variant={variant} size={size} onClick={handleExport} disabled={isExporting}>
      {isExporting ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      Export Ideas to Excel
    </Button>
  );
}

interface ExportCampaignButtonProps extends ExportButtonProps {
  campaignId: string;
}

export function ExportCampaignReportButton({
  campaignId,
  variant = "outline",
  size = "sm",
}: ExportCampaignButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const campaignExport = trpc.export.campaignReport.useMutation({
    onSuccess(data) {
      downloadExcel(data.data, data.filename);
      toast.success("Campaign report exported successfully");
      setIsExporting(false);
    },
    onError(error) {
      toast.error(`Export failed: ${error.message}`);
      setIsExporting(false);
    },
  });

  function handleExport() {
    setIsExporting(true);
    campaignExport.mutate({ campaignId });
  }

  return (
    <Button variant={variant} size={size} onClick={handleExport} disabled={isExporting}>
      {isExporting ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      Export to Excel
    </Button>
  );
}

interface ExportEvaluationButtonProps extends ExportButtonProps {
  sessionId: string;
}

export function ExportEvaluationButton({
  sessionId,
  variant = "outline",
  size = "sm",
}: ExportEvaluationButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const evalExport = trpc.export.evaluationResults.useMutation({
    onSuccess(data) {
      downloadExcel(data.data, data.filename);
      toast.success("Evaluation results exported successfully");
      setIsExporting(false);
    },
    onError(error) {
      toast.error(`Export failed: ${error.message}`);
      setIsExporting(false);
    },
  });

  function handleExport() {
    setIsExporting(true);
    evalExport.mutate({ sessionId });
  }

  return (
    <Button variant={variant} size={size} onClick={handleExport} disabled={isExporting}>
      {isExporting ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      Export Results
    </Button>
  );
}
