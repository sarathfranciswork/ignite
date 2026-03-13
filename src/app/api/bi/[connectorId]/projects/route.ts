import type { NextRequest } from "next/server";
import type { NextResponse } from "next/server";
import { getProjectsDataset } from "@/server/services/bi-connector.service";
import { handleBiDatasetRequest } from "../helpers";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { connectorId: string } },
): Promise<NextResponse> {
  return handleBiDatasetRequest(request, params.connectorId, "projects", getProjectsDataset);
}
