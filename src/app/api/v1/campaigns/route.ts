import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { CampaignStatus } from "@prisma/client";
import { authenticateApiKey, checkScope } from "@/server/lib/api-key-auth";
import { listCampaigns } from "@/server/services/campaign.service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await authenticateApiKey(request);
  if ("error" in auth) return auth.error;

  if (!checkScope(auth.context, "campaigns:read")) {
    return NextResponse.json(
      { error: "Insufficient scope. Required: campaigns:read" },
      { status: 403 },
    );
  }

  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") ?? "20", 10) || 20, 1),
    100,
  );
  const statusParam = url.searchParams.get("status") ?? undefined;

  const validStatuses = Object.values(CampaignStatus);
  if (statusParam && !validStatuses.includes(statusParam as CampaignStatus)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
      { status: 400 },
    );
  }

  const status = statusParam as CampaignStatus | undefined;
  const result = await listCampaigns({ cursor, limit, status });

  return NextResponse.json(result);
}
