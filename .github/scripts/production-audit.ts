/**
 * Production Audit Script
 *
 * Performs functional and visual auditing of the live Ignite application
 * using Playwright. Outputs a JSON report and screenshots.
 *
 * Usage:
 *   AUDIT_MODE=development PROD_URL=https://... npx tsx .github/scripts/production-audit.ts
 *
 * Environment variables:
 *   PROD_URL    - The production URL to audit (required)
 *   AUDIT_MODE  - "development" or "full" (default: "development")
 */

import { chromium } from "@playwright/test";
import type { Browser, BrowserContext, Page } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

// ── Types ────────────────────────────────────────────────────────────────────

interface BrokenResource {
  url: string;
  status: number;
  type: string;
}

interface PageAuditResult {
  route: string;
  url: string;
  status: number;
  loadTimeMs: number;
  consoleErrors: string[];
  consoleWarnings: string[];
  brokenResources: BrokenResource[];
  screenshotPath: string;
  hasComingSoon: boolean;
  error: string | null;
}

interface HealthCheckResult {
  healthy: boolean;
  status: number;
  data: Record<string, unknown> | null;
  error: string | null;
}

interface MetricsResult {
  available: boolean;
  status: number;
  data: Record<string, unknown> | null;
  error: string | null;
}

interface AuditReport {
  timestamp: string;
  prodUrl: string;
  auditMode: string;
  health: HealthCheckResult;
  metrics: MetricsResult;
  pages: PageAuditResult[];
  summary: {
    totalPages: number;
    successfulPages: number;
    serverErrors: number;
    jsErrorPages: number;
    brokenResourcePages: number;
    comingSoonPages: number;
    avgLoadTimeMs: number;
  };
}

// ── Configuration ────────────────────────────────────────────────────────────

const PROD_URL: string = process.env.PROD_URL ?? "";
const AUDIT_MODE = process.env.AUDIT_MODE || "development";

if (!PROD_URL) {
  process.stderr.write("ERROR: PROD_URL environment variable is required\n");
  process.exit(1);
}

const OUTPUT_DIR = path.resolve("audit-report");
const SCREENSHOT_DIR = path.join(OUTPUT_DIR, "screenshots");

const ROUTES: string[] = [
  "/",
  "/login",
  "/register",
  "/dashboard",
  "/campaigns",
  "/channels",
  "/explore",
  "/tasks",
  "/reports",
  "/profile",
  "/projects",
  "/partners",
  "/strategy/trends",
  "/strategy/technologies",
  "/strategy/insights",
  "/strategy/sias",
  "/admin/users",
  "/admin/org-units",
  "/admin/groups",
  "/admin/notifications",
  "/admin/customization",
  "/admin/settings",
];

// Page load timeout in milliseconds
const PAGE_TIMEOUT = 30_000;

// ── Helpers ──────────────────────────────────────────────────────────────────

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function sanitizeRouteName(route: string): string {
  if (route === "/") return "home";
  return route.replace(/^\//, "").replace(/\//g, "-");
}

async function fetchJson(
  url: string,
): Promise<{ status: number; data: Record<string, unknown> | null; error: string | null }> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
    });
    const status = response.status;
    let data: Record<string, unknown> | null = null;
    try {
      data = (await response.json()) as Record<string, unknown>;
    } catch {
      // Response is not JSON
    }
    return { status, data, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: 0, data: null, error: message };
  }
}

// ── Health Check ─────────────────────────────────────────────────────────────

async function checkHealth(): Promise<HealthCheckResult> {
  const url = `${PROD_URL}/api/health`;
  process.stdout.write(`Checking health: ${url}\n`);

  const result = await fetchJson(url);

  const healthy =
    result.status === 200 &&
    result.data !== null &&
    (result.data.status === "ok" ||
      result.data.status === "healthy" ||
      result.data.healthy === true);

  return {
    healthy,
    status: result.status,
    data: result.data,
    error: result.error,
  };
}

// ── Metrics ──────────────────────────────────────────────────────────────────

async function checkMetrics(): Promise<MetricsResult> {
  const url = `${PROD_URL}/api/metrics`;
  process.stdout.write(`Checking metrics: ${url}\n`);

  const result = await fetchJson(url);

  return {
    available: result.status === 200,
    status: result.status,
    data: result.data,
    error: result.error,
  };
}

// ── Page Audit ───────────────────────────────────────────────────────────────

