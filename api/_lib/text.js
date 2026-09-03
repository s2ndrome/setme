// Small shared sanitizers for plain text / URL fields on the homes table
// (site name, banner title, favicon/cursor/banner image URLs) — same
// defensive style as css.js/theme.js: clamp length, never throw.
export function sanitizeShortText(raw, maxLen = 60) {
  return String(raw ?? '').trim().slice(0, maxLen);
}

// Restricts to http(s) (our own Blob uploads are always https) so these
// values are safe to drop into href/src attributes without further escaping
// concerns beyond the usual escapeHtml() on render.
export function sanitizeUrl(raw, maxLen = 500) {
  const value = String(raw ?? '').trim().slice(0, maxLen);
  return /^https?:\/\//i.test(value) ? value : '';
}
