import { sql } from './_lib/db.js';
import { getUidFromRequest } from './_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const uid = getUidFromRequest(req);
  if (!uid) return res.status(200).json({ user: null, profile: null });

  const result = await sql`
    select id, email, username, nickname, bio, profile_image
    from users where id = ${uid}
  `;
  const row = result[0];
  if (!row) return res.status(200).json({ user: null, profile: null });

  const profile = row.username
    ? {
        username: row.username,
        nickname: row.nickname,
        bio: row.bio,
        profileImage: row.profile_image
      }
    : null;

  return res.status(200).json({
    user: { uid: row.id, email: row.email },
    profile
  });
}
