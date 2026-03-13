import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateApiKey, checkScope } from "@/server/lib/api-key-auth";
import { getDatasetMetadata } from "@/server/services/bi-connector.service";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { connectorId: string } },
): Promise<NextResponse> {
  const auth = await authenticateApiKey(request);
  if ("error" in auth) return auth.error;

  if (!checkScope(auth.context, "bi:read")) {
    return NextResponse.json({ error: "Insufficient scope. Required: bi:read" }, { status: 403 });
  }

  const metadata = getDatasetMetadata(params.connectorId);
  return NextResponse.json(metadata);
}
