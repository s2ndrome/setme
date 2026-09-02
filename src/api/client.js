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

export function signUp(email, password) {
  return request('/auth', { method: 'POST', body: { action: 'signup', email, password } });
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

export function saveCanvas({ background, elements }) {
  return request('/profile', { method: 'PUT', body: { background, elements } });
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
