const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

function stripBase(pathname) {
  if (BASE && pathname.startsWith(BASE)) {
    return pathname.slice(BASE.length) || '/';
  }
  return pathname;
}

export function parsePath(pathname) {
  const path = stripBase(pathname);
  if (path === '/' || path === '') return { name: 'landing' };
  if (path === '/onboarding') return { name: 'onboarding' };
  if (path.startsWith('/@')) {
    return { name: 'home', username: decodeURIComponent(path.slice(2)) };
  }
  return { name: 'notfound' };
}

export function navigate(path) {
  window.history.pushState({}, '', BASE + path);
  window.dispatchEvent(new Event('setme:navigate'));
}

export function initLinkInterception() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-link]');
    if (!link) return;
    e.preventDefault();
    navigate(link.getAttribute('href'));
  });
}
