import { describe, it, expect } from "vitest";
import { whiteLabelUpdateInput } from "./white-label.schemas";

describe("white-label.schemas", () => {
  describe("whiteLabelUpdateInput", () => {
    it("accepts valid input with all fields", () => {
      const result = whiteLabelUpdateInput.safeParse({
        platformName: "My Platform",
        logoUrl: "https://example.com/logo.png",
        primaryColor: "#FF0000",
        secondaryColor: "#00FF00",
        accentColor: "#0000FF",
        customDomain: "innovation.company.com",
        emailPrimaryColor: "#FF0000",
        emailFooterText: "Powered by Innovation",
      });

      expect(result.success).toBe(true);
    });

    it("accepts empty input (all optional)", () => {
      const result = whiteLabelUpdateInput.safeParse({});
      expect(result.success).toBe(true);
    });

    it("accepts nullable fields set to null", () => {
      const result = whiteLabelUpdateInput.safeParse({
        logoUrl: null,
        customDomain: null,
        emailFooterText: null,
      });

      expect(result.success).toBe(true);
    });

    it("rejects invalid hex colors", () => {
      const result = whiteLabelUpdateInput.safeParse({
        primaryColor: "red",
      });

      expect(result.success).toBe(false);
    });

    it("rejects short hex colors", () => {
      const result = whiteLabelUpdateInput.safeParse({
        primaryColor: "#FFF",
      });

      expect(result.success).toBe(false);
    });

    it("rejects empty platform name", () => {
      const result = whiteLabelUpdateInput.safeParse({
        platformName: "",
      });

      expect(result.success).toBe(false);
    });

    it("rejects platform name over 100 chars", () => {
      const result = whiteLabelUpdateInput.safeParse({
        platformName: "x".repeat(101),
      });

      expect(result.success).toBe(false);
    });

    it("rejects custom domain over 253 chars", () => {
      const result = whiteLabelUpdateInput.safeParse({
        customDomain: "x".repeat(254),
      });

      expect(result.success).toBe(false);
    });

    it("rejects email footer text over 500 chars", () => {
      const result = whiteLabelUpdateInput.safeParse({
        emailFooterText: "x".repeat(501),
      });

      expect(result.success).toBe(false);
    });
  });
});
