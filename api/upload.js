import { put } from '@vercel/blob';
import { getUidFromRequest } from './_lib/auth.js';

const MAX_BYTES = 3 * 1024 * 1024; // 3MB
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const uid = getUidFromRequest(req);
  if (!uid) return res.status(401).json({ error: 'unauthorized' });

  const { contentType, data } = req.body || {};
  if (!ALLOWED_TYPES.has(contentType)) {
    return res.status(400).json({ error: '지원하지 않는 이미지 형식입니다. (PNG/JPEG/GIF/WEBP만 가능)' });
  }
  if (!data || typeof data !== 'string') {
    return res.status(400).json({ error: '이미지 데이터가 없습니다.' });
  }

  const buffer = Buffer.from(data, 'base64');
  if (buffer.length === 0 || buffer.length > MAX_BYTES) {
    return res.status(400).json({ error: '이미지 용량은 3MB 이하만 가능합니다.' });
  }

  const ext = contentType.split('/')[1];
  const path = `uploads/${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  try {
    const blob = await put(path, buffer, {
      access: 'public',
      contentType,
      addRandomSuffix: false
    });
    return res.status(200).json({ url: blob.url });
  } catch (err) {
    console.error('이미지 업로드 실패', err);
    return res.status(500).json({ error: '이미지 업로드에 실패했습니다.' });
  }
}
