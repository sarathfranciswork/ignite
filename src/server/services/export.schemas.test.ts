import { describe, it, expect } from "vitest";
import {
  exportCampaignReportInput,
  exportPlatformReportInput,
  exportIdeaListInput,
  exportEvaluationResultsInput,
  customKpiReportInput,
} from "./export.schemas";

describe("exportCampaignReportInput", () => {
  it("accepts valid input with all options", () => {
    const result = exportCampaignReportInput.safeParse({
      campaignId: "clxyz1234567890abcdef",
      dateRange: {
        from: "2026-01-01T00:00:00.000Z",
        to: "2026-03-01T00:00:00.000Z",
      },
      includeKpiTimeSeries: true,
      includeIdeaList: false,
      includeEvaluationResults: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts minimal input with defaults", () => {
    const result = exportCampaignReportInput.safeParse({
      campaignId: "clxyz1234567890abcdef",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.includeKpiTimeSeries).toBe(true);
      expect(result.data.includeIdeaList).toBe(true);
      expect(result.data.includeEvaluationResults).toBe(false);
    }
  });

  it("rejects invalid campaignId", () => {
    const result = exportCampaignReportInput.safeParse({
      campaignId: "not-a-cuid",
    });
    expect(result.success).toBe(false);
  });
});

describe("exportPlatformReportInput", () => {
  it("accepts empty input", () => {
    const result = exportPlatformReportInput.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts date range filter", () => {
    const result = exportPlatformReportInput.safeParse({
      dateRange: {
        from: "2026-01-01T00:00:00.000Z",
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts campaign ID filter", () => {
    const result = exportPlatformReportInput.safeParse({
      campaignIds: ["clxyz1234567890abcdef"],
    });
    expect(result.success).toBe(true);
  });
});

describe("exportIdeaListInput", () => {
  it("accepts valid input with status filter", () => {
    const result = exportIdeaListInput.safeParse({
      campaignId: "clxyz1234567890abcdef",
      statuses: ["DRAFT", "HOT", "EVALUATION"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status values", () => {
    const result = exportIdeaListInput.safeParse({
      campaignId: "clxyz1234567890abcdef",
      statuses: ["INVALID_STATUS"],
    });
    expect(result.success).toBe(false);
  });
});

describe("exportEvaluationResultsInput", () => {
  it("accepts valid input with optional session ID", () => {
    const result = exportEvaluationResultsInput.safeParse({
      campaignId: "clxyz1234567890abcdef",
      evaluationSessionId: "clxyz1234567890abcdef",
    });
    expect(result.success).toBe(true);
  });

  it("accepts input without session ID", () => {
    const result = exportEvaluationResultsInput.safeParse({
      campaignId: "clxyz1234567890abcdef",
    });
    expect(result.success).toBe(true);
  });
});

describe("customKpiReportInput", () => {
  it("accepts valid input with required fields", () => {
    const result = customKpiReportInput.safeParse({
      campaignIds: ["clxxxxxxxxxxxxxxxxxxxxxxxxx"],
      metrics: ["ideas_submitted"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts full input with all optional fields", () => {
    const result = customKpiReportInput.safeParse({
      campaignIds: ["clxxxxxxxxxxxxxxxxxxxxxxxxx", "clyyyyyyyyyyyyyyyyyyyyyyyy"],
      dateRange: {
        from: "2026-01-01T00:00:00.000Z",
        to: "2026-03-01T00:00:00.000Z",
      },
      orgUnitId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
      metrics: ["ideas_submitted", "total_comments", "member_count"],
      groupBy: "date",
      format: "excel",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty campaign IDs", () => {
    const result = customKpiReportInput.safeParse({
      campaignIds: [],
      metrics: ["ideas_submitted"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty metrics", () => {
    const result = customKpiReportInput.safeParse({
      campaignIds: ["clxxxxxxxxxxxxxxxxxxxxxxxxx"],
      metrics: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid metric name", () => {
    const result = customKpiReportInput.safeParse({
      campaignIds: ["clxxxxxxxxxxxxxxxxxxxxxxxxx"],
      metrics: ["invalid_metric"],
    });
    expect(result.success).toBe(false);
  });

  it("defaults groupBy to campaign and format to json", () => {
    const result = customKpiReportInput.safeParse({
      campaignIds: ["clxxxxxxxxxxxxxxxxxxxxxxxxx"],
      metrics: ["ideas_submitted"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.groupBy).toBe("campaign");
      expect(result.data.format).toBe("json");
    }
  });
});
