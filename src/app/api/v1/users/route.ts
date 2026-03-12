import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateApiKey, checkScope } from "@/server/lib/api-key-auth";
import { listUsers } from "@/server/services/user-admin.service";

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

  let status: "all" | "active" | "inactive" = "all";
  if (isActive === "true") status = "active";
  else if (isActive === "false") status = "inactive";

  const result = await listUsers({ cursor, limit, status });

  return NextResponse.json({
    items: result.items.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      globalRole: u.globalRole,
      isActive: u.isActive,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    })),
    nextCursor: result.nextCursor,
  });
}
