/**
 * Escapes a string for safe use inside an HTML attribute value (e.g. src="...").
 * Replaces &, ", ', <, > and backtick with their HTML entities.
 */
export function escapeHtmlAttr(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/&/g, "&")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/`/g, "&#x60;");
}

/**
 * Escapes a string for safe use as HTML text content.
 */
export function escapeHtml(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * Validates that a URL is safe to use as an image src.
 * Only allows https:// URLs with no quotes or control characters.
 * Returns the URL if valid, or empty string if invalid.
 */
export function sanitizeImageUrl(url: string | null | undefined): string {
  if (!url) return "";
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") return "";
    // Reject if the URL contains quotes or angle brackets (extra safety)
    if (/["'<>`]/.test(trimmed)) return "";
    return trimmed;
  } catch {
    return "";
  }
}