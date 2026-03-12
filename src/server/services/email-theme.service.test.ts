import { describe, it, expect, vi, beforeEach } from "vitest";
import { wrapEmailWithTheme } from "./email-theme.service";

vi.mock("./white-label.service", () => ({
  getEmailThemeConfig: vi.fn(),
}));

const { getEmailThemeConfig } = await import("./white-label.service");
const mockGetEmailTheme = getEmailThemeConfig as ReturnType<typeof vi.fn>;

describe("email-theme.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("wrapEmailWithTheme", () => {
    it("wraps body HTML with themed template", async () => {
      mockGetEmailTheme.mockResolvedValue({
        platformName: "TestPlatform",
        logoUrl: "https://example.com/logo.png",
        primaryColor: "#FF0000",
        footerText: "Custom footer",
      });

      const result = await wrapEmailWithTheme("<p>Hello World</p>");

      expect(result).toContain("<!DOCTYPE html>");
      expect(result).toContain("<p>Hello World</p>");
      expect(result).toContain("TestPlatform");
      expect(result).toContain("https://example.com/logo.png");
      expect(result).toContain("#FF0000");
      expect(result).toContain("Custom footer");
    });

    it("uses text fallback when no logo URL", async () => {
      mockGetEmailTheme.mockResolvedValue({
        platformName: "NoBrandLogo",
        logoUrl: null,
        primaryColor: "#6366F1",
        footerText: null,
      });

      const result = await wrapEmailWithTheme("<p>Test</p>");

      expect(result).toContain("NoBrandLogo");
      expect(result).not.toContain("<img");
      expect(result).toContain("Sent by NoBrandLogo");
    });

    it("escapes HTML in platform name", async () => {
      mockGetEmailTheme.mockResolvedValue({
        platformName: "<script>alert(1)</script>",
        logoUrl: null,
        primaryColor: "#6366F1",
        footerText: null,
      });

      const result = await wrapEmailWithTheme("<p>Test</p>");

      expect(result).not.toContain("<script>");
      expect(result).toContain("&lt;script&gt;");
    });
  });
});