async function auditPage(context: BrowserContext, route: string): Promise<PageAuditResult> {
  const url = `${PROD_URL}${route}`;
  const routeName = sanitizeRouteName(route);
  const screenshotPath = path.join("screenshots", `${routeName}.png`);
  const absoluteScreenshotPath = path.join(OUTPUT_DIR, screenshotPath);

  const result: PageAuditResult = {
    route,
    url,
    status: 0,
    loadTimeMs: 0,
    consoleErrors: [],
    consoleWarnings: [],
    brokenResources: [],
    screenshotPath,
    hasComingSoon: false,
    error: null,
  };

  let page: Page | null = null;

  try {
    page = await context.newPage();

    // Track console messages
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        result.consoleErrors.push(msg.text());
      } else if (msg.type() === "warning") {
        result.consoleWarnings.push(msg.text());
      }
    });

    // Track failed resource requests (broken images, CSS, 404s)
    page.on("response", (response) => {
      const status = response.status();
      if (status >= 400) {
        const resourceUrl = response.url();
        // Determine resource type from URL or content-type
        let type = "unknown";
        if (resourceUrl.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)(\?|$)/i)) {
          type = "image";
        } else if (resourceUrl.match(/\.(css)(\?|$)/i)) {
          type = "stylesheet";
        } else if (resourceUrl.match(/\.(js|mjs)(\?|$)/i)) {
          type = "script";
        } else if (resourceUrl.match(/\.(woff|woff2|ttf|eot)(\?|$)/i)) {
          type = "font";
        } else {
          type = "other";
        }

        result.brokenResources.push({
          url: resourceUrl,
          status,
          type,
        });
      }
    });

    // Navigate and measure load time
    const startTime = Date.now();

    const response = await page.goto(url, {
      waitUntil: "networkidle",
      timeout: PAGE_TIMEOUT,
    });

    result.loadTimeMs = Date.now() - startTime;
    result.status = response?.status() ?? 0;

    // Wait a brief moment for any late-loading content
    await page.waitForTimeout(1000);

    // Check for "Coming Soon" placeholder content
    const bodyText = await page.textContent("body").catch(() => "");
    if (bodyText) {
      const lowerText = bodyText.toLowerCase();
      result.hasComingSoon =
        lowerText.includes("coming soon") ||
        lowerText.includes("under construction") ||
        lowerText.includes("placeholder") ||
        lowerText.includes("not yet implemented");
    }

    // Take screenshot
    await page.screenshot({
      path: absoluteScreenshotPath,
      fullPage: true,
    });

    process.stdout.write(
      `  [${result.status}] ${route} - ${result.loadTimeMs}ms` +
        `${result.consoleErrors.length > 0 ? ` (${result.consoleErrors.length} JS errors)` : ""}` +
        `${result.brokenResources.length > 0 ? ` (${result.brokenResources.length} broken resources)` : ""}` +
        `${result.hasComingSoon ? " [Coming Soon]" : ""}\n`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    result.error = message;
    process.stderr.write(`  [ERROR] ${route}: ${message}\n`);

    // Try to take a screenshot even on error
    if (page) {
      try {
        await page.screenshot({
          path: absoluteScreenshotPath,
          fullPage: true,
        });
      } catch {
        // Screenshot failed too, skip it
      }
    }
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
  }

  return result;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  process.stdout.write(`\n=== Ignite Production Audit ===\n`);
  process.stdout.write(`URL:  ${PROD_URL}\n`);
  process.stdout.write(`Mode: ${AUDIT_MODE}\n`);
  process.stdout.write(`Time: ${new Date().toISOString()}\n\n`);

  // Ensure output directories exist
  ensureDir(OUTPUT_DIR);
  ensureDir(SCREENSHOT_DIR);

  // Step 1: Health check
  process.stdout.write("--- Health Check ---\n");
  const health = await checkHealth();
  process.stdout.write(
    `Health: ${health.healthy ? "PASS" : "FAIL"} (status: ${health.status})\n\n`,
  );

  // Step 2: Metrics check
  process.stdout.write("--- Metrics Check ---\n");
  const metrics = await checkMetrics();
  process.stdout.write(
    `Metrics: ${metrics.available ? "available" : "unavailable"} (status: ${metrics.status})\n\n`,
  );

  // Step 3: Page audits
  process.stdout.write("--- Page Audits ---\n");
  process.stdout.write(`Auditing ${ROUTES.length} routes...\n\n`);

  let browser: Browser | null = null;
  const pageResults: PageAuditResult[] = [];

  try {
    browser = await chromium.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent:
        "IgniteAuditBot/1.0 (Production Audit; +https://github.com/sarathfranciswork/ignite)",
    });

    // Audit each route sequentially (to avoid overwhelming the server)
    for (const route of ROUTES) {
      const result = await auditPage(context, route);
      pageResults.push(result);
    }

    await context.close();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Browser error: ${message}\n`);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }

  // Step 4: Build summary
  const successfulPages = pageResults.filter(
    (p) => p.status >= 200 && p.status < 400 && !p.error,
  ).length;
  const serverErrors = pageResults.filter((p) => p.status >= 500).length;
  const jsErrorPages = pageResults.filter((p) => p.consoleErrors.length > 0).length;
  const brokenResourcePages = pageResults.filter((p) => p.brokenResources.length > 0).length;
  const comingSoonPages = pageResults.filter((p) => p.hasComingSoon).length;
  const totalLoadTime = pageResults.reduce((sum, p) => sum + p.loadTimeMs, 0);
  const avgLoadTimeMs = pageResults.length > 0 ? Math.round(totalLoadTime / pageResults.length) : 0;

  // Step 5: Build report
  const report: AuditReport = {
    timestamp: new Date().toISOString(),
    prodUrl: PROD_URL,
    auditMode: AUDIT_MODE,
    health,
    metrics,
    pages: pageResults,
    summary: {
      totalPages: pageResults.length,
      successfulPages,
      serverErrors,
      jsErrorPages,
      brokenResourcePages,
      comingSoonPages,
      avgLoadTimeMs,
    },
  };

  // Step 6: Write report
  const reportPath = path.join(OUTPUT_DIR, "audit-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  process.stdout.write(`\nReport written to: ${reportPath}\n`);

  // Step 7: Print summary
  process.stdout.write("\n=== Audit Summary ===\n");
  process.stdout.write(`Total pages:          ${pageResults.length}\n`);
  process.stdout.write(`Successful (2xx/3xx): ${successfulPages}\n`);
  process.stdout.write(`Server errors (5xx):  ${serverErrors}\n`);
  process.stdout.write(`JS error pages:       ${jsErrorPages}\n`);
  process.stdout.write(`Broken resource pages: ${brokenResourcePages}\n`);
  process.stdout.write(`Coming Soon pages:    ${comingSoonPages}\n`);
  process.stdout.write(`Avg load time:        ${avgLoadTimeMs}ms\n`);
  process.stdout.write(`Health:               ${health.healthy ? "PASS" : "FAIL"}\n`);

  if (AUDIT_MODE === "development") {
    process.stdout.write(
      "\nMode: development - Only CRITICAL and BUG findings will be reported.\n",
    );
    process.stdout.write(
      "Coming Soon pages and missing features are expected and will not be flagged.\n",
    );
  } else {
    process.stdout.write(
      "\nMode: full - All findings including missing features will be reported.\n",
    );
  }

  // Exit with non-zero if there are critical issues (server errors or health failure)
  // but do NOT fail the workflow — let Claude analyze and create issues
  if (!health.healthy || serverErrors > 0) {
    process.stdout.write("\nWARNING: Critical issues detected. See report for details.\n");
  }

  process.stdout.write("\nAudit complete.\n");
}

main().catch((err) => {
  process.stderr.write(`Fatal audit error: ${err}\n`);
  // Write a minimal report even on fatal error
  ensureDir(OUTPUT_DIR);
  const errorReport: AuditReport = {
    timestamp: new Date().toISOString(),
    prodUrl: PROD_URL ?? "unknown",
    auditMode: AUDIT_MODE,
    health: { healthy: false, status: 0, data: null, error: "Audit script crashed" },
    metrics: { available: false, status: 0, data: null, error: "Audit script crashed" },
    pages: [],
    summary: {
      totalPages: 0,
      successfulPages: 0,
      serverErrors: 0,
      jsErrorPages: 0,
      brokenResourcePages: 0,
      comingSoonPages: 0,
      avgLoadTimeMs: 0,
    },
  };
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "audit-report.json"),
    JSON.stringify(errorReport, null, 2),
  );
  process.exit(1);
});
