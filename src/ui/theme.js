export const THEME_PRESETS = {
  basic: { label: 'Basic', bg: '#f7f7f5', surface: '#ffffff', primary: '#5b5bf0', text: '#222222', muted: '#767676' },
  midnight: { label: 'Midnight', bg: '#0f1222', surface: '#1a1d33', primary: '#7c8cff', text: '#e8e8f5', muted: '#9a9ac0' },
  rose: { label: 'Rosé', bg: '#fff5f7', surface: '#ffffff', primary: '#e88ba0', text: '#3a2a2e', muted: '#a97f88' },
  forest: { label: 'Forest', bg: '#f2f5ef', surface: '#ffffff', primary: '#4a7c59', text: '#22301f', muted: '#6f8266' },
  arctic: { label: 'Arctic', bg: '#eef6fb', surface: '#ffffff', primary: '#4a9fd8', text: '#1c2b33', muted: '#6f8b98' },
  noir: { label: 'Noir', bg: '#141414', surface: '#1f1f1f', primary: '#e0e0e0', text: '#f2f2f2', muted: '#9a9a9a' }
};

const VAR_MAP = {
  bg: '--color-bg',
  surface: '--color-surface',
  primary: '--color-primary',
  text: '--color-text',
  muted: '--color-muted'
};

export function resolveThemeColors(themeName, overrides) {
  const preset = THEME_PRESETS[themeName] || THEME_PRESETS.basic;
  return { ...preset, ...(overrides || {}) };
}

// Only ever active while a home page is on screen — cleared on
// landing/onboarding mount, same lifecycle as custom CSS, so a theme
// never leaks onto another view.
export function applyTheme(themeName, overrides) {
  const colors = resolveThemeColors(themeName, overrides);
  const root = document.documentElement;
  for (const key of Object.keys(VAR_MAP)) {
    root.style.setProperty(VAR_MAP[key], colors[key]);
  }
}

export function resetTheme() {
  const root = document.documentElement;
  for (const cssVar of Object.values(VAR_MAP)) {
    root.style.removeProperty(cssVar);
  }
}
