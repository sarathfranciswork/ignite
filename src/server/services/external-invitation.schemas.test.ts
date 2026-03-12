import { describe, it, expect } from "vitest";
import {
  externalInvitationCreateInput,
  externalInvitationAcceptInput,
  externalInvitationRevokeInput,
  externalInvitationListInput,
  externalInvitationRevokeAccessInput,
} from "./external-invitation.schemas";

describe("externalInvitationCreateInput", () => {
  it("should accept valid input", () => {
    const result = externalInvitationCreateInput.safeParse({
      email: "test@example.com",
      campaignIds: ["camp1", "camp2"],
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid email", () => {
    const result = externalInvitationCreateInput.safeParse({
      email: "not-an-email",
      campaignIds: ["camp1"],
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty campaignIds", () => {
    const result = externalInvitationCreateInput.safeParse({
      email: "test@example.com",
      campaignIds: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("externalInvitationAcceptInput", () => {
  it("should accept valid token", () => {
    const result = externalInvitationAcceptInput.safeParse({
      token: "abc123",
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty token", () => {
    const result = externalInvitationAcceptInput.safeParse({
      token: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("externalInvitationRevokeInput", () => {
  it("should accept valid id", () => {
    const result = externalInvitationRevokeInput.safeParse({
      id: "inv1",
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty id", () => {
    const result = externalInvitationRevokeInput.safeParse({
      id: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("externalInvitationListInput", () => {
  it("should accept valid input with defaults", () => {
    const result = externalInvitationListInput.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(50);
    }
  });

  it("should accept campaignId filter", () => {
    const result = externalInvitationListInput.safeParse({
      campaignId: "camp1",
    });
    expect(result.success).toBe(true);
  });

  it("should reject limit over 100", () => {
    const result = externalInvitationListInput.safeParse({
      limit: 200,
    });
    expect(result.success).toBe(false);
  });
});

describe("externalInvitationRevokeAccessInput", () => {
  it("should accept valid input", () => {
    const result = externalInvitationRevokeAccessInput.safeParse({
      userId: "user1",
      campaignId: "camp1",
    });
    expect(result.success).toBe(true);
  });

  it("should reject missing userId", () => {
    const result = externalInvitationRevokeAccessInput.safeParse({
      campaignId: "camp1",
    });
    expect(result.success).toBe(false);
  });
});
