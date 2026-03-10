interface AnalyticsEvent {
  event: string;
  properties?: Record<string, unknown>;
  timestamp: string;
}

interface AnalyticsConfig {
  /** Endpoint to send batched events to */
  endpoint: string;
  /** Maximum events to queue before flushing */
  batchSize: number;
  /** Milliseconds to wait before auto-flushing */
  flushInterval: number;
}

const DEFAULT_CONFIG: AnalyticsConfig = {
  endpoint: "/api/analytics",
  batchSize: 10,
  flushInterval: 5000,
};

let eventQueue: AnalyticsEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let config: AnalyticsConfig = DEFAULT_CONFIG;

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function scheduleFlush(): void {
  if (flushTimer !== null) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flush();
  }, config.flushInterval);
}

/**
 * Flush all queued events by sending them to the analytics endpoint.
 * Events are sent as a batch in a single POST request.
 */
export async function flush(): Promise<void> {
  if (eventQueue.length === 0) return;

  const eventsToSend = [...eventQueue];
  eventQueue = [];

  if (flushTimer !== null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (!isProduction()) return;

  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: eventsToSend }),
      keepalive: true,
    });

    if (!response.ok) {
      // Re-queue events on failure (drop if queue is too large to prevent memory leak)
      if (eventQueue.length < config.batchSize * 5) {
        eventQueue = [...eventsToSend, ...eventQueue];
      }
    }
  } catch {
    // Re-queue on network failure (with limit)
    if (eventQueue.length < config.batchSize * 5) {
      eventQueue = [...eventsToSend, ...eventQueue];
    }
  }
}

/**
 * Track an analytics event.
 * In development: logs to console.
 * In production: queues the event and sends in batches.
 */
export function track(event: string, properties?: Record<string, unknown>): void {
  const analyticsEvent: AnalyticsEvent = {
    event,
    properties,
    timestamp: new Date().toISOString(),
  };

  if (!isProduction()) {
    // eslint-disable-next-line no-console
    console.log("[Analytics]", event, properties ?? "");
    return;
  }

  eventQueue.push(analyticsEvent);

  if (eventQueue.length >= config.batchSize) {
    void flush();
  } else {
    scheduleFlush();
  }
}

/**
 * Track a page view event with path and optional referrer.
 */
export function trackPageView(path: string, referrer?: string): void {
  track("page_view", { path, referrer });
}

/**
 * Track a user interaction event.
 */
export function trackInteraction(
  action: string,
  target: string,
  properties?: Record<string, unknown>,
): void {
  track("interaction", { action, target, ...properties });
}

/**
 * Track a client-side error.
 */
export function trackError(
  message: string,
  source?: string,
  properties?: Record<string, unknown>,
): void {
  track("client_error", { message, source, ...properties });
}

/**
 * Configure analytics settings. Call before tracking events.
 */
export function configureAnalytics(overrides: Partial<AnalyticsConfig>): void {
  config = { ...config, ...overrides };
}

/**
 * Get the current number of queued events (useful for testing).
 */
export function getQueueSize(): number {
  return eventQueue.length;
}
