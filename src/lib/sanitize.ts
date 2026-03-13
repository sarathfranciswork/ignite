import DOMPurify from "dompurify";

/**
 * Sanitizes HTML to prevent XSS attacks.
 * Only allows safe HTML tags and attributes.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty);
}
