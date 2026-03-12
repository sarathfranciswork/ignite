import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { validateApiKey } from "@/server/services/api-key.service";
import { logger } from "@/server/lib/logger";

const childLogger = logger.child({ service: "api-key-auth" });

export interface ApiKeyContext {
  userId: string;
  scopes: string[];
}

export async function authenticateApiKey(
  request: NextRequest,
): Promise<{ context: ApiKeyContext } | { error: NextResponse }> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return {
      error: NextResponse.json(
        { error: "Missing Authorization header. Use: Authorization: Bearer <api-key>" },
        { status: 401 },
      ),
    };
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return {
      error: NextResponse.json(
        { error: "Invalid Authorization header format. Use: Authorization: Bearer <api-key>" },
        { status: 401 },
      ),
    };
  }

  const rawKey = parts[1];
  if (!rawKey || !rawKey.startsWith("ign_")) {
    return {
      error: NextResponse.json({ error: "Invalid API key format" }, { status: 401 }),
    };
  }

  try {
    const result = await validateApiKey(rawKey);

    if (!result) {
      return {
        error: NextResponse.json({ error: "Invalid or expired API key" }, { status: 401 }),
      };
    }

    return { context: result };
  } catch (err) {
    childLogger.error({ error: err }, "API key validation failed");
    return {
      error: NextResponse.json({ error: "Authentication failed" }, { status: 500 }),
    };
  }
}

export function checkScope(context: ApiKeyContext, requiredScope: string): boolean {
  if (context.scopes.length === 0) return true;
  return context.scopes.includes(requiredScope);
}
