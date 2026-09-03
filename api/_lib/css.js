const MAX_CSS_BYTES = 20000;

// Not a full CSS parser — just strips the well-known ways CSS has been
// abused to load remote resources or (on very old browsers) run script,
// since this text renders inside every visitor's page, not just the
// owner's own.
export function sanitizeCss(raw) {
  let css = String(raw || '').slice(0, MAX_CSS_BYTES);
  css = css.replace(/@import[^;]*;?/gi, '');
  css = css.replace(/expression\s*\(/gi, '');
  css = css.replace(/javascript\s*:/gi, '');
  css = css.replace(/<\/?\s*script/gi, '');
  return css;
}
