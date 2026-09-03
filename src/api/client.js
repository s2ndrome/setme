async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    method: options.method || 'GET',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || '요청을 처리하지 못했습니다.');
    err.status = res.status;
    throw err;
  }
  return data;
}

export function signUp(email, password, inviteCode) {
  return request('/auth', { method: 'POST', body: { action: 'signup', email, password, inviteCode } });
}

export function signIn(email, password) {
  return request('/auth', { method: 'POST', body: { action: 'login', email, password } });
}

export function signOutUser() {
  return request('/auth', { method: 'POST', body: { action: 'logout' } });
}

export function getMe() {
  return request('/me');
}

export function isUsernameAvailable(username) {
  return request(`/username?u=${encodeURIComponent(username)}`).then((data) => data.available);
}

export function createUserProfile(data) {
  return request('/profile', { method: 'POST', body: data });
}

export function updateProfile(data) {
  return request('/profile', { method: 'PUT', body: data });
}

export function getPublicProfile(username) {
  return request(`/profile?username=${encodeURIComponent(username)}`);
}

export function saveBackground(background) {
  return request('/profile', { method: 'PUT', body: { background } });
}

export function getPages(username) {
  return request(`/pages?username=${encodeURIComponent(username)}`);
}

export function createPage(name, kind) {
  return request('/pages', { method: 'POST', body: { name, kind } });
}

export function renamePage(id, name) {
  return request('/pages', { method: 'PUT', body: { id, name } });
}

export function reorderPages(orderIds) {
  return request('/pages', { method: 'PUT', body: { order: orderIds } });
}

export function deletePage(id) {
  return request(`/pages?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function getPageElements(username, slug) {
  const q = slug ? `&page=${encodeURIComponent(slug)}` : '';
  return request(`/elements?username=${encodeURIComponent(username)}${q}`);
}

export function savePageElements(pageId, elements) {
  return request('/elements', { method: 'PUT', body: { pageId, elements } });
}

export function listPosts(username, { page, limit } = {}) {
  const params = new URLSearchParams({ username });
  if (page) params.set('page', page);
  if (limit) params.set('limit', limit);
  return request(`/posts?${params.toString()}`);
}

export function getPost(username, id) {
  return request(`/posts?username=${encodeURIComponent(username)}&id=${encodeURIComponent(id)}`);
}

export function createPost(data) {
  return request('/posts', { method: 'POST', body: data });
}

export function updatePost(data) {
  return request('/posts', { method: 'PUT', body: data });
}

export function deletePost(id) {
  return request(`/posts?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function listGuestbook(username, limit) {
  const params = new URLSearchParams({ username });
  if (limit) params.set('limit', limit);
  return request(`/guestbook?${params.toString()}`);
}

export function postGuestbook(username, author, content) {
  return request('/guestbook', { method: 'POST', body: { username, author, content } });
}

export function deleteGuestbookEntry(id) {
  return request(`/guestbook?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function uploadImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('파일을 읽지 못했습니다.'));
    reader.onload = async () => {
      try {
        const base64 = String(reader.result).split(',')[1];
        const data = await request('/upload', {
          method: 'POST',
          body: { contentType: file.type, data: base64 }
        });
        resolve(data.url);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsDataURL(file);
  });
}

export function isValidUsername(username) {
  return /^[a-z0-9_]{3,20}$/.test(username);
}
