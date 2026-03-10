/**
 * Lightweight in-memory Prometheus-compatible metrics store.
 * No external dependencies -- pure TypeScript.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MetricType = "counter" | "gauge" | "histogram";

interface MetricMeta {
  name: string;
  help: string;
  type: MetricType;
}

interface CounterValue {
  labels: Record<string, string>;
  value: number;
}

interface GaugeValue {
  labels: Record<string, string>;
  value: number;
}

interface HistogramValue {
  labels: Record<string, string>;
  count: number;
  sum: number;
  buckets: Map<number, number>; // upper-bound -> cumulative count
}

const DEFAULT_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

const counterStore = new Map<string, CounterValue[]>();
const gaugeStore = new Map<string, GaugeValue[]>();
const histogramStore = new Map<string, { buckets: number[]; values: HistogramValue[] }>();
const metricsMeta = new Map<string, MetricMeta>();

// ---------------------------------------------------------------------------
// Registration helpers
// ---------------------------------------------------------------------------

function registerMeta(name: string, help: string, type: MetricType): void {
  if (!metricsMeta.has(name)) {
    metricsMeta.set(name, { name, help, type });
  }
}

// ---------------------------------------------------------------------------
// Label key helper
// ---------------------------------------------------------------------------

function labelKey(labels: Record<string, string>): string {
  return Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}="${v}"`)
    .join(",");
}

function formatLabels(labels: Record<string, string>): string {
  const parts = Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}="${v}"`);
  return parts.length > 0 ? `{${parts.join(",")}}` : "";
}

// ---------------------------------------------------------------------------
// Counter
// ---------------------------------------------------------------------------

export function incrementCounter(
  name: string,
  help: string,
  labels: Record<string, string> = {},
  value = 1,
): void {
  registerMeta(name, help, "counter");

  if (!counterStore.has(name)) {
    counterStore.set(name, []);
  }

  const entries = counterStore.get(name)!;
  const key = labelKey(labels);
  const existing = entries.find((e) => labelKey(e.labels) === key);

  if (existing) {
    existing.value += value;
  } else {
    entries.push({ labels, value });
  }
}

// ---------------------------------------------------------------------------
// Gauge
// ---------------------------------------------------------------------------

export function setGauge(
  name: string,
  help: string,
  value: number,
  labels: Record<string, string> = {},
): void {
  registerMeta(name, help, "gauge");

  if (!gaugeStore.has(name)) {
    gaugeStore.set(name, []);
  }

  const entries = gaugeStore.get(name)!;
  const key = labelKey(labels);
  const existing = entries.find((e) => labelKey(e.labels) === key);

  if (existing) {
    existing.value = value;
  } else {
    entries.push({ labels, value });
  }
}

// ---------------------------------------------------------------------------
// Histogram
// ---------------------------------------------------------------------------

export function observeHistogram(
  name: string,
  help: string,
  value: number,
  labels: Record<string, string> = {},
  buckets: number[] = DEFAULT_BUCKETS,
): void {
  registerMeta(name, help, "histogram");

  if (!histogramStore.has(name)) {
    histogramStore.set(name, { buckets, values: [] });
  }

  const store = histogramStore.get(name)!;
  const key = labelKey(labels);
  let existing = store.values.find((e) => labelKey(e.labels) === key);

  if (!existing) {
    const bucketMap = new Map<number, number>();
    for (const b of store.buckets) {
      bucketMap.set(b, 0);
    }
    existing = { labels, count: 0, sum: 0, buckets: bucketMap };
    store.values.push(existing);
  }

  existing.count += 1;
  existing.sum += value;

  for (const b of store.buckets) {
    if (value <= b) {
      existing.buckets.set(b, (existing.buckets.get(b) ?? 0) + 1);
    }
  }
}

// ---------------------------------------------------------------------------
// Pre-registered application metrics (convenience wrappers)
// ---------------------------------------------------------------------------

export function recordHttpRequest(
  method: string,
  path: string,
  status: number,
  durationSeconds: number,
): void {
  const statusStr = String(status);
  incrementCounter("ignite_http_requests_total", "Total number of HTTP requests", {
    method,
    path,
    status: statusStr,
  });
  observeHistogram(
    "ignite_http_request_duration_seconds",
    "HTTP request duration in seconds",
    durationSeconds,
    { method, path },
  );
}

export function recordDbQuery(durationSeconds: number): void {
  observeHistogram(
    "ignite_db_query_duration_seconds",
    "Database query duration in seconds",
    durationSeconds,
  );
}

export function setActiveConnections(count: number): void {
  setGauge("ignite_active_connections", "Number of active connections", count);
}

export function incrementErrors(type: string): void {
  incrementCounter("ignite_errors_total", "Total number of errors", { type });
}

// ---------------------------------------------------------------------------
// Node.js runtime metrics snapshot
// ---------------------------------------------------------------------------

export function observeNodeMetrics(): void {
  const mem = process.memoryUsage();
  setGauge("nodejs_heap_bytes", "Node.js heap memory in bytes", mem.heapUsed, {
    type: "used",
  });
  setGauge("nodejs_heap_bytes", "Node.js heap memory in bytes", mem.heapTotal, {
    type: "total",
  });

  // Event-loop lag approximation: measure how late a setImmediate fires.
  // Since this is called synchronously before rendering, we store the last
  // measured value and update it asynchronously for the *next* scrape.
  setGauge(
    "nodejs_event_loop_lag_seconds",
    "Approximate Node.js event loop lag in seconds",
    lastEventLoopLag,
  );

  // Schedule a measurement for the next scrape
  measureEventLoopLag();
}

let lastEventLoopLag = 0;

function measureEventLoopLag(): void {
  const start = performance.now();
  setTimeout(() => {
    lastEventLoopLag = (performance.now() - start) / 1000;
  }, 0);
}

// ---------------------------------------------------------------------------
// Uptime gauge (always present)
// ---------------------------------------------------------------------------

function renderUptimeMetrics(): string {
  const lines: string[] = [];
  lines.push("# HELP ignite_up Whether the Ignite application is up");
  lines.push("# TYPE ignite_up gauge");
  lines.push("ignite_up 1");
  lines.push("");
  lines.push("# HELP ignite_uptime_seconds Application uptime in seconds");
  lines.push("# TYPE ignite_uptime_seconds gauge");
  lines.push(`ignite_uptime_seconds ${Math.floor(process.uptime())}`);
  lines.push("");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Prometheus text rendering
// ---------------------------------------------------------------------------

export function getMetricsOutput(): string {
  const lines: string[] = [];

  // Static uptime metrics
  lines.push(renderUptimeMetrics());

  // Counters
  for (const [name, entries] of counterStore) {
    const meta = metricsMeta.get(name);
    if (meta) {
      lines.push(`# HELP ${meta.name} ${meta.help}`);
      lines.push(`# TYPE ${meta.name} counter`);
    }
    for (const entry of entries) {
      lines.push(`${name}${formatLabels(entry.labels)} ${entry.value}`);
    }
    lines.push("");
  }

  // Gauges
  for (const [name, entries] of gaugeStore) {
    const meta = metricsMeta.get(name);
    if (meta) {
      lines.push(`# HELP ${meta.name} ${meta.help}`);
      lines.push(`# TYPE ${meta.name} gauge`);
    }
    for (const entry of entries) {
      lines.push(`${name}${formatLabels(entry.labels)} ${entry.value}`);
    }
    lines.push("");
  }

  // Histograms
  for (const [name, store] of histogramStore) {
    const meta = metricsMeta.get(name);
    if (meta) {
      lines.push(`# HELP ${meta.name} ${meta.help}`);
      lines.push(`# TYPE ${meta.name} histogram`);
    }
    for (const entry of store.values) {
      const lblStr = formatLabels(entry.labels);
      const lblPrefix = Object.keys(entry.labels).length > 0 ? lblStr.slice(0, -1) + "," : "{";

      for (const b of store.buckets) {
        const cumulative = entry.buckets.get(b) ?? 0;
        lines.push(`${name}_bucket${lblPrefix}le="${b}"} ${cumulative}`);
      }
      lines.push(`${name}_bucket${lblPrefix}le="+Inf"} ${entry.count}`);
      lines.push(`${name}_sum${lblStr} ${entry.sum}`);
      lines.push(`${name}_count${lblStr} ${entry.count}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
