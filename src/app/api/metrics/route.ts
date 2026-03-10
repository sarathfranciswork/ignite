import { NextResponse } from "next/server";

// Prometheus-format metrics endpoint
// Full prom-client integration added in Story 1.6
export async function GET(): Promise<NextResponse> {
  const metrics = [
    "# HELP ignite_up Whether the Ignite application is up",
    "# TYPE ignite_up gauge",
    "ignite_up 1",
    "",
    "# HELP ignite_uptime_seconds Application uptime in seconds",
    "# TYPE ignite_uptime_seconds gauge",
    `ignite_uptime_seconds ${Math.floor(process.uptime())}`,
    "",
    `# HELP nodejs_heap_size_used_bytes Node.js heap size used`,
    "# TYPE nodejs_heap_size_used_bytes gauge",
    `nodejs_heap_size_used_bytes ${process.memoryUsage().heapUsed}`,
    "",
    `# HELP nodejs_heap_size_total_bytes Node.js heap size total`,
    "# TYPE nodejs_heap_size_total_bytes gauge",
    `nodejs_heap_size_total_bytes ${process.memoryUsage().heapTotal}`,
    "",
  ].join("\n");

  return new NextResponse(metrics, {
    headers: { "Content-Type": "text/plain; version=0.0.4; charset=utf-8" },
  });
}
