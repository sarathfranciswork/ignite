import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/server/lib/prisma";
import { authenticateApiKey, checkScope } from "@/server/lib/api-key-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await authenticateApiKey(request);
  if ("error" in auth) return auth.error;

  if (!checkScope(auth.context, "users:read")) {
    return NextResponse.json(
      { error: "Insufficient scope. Required: users:read" },
      { status: 403 },
    );
  }

  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") ?? "20", 10) || 20, 1),
    100,
  );
  const isActive = url.searchParams.get("isActive");

  const users = await prisma.user.findMany({
    where: {
      ...(isActive !== null ? { isActive: isActive === "true" } : {}),
    },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      globalRole: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  let nextCursor: string | undefined;
  if (users.length > limit) {
    const next = users.pop();
    nextCursor = next?.id;
  }

  return NextResponse.json({
    items: users.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    })),
    nextCursor,
  });
}
