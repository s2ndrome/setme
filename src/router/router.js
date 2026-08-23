export function parsePath(pathname) {
  if (pathname === '/' || pathname === '') return { name: 'landing' };
  if (pathname === '/login') return { name: 'login' };
  if (pathname === '/signup') return { name: 'signup' };
  if (pathname.startsWith('/@')) {
    return { name: 'home', username: decodeURIComponent(pathname.slice(2)) };
  }
  return { name: 'notfound' };
}

export function navigate(path) {
  window.history.pushState({}, '', path);
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
