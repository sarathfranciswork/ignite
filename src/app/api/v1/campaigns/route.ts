import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { CampaignStatus } from "@prisma/client";
import { authenticateApiKey, checkScope } from "@/server/lib/api-key-auth";
import { prisma } from "@/server/lib/prisma";

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

  const campaigns = await prisma.campaign.findMany({
    where: {
      ...(status ? { status } : {}),
    },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      submissionType: true,
      submissionCloseDate: true,
      votingCloseDate: true,
      createdAt: true,
      updatedAt: true,
      createdById: true,
    },
  });

  let nextCursor: string | undefined;
  if (campaigns.length > limit) {
    const next = campaigns.pop();
    nextCursor = next?.id;
  }

  return NextResponse.json({
    items: campaigns.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      submissionCloseDate: c.submissionCloseDate?.toISOString() ?? null,
      votingCloseDate: c.votingCloseDate?.toISOString() ?? null,
    })),
    nextCursor,
  });
}
