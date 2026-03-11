import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { logger } from "./logger";

const childLogger = logger.child({ service: "email" });

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 1025;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM ?? "noreply@ignite.local";

function isSmtpConfigured(): boolean {
  return !!SMTP_HOST;
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;

  if (!isSmtpConfigured()) {
    childLogger.warn("SMTP not configured — emails will be logged but not sent");
    transporter = nodemailer.createTransport({
      jsonTransport: true,
    });
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    ...(SMTP_USER && SMTP_PASS ? { auth: { user: SMTP_USER, pass: SMTP_PASS } } : {}),
  });

  return transporter;
}

export async function sendEmail(message: EmailMessage): Promise<boolean> {
  const transport = getTransporter();

  try {
    const info = await transport.sendMail({
      from: SMTP_FROM,
      to: message.to,
      subject: message.subject,
      html: message.html,
      ...(message.text ? { text: message.text } : {}),
    });

    if (!isSmtpConfigured()) {
      childLogger.info(
        { to: message.to, subject: message.subject },
        "Email logged (SMTP not configured)",
      );
    } else {
      childLogger.info(
        { to: message.to, subject: message.subject, messageId: info.messageId },
        "Email sent",
      );
    }

    return true;
  } catch (error) {
    childLogger.error({ to: message.to, subject: message.subject, error }, "Failed to send email");
    return false;
  }
}

export function resetTransporter(): void {
  transporter = null;
}
