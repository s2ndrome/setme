const DEFAULT_TITLE = 'setme';
let faviconEl = null;

// Per-home browser chrome (tab title/favicon, custom cursor) — same
// mount/reset lifecycle as theme.js and customCss.js so it never leaks
// from one person's home onto another view.
export function applySiteChrome({ title, favicon, cursor }) {
  document.title = title || DEFAULT_TITLE;

  if (favicon) {
    if (!faviconEl) {
      faviconEl = document.createElement('link');
      faviconEl.rel = 'icon';
      document.head.appendChild(faviconEl);
    }
    faviconEl.href = favicon;
  } else if (faviconEl) {
    faviconEl.remove();
    faviconEl = null;
  }

  document.body.style.cursor = cursor ? `url("${cursor}"), auto` : '';
}

export function resetSiteChrome() {
  document.title = DEFAULT_TITLE;
  if (faviconEl) {
    faviconEl.remove();
    faviconEl = null;
  }
  document.body.style.cursor = '';
}
