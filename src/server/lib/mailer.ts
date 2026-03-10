import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { getEnv } from "./env";

let transporter: Transporter | undefined;

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

export function getTransporter(): Transporter {
  if (transporter) return transporter;
  const env = getEnv();

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    ...(env.SMTP_USER && env.SMTP_PASS
      ? {
          auth: {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
          },
        }
      : {}),
  });
  return transporter;
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  const env = getEnv();
  const transport = getTransporter();

  await transport.sendMail({
    from: env.EMAIL_FROM,
    to: message.to,
    subject: message.subject,
    html: message.html,
  });
}
