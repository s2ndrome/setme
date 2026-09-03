const STYLE_ID = 'setme-custom-css';

// Only ever active while a home page that has custom CSS is on screen —
// every other page (landing, onboarding, someone else's home) clears it
// on mount, so it never leaks across views.
export function applyCustomCss(css) {
  let el = document.getElementById(STYLE_ID);
  if (!css) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement('style');
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = css;
}
