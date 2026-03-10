import { NextResponse } from "next/server";
import { getMetricsOutput, observeNodeMetrics } from "@/server/lib/metrics-store";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  // Snapshot current Node.js runtime metrics before rendering
  observeNodeMetrics();

  const metricsText = getMetricsOutput();

  return new NextResponse(metricsText, {
    headers: { "Content-Type": "text/plain; version=0.0.4; charset=utf-8" },
  });
}
