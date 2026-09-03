const COLOR_KEYS = ['bg', 'surface', 'primary', 'text', 'muted'];
const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

export function sanitizeThemeColors(raw) {
  const obj = raw && typeof raw === 'object' ? raw : {};
  const clean = {};
  for (const key of COLOR_KEYS) {
    if (typeof obj[key] === 'string' && HEX_PATTERN.test(obj[key])) {
      clean[key] = obj[key];
    }
  }
  return clean;
}
