import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendEmail, resetTransporter } from "./email";

vi.mock("nodemailer", () => {
  const sendMailMock = vi.fn().mockResolvedValue({ messageId: "test-id-123" });
  return {
    default: {
      createTransport: vi.fn(() => ({
        sendMail: sendMailMock,
      })),
    },
  };
});

vi.mock("./logger", () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  },
}));

const nodemailer = await import("nodemailer");
const createTransportMock = nodemailer.default.createTransport as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  resetTransporter();
});

describe("sendEmail", () => {
  it("sends an email and returns true on success", async () => {
    const result = await sendEmail({
      to: "user@example.com",
      subject: "Test Subject",
      html: "<p>Hello</p>",
    });

    expect(result).toBe(true);
    expect(createTransportMock).toHaveBeenCalled();
  });

  it("sends email with text fallback", async () => {
    const result = await sendEmail({
      to: "user@example.com",
      subject: "Test",
      html: "<p>Hello</p>",
      text: "Hello",
    });

    expect(result).toBe(true);
  });

  it("returns false when sendMail throws", async () => {
    const sendMailMock = vi.fn().mockRejectedValue(new Error("SMTP error"));
    createTransportMock.mockReturnValue({ sendMail: sendMailMock });
    resetTransporter();

    const result = await sendEmail({
      to: "user@example.com",
      subject: "Test",
      html: "<p>Hello</p>",
    });

    expect(result).toBe(false);
  });

  it("reuses transporter across calls", async () => {
    await sendEmail({ to: "a@test.com", subject: "1", html: "<p>1</p>" });
    await sendEmail({ to: "b@test.com", subject: "2", html: "<p>2</p>" });

    expect(createTransportMock).toHaveBeenCalledTimes(1);
  });
});
