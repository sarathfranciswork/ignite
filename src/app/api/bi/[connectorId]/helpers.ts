import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateApiKey, checkScope } from "@/server/lib/api-key-auth";
import { formatAsCsv, BiConnectorServiceError } from "@/server/services/bi-connector.service";
import { logger } from "@/server/lib/logger";

const childLogger = logger.child({ service: "api-bi" });

interface DatasetResult {
  columns: { name: string; type: string; description: string }[];
  rows: Record<string, unknown>[];
  totalCount: number;
}

type DatasetFetcher = (
  connectorId: string,
  options: { limit: number; offset: number },
) => Promise<DatasetResult>;

export async function handleBiDatasetRequest(
  request: NextRequest,
  connectorId: string,
  datasetName: string,
  fetcher: DatasetFetcher,
): Promise<NextResponse> {
  const auth = await authenticateApiKey(request);
  if ("error" in auth) return auth.error;

  if (!checkScope(auth.context, "bi:read")) {
    return NextResponse.json({ error: "Insufficient scope. Required: bi:read" }, { status: 403 });
  }

  const url = new URL(request.url);
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") ?? "1000", 10) || 1000, 1),
    10000,
  );
  const offset = Math.max(parseInt(url.searchParams.get("offset") ?? "0", 10) || 0, 0);
  const format = url.searchParams.get("format") === "csv" ? "csv" : "json";

  try {
    const result = await fetcher(connectorId, { limit, offset });

    if (format === "csv") {
      const csv = formatAsCsv(result.columns, result.rows);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${datasetName}-${connectorId}.csv"`,
          "X-Total-Count": String(result.totalCount),
        },
      });
    }

    return NextResponse.json({
      data: result.rows,
      columns: result.columns,
      pagination: { limit, offset, totalCount: result.totalCount },
    });
  } catch (error) {
    if (error instanceof BiConnectorServiceError) {
      const statusMap: Record<string, number> = {
        NOT_FOUND: 404,
        INACTIVE: 403,
      };
      return NextResponse.json({ error: error.message }, { status: statusMap[error.code] ?? 400 });
    }

    childLogger.error({ error, connectorId, datasetName }, "BI dataset request failed");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
