import { sql } from './_lib/db.js';

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const username = String(req.query.u || '').trim().toLowerCase();
  if (!USERNAME_PATTERN.test(username)) {
    return res.status(200).json({ available: false });
  }

  const result = await sql`select 1 from users where username = ${username}`;
  return res.status(200).json({ available: result.length === 0 });
}
