import { getEnv } from "../lib/env";
import { baseLayoutTemplate } from "../templates/base-layout";
import { renderSubject, renderBody } from "../templates/notification-templates";
import {
  renderDigestSubject,
  renderDigestBody,
  type DigestData,
} from "../templates/digest-templates";

interface RenderNotificationParams {
  type: string;
  title: string;
  body?: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

interface RenderedEmail {
  subject: string;
  html: string;
}

export function renderNotificationEmail(
  params: RenderNotificationParams,
): RenderedEmail {
  const env = getEnv();
  const data = {
    title: params.title,
    body: params.body,
    link: params.link,
    ...params.metadata,
  };

  const subject = renderSubject(params.type, data);
  const content = renderBody(params.type, data);

  const html = baseLayoutTemplate({
    subject,
    appName: env.APP_NAME,
    appUrl: env.APP_URL,
    content,
  });

  return { subject, html };
}

export function renderDigestEmail(data: DigestData): RenderedEmail {
  const env = getEnv();

  const subject = renderDigestSubject(data);
  const content = renderDigestBody({ ...data, appUrl: env.APP_URL });

  const html = baseLayoutTemplate({
    subject,
    appName: env.APP_NAME,
    appUrl: env.APP_URL,
    content,
  });

  return { subject, html };
}
