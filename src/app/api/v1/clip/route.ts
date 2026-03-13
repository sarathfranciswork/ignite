import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateApiKey, checkScope } from "@/server/lib/api-key-auth";
import { clipCreateInput } from "@/server/services/clip.schemas";
import { createClip, ClipServiceError } from "@/server/services/clip.service";
import { logger } from "@/server/lib/logger";

export const dynamic = "force-dynamic";

const childLogger = logger.child({ service: "api-v1-clip" });

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await authenticateApiKey(request);
  if ("error" in auth) return auth.error;

  if (!checkScope(auth.context, "clips:write")) {
    return NextResponse.json(
      { error: "Insufficient scope. Required: clips:write" },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = clipCreateInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const result = await createClip(parsed.data, auth.context.userId);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ClipServiceError) {
      const statusMap: Record<string, number> = {
        INVALID_URL: 400,
        CAMPAIGN_REQUIRED: 400,
        CAMPAIGN_NOT_FOUND: 404,
      };
      return NextResponse.json({ error: error.message }, { status: statusMap[error.code] ?? 400 });
    }

    childLogger.error({ error }, "Unexpected error in clip API");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
