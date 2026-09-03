export const FONT_PRESETS = {
  pretendard: {
    label: 'Pretendard (기본)',
    family: "'Pretendard', -apple-system, sans-serif",
    href: ''
  },
  noto: {
    label: 'Noto Sans KR',
    family: "'Noto Sans KR', sans-serif",
    href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap'
  },
  gowun: {
    label: 'Gowun Dodum',
    family: "'Gowun Dodum', sans-serif",
    href: 'https://fonts.googleapis.com/css2?family=Gowun+Dodum&display=swap'
  },
  nanum: {
    label: 'Nanum Gothic',
    family: "'Nanum Gothic', sans-serif",
    href: 'https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700&display=swap'
  },
  myeongjo: {
    label: 'Nanum Myeongjo',
    family: "'Nanum Myeongjo', serif",
    href: 'https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700;800&display=swap'
  },
  plex: {
    label: 'IBM Plex Sans KR',
    family: "'IBM Plex Sans KR', sans-serif",
    href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;600&display=swap'
  }
};

let linkEl = null;

// Pretendard itself is already loaded site-wide from index.html, so the
// 'pretendard' preset needs no extra stylesheet — only switching to a
// different preset injects one, and switching back removes it.
export function applyFont(key) {
  const preset = FONT_PRESETS[key] || FONT_PRESETS.pretendard;
  if (preset.href) {
    if (!linkEl) {
      linkEl = document.createElement('link');
      linkEl.rel = 'stylesheet';
      linkEl.id = 'setme-font-link';
      document.head.appendChild(linkEl);
    }
    linkEl.href = preset.href;
  } else if (linkEl) {
    linkEl.remove();
    linkEl = null;
  }
  document.documentElement.style.setProperty('--font-family', preset.family);
}

export function resetFont() {
  document.documentElement.style.removeProperty('--font-family');
  if (linkEl) {
    linkEl.remove();
    linkEl = null;
  }
}
