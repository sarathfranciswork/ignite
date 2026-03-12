import { getEmailThemeConfig } from "./white-label.service";

interface EmailTheme {
  platformName: string;
  logoUrl: string | null;
  primaryColor: string;
  footerText: string | null;
}

/**
 * Wraps email body HTML with white-label themed header and footer.
 * Falls back to default Ignite branding if no white-label config exists.
 */
export async function wrapEmailWithTheme(bodyHtml: string): Promise<string> {
  const theme = await getEmailThemeConfig();
  return buildThemedEmail(theme, bodyHtml);
}

function buildThemedEmail(theme: EmailTheme, bodyHtml: string): string {
  const logoHtml = theme.logoUrl
    ? `<img src="${escapeHtml(theme.logoUrl)}" alt="${escapeHtml(theme.platformName)}" style="max-height: 40px; max-width: 200px;" />`
    : `<span style="font-size: 24px; font-weight: bold; color: ${escapeHtml(theme.primaryColor)};">${escapeHtml(theme.platformName)}</span>`;

  const footerHtml = theme.footerText
    ? `<p style="margin: 0; font-size: 12px; color: #9CA3AF;">${escapeHtml(theme.footerText)}</p>`
    : `<p style="margin: 0; font-size: 12px; color: #9CA3AF;">Sent by ${escapeHtml(theme.platformName)}</p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(theme.platformName)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F9FAFB; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F9FAFB;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 24px 32px; border-bottom: 2px solid ${escapeHtml(theme.primaryColor)};">
              ${logoHtml}
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #F9FAFB; border-top: 1px solid #E5E7EB;">
              ${footerHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
