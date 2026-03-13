import type { NextRequest } from "next/server";
import type { NextResponse } from "next/server";
import { getEvaluationsDataset } from "@/server/services/bi-connector.service";
import { handleBiDatasetRequest } from "../helpers";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { connectorId: string } },
): Promise<NextResponse> {
  return handleBiDatasetRequest(request, params.connectorId, "evaluations", getEvaluationsDataset);
}
