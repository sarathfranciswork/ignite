import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/server/lib/prisma";
import { authenticateApiKey, checkScope } from "@/server/lib/api-key-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await authenticateApiKey(request);
  if ("error" in auth) return auth.error;

  if (!checkScope(auth.context, "ideas:read")) {
    return NextResponse.json(
      { error: "Insufficient scope. Required: ideas:read" },
      { status: 403 },
    );
  }

  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") ?? "20", 10) || 20, 1),
    100,
  );
  const campaignId = url.searchParams.get("campaignId") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;

  const ideas = await prisma.idea.findMany({
    where: {
      ...(campaignId ? { campaignId } : {}),
      ...(status ? { status: status as never } : {}),
      isConfidential: false,
    },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      campaignId: true,
      contributorId: true,
      likesCount: true,
      commentsCount: true,
      viewsCount: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  let nextCursor: string | undefined;
  if (ideas.length > limit) {
    const next = ideas.pop();
    nextCursor = next?.id;
  }

  return NextResponse.json({
    items: ideas.map((i) => ({
      ...i,
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
    })),
    nextCursor,
  });
}
