import { sql } from './db.js';

export async function getHomeMeta(username) {
  const rows = await sql`
    select u.id, u.username, u.nickname, u.bio, u.profile_image,
           h.visibility, h.theme, h.background, h.visit_count
    from users u
    left join homes h on h.uid = u.id
    where u.username = ${username}
  `;
  return rows[0] || null;
}

export function canView(home, viewerUid) {
  return home.visibility !== 'private' || viewerUid === home.id;
}
