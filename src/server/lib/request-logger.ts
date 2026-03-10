import { type NextRequest, NextResponse } from "next/server";
import { createChildLogger, type Logger } from "./logger";

type RouteHandler = (
  request: NextRequest,
  context?: { params: Record<string, string> },
) => Promise<NextResponse>;

interface RequestLogData {
  method: string;
  path: string;
  statusCode: number;
  duration_ms: number;
  user_agent: string | null;
  ip: string | null;
  requestId: string;
}

function generateRequestId(): string {
  return crypto.randomUUID();
}

function getClientIp(request: NextRequest): string | null {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null
  );
}

/**
 * Wraps a Next.js API route handler with structured request logging.
 * Assigns a unique request ID and logs method, path, status, and duration.
 */
export function withRequestLogging(handler: RouteHandler): RouteHandler {
  return async (
    request: NextRequest,
    context?: { params: Record<string, string> },
  ): Promise<NextResponse> => {
    const existingRequestId = request.headers.get("x-request-id");
    const requestId = existingRequestId ?? generateRequestId();
    const start = performance.now();

    const requestLogger: Logger = createChildLogger({
      requestId,
      service: "http",
    });

    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;

    requestLogger.info({ method, path }, "Incoming request");

    let response: NextResponse;
    try {
      response = await handler(request, context);
    } catch (error: unknown) {
      const duration_ms = Math.round(performance.now() - start);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      requestLogger.error(
        {
          method,
          path,
          duration_ms,
          error: errorMessage,
        },
        "Request failed with unhandled error",
      );

      response = NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }

    const duration_ms = Math.round(performance.now() - start);
    const statusCode = response.status;
    const user_agent = request.headers.get("user-agent");
    const ip = getClientIp(request);

    const logData: RequestLogData = {
      method,
      path,
      statusCode,
      duration_ms,
      user_agent,
      ip,
      requestId,
    };

    if (statusCode >= 500) {
      requestLogger.error(logData, "Request completed with server error");
    } else if (statusCode >= 400) {
      requestLogger.warn(logData, "Request completed with client error");
    } else {
      requestLogger.info(logData, "Request completed");
    }

    response.headers.set("x-request-id", requestId);

    return response;
  };
}
