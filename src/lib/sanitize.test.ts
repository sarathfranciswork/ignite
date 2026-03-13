import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock DOMPurify since we're in a node environment without a real DOM
vi.mock("dompurify", () => {
  const sanitize = vi.fn((dirty: string) => {
    // Simulate DOMPurify behavior: strip script tags and event handlers
    return dirty
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/\s*on\w+="[^"]*"/gi, "")
      .replace(/\s*on\w+='[^']*'/gi, "");
  });
  return { default: { sanitize }, sanitize };
});

import { sanitizeHtml } from "./sanitize";

describe("sanitizeHtml", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes through safe HTML unchanged", () => {
    const safe = "<p>Hello <strong>world</strong></p>";
    const result = sanitizeHtml(safe);
    expect(result).toBe(safe);
  });

  it("strips script tags", () => {
    const malicious = '<p>Hello</p><script>alert("xss")</script>';
    const result = sanitizeHtml(malicious);
    expect(result).not.toContain("<script");
    expect(result).toContain("<p>Hello</p>");
  });

  it("strips event handler attributes", () => {
    const malicious = '<img src="x" onerror="alert(1)">';
    const result = sanitizeHtml(malicious);
    expect(result).not.toContain("onerror");
  });

  it("handles empty string", () => {
    expect(sanitizeHtml("")).toBe("");
  });

  it("delegates to DOMPurify.sanitize", async () => {
    const DOMPurify = await import("dompurify");
    sanitizeHtml("<p>test</p>");
    expect(DOMPurify.default.sanitize).toHaveBeenCalledWith("<p>test</p>");
  });
});
