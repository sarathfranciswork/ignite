import { describe, it, expect } from "vitest";
import {
  pushSubscriptionSubscribeInput,
  pushSubscriptionUnsubscribeInput,
  pushNotificationSendInput,
} from "./push.schemas";

describe("pushSubscriptionSubscribeInput", () => {
  it("validates a correct subscription input", () => {
    const input = {
      endpoint: "https://push.example.com/v1/sub/abc123",
      keys: {
        p256dh: "BNtest-key",
        auth: "auth-secret",
      },
      userAgent: "Mozilla/5.0",
    };

    const result = pushSubscriptionSubscribeInput.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("rejects missing endpoint", () => {
    const input = {
      keys: { p256dh: "key", auth: "auth" },
    };

    const result = pushSubscriptionSubscribeInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects invalid endpoint URL", () => {
    const input = {
      endpoint: "not-a-url",
      keys: { p256dh: "key", auth: "auth" },
    };

    const result = pushSubscriptionSubscribeInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects empty keys", () => {
    const input = {
      endpoint: "https://push.example.com/v1/sub/abc123",
      keys: { p256dh: "", auth: "" },
    };

    const result = pushSubscriptionSubscribeInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("allows optional userAgent", () => {
    const input = {
      endpoint: "https://push.example.com/v1/sub/abc123",
      keys: { p256dh: "key", auth: "auth" },
    };

    const result = pushSubscriptionSubscribeInput.safeParse(input);
    expect(result.success).toBe(true);
  });
});

describe("pushSubscriptionUnsubscribeInput", () => {
  it("validates a correct unsubscribe input", () => {
    const input = { endpoint: "https://push.example.com/v1/sub/abc123" };
    const result = pushSubscriptionUnsubscribeInput.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("rejects missing endpoint", () => {
    const result = pushSubscriptionUnsubscribeInput.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects invalid URL endpoint", () => {
    const result = pushSubscriptionUnsubscribeInput.safeParse({ endpoint: "invalid" });
    expect(result.success).toBe(false);
  });
});

describe("pushNotificationSendInput", () => {
  it("validates a correct send input", () => {
    const input = {
      userId: "user-1",
      title: "Test notification",
      body: "This is a test",
      url: "/campaigns/123",
      tag: "test-tag",
    };

    const result = pushNotificationSendInput.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const result = pushNotificationSendInput.safeParse({ userId: "user-1" });
    expect(result.success).toBe(false);
  });

  it("allows optional url, tag, entityType, and entityId", () => {
    const input = {
      userId: "user-1",
      title: "Test",
      body: "Body",
    };

    const result = pushNotificationSendInput.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("rejects empty userId", () => {
    const input = {
      userId: "",
      title: "Test",
      body: "Body",
    };

    const result = pushNotificationSendInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects title exceeding max length", () => {
    const input = {
      userId: "user-1",
      title: "x".repeat(256),
      body: "Body",
    };

    const result = pushNotificationSendInput.safeParse(input);
    expect(result.success).toBe(false);
  });
});
