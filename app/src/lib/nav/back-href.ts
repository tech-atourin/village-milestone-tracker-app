/**
 * Sanitize a `?from=` query param into a safe internal back URL.
 *
 * Only accepts same-origin internal paths (starts with single `/`, not `//`).
 * Falls back to the supplied default when missing or invalid. Used by detail
 * pages reached from multiple entry points so the "Kembali" link points at
 * the page the user actually came from, not a hard-coded scope home.
 */
export function sanitizeBackHref(
  from: string | string[] | undefined,
  fallback: string,
): string {
  const raw = Array.isArray(from) ? from[0] : from;
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  return raw;
}

/**
 * Append `?from=<current>` to an outgoing link so the destination page can
 * route the user back here. Encodes the path. Existing query params on `href`
 * are preserved.
 */
export function withFrom(href: string, from: string): string {
  const sep = href.includes("?") ? "&" : "?";
  return `${href}${sep}from=${encodeURIComponent(from)}`;
}
