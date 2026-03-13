import { type NextRequest, NextResponse } from "next/server";
import { logger } from "@/server/lib/logger";
import { checkIp, isIpWhitelistEnabled } from "@/server/services/ip-whitelist.service";

const childLogger = logger.child({ middleware: "ip-whitelist" });

const SKIP_PATHS = ["/api/health", "/api/metrics", "/api/webhooks"];

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  return "127.0.0.1";
}

export async function ipWhitelistMiddleware(
  request: NextRequest,
  spaceId: string,
): Promise<NextResponse | null> {
  const pathname = request.nextUrl.pathname;

  if (SKIP_PATHS.some((path) => pathname.startsWith(path))) {
    return null;
  }

  const enabled = await isIpWhitelistEnabled(spaceId);
  if (!enabled) {
    return null;
  }

  const clientIp = getClientIp(request);
  const allowed = await checkIp(spaceId, clientIp);

  if (!allowed) {
    childLogger.warn({ ip: clientIp, spaceId, pathname }, "IP not whitelisted - access denied");
    return NextResponse.json({ error: "Access denied: IP not whitelisted" }, { status: 403 });
  }

  return null;
}
