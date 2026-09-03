import { sql } from './_lib/db.js';
import { getUidFromRequest } from './_lib/auth.js';
import { getHomeMeta, canView } from './_lib/home.js';

const MAX_AUTHOR = 30;
const MAX_CONTENT = 500;

async function handleGet(req, res) {
  const username = String(req.query.username || '').trim().toLowerCase();
  if (!username) return res.status(400).json({ error: 'username required' });

  const home = await getHomeMeta(username);
  if (!home) return res.status(404).json({ error: 'not_found' });

  const viewerUid = getUidFromRequest(req);
  if (!canView(home, viewerUid)) return res.status(403).json({ error: 'private' });

  const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
  const rows = await sql`
    select id, author, content, author_uid, created_at
    from guestbook_entries
    where home_owner_uid = ${home.id}
    order by created_at desc
    limit ${limit}
  `;

  return res.status(200).json({
    isOwner: viewerUid === home.id,
    entries: rows.map((r) => ({
      id: r.id,
      author: r.author,
      content: r.content,
      isMine: Boolean(viewerUid) && viewerUid === r.author_uid,
      createdAt: r.created_at
    }))
  });
}

async function handleCreate(req, res) {
  const username = String(req.body?.username || '').trim().toLowerCase();
  if (!username) return res.status(400).json({ error: 'username required' });

  const home = await getHomeMeta(username);
  if (!home) return res.status(404).json({ error: 'not_found' });

  const viewerUid = getUidFromRequest(req);
  if (!canView(home, viewerUid)) return res.status(403).json({ error: 'private' });

  const author = String(req.body?.author || '').trim().slice(0, MAX_AUTHOR) || '익명';
  const content = String(req.body?.content || '').trim().slice(0, MAX_CONTENT);
  if (!content) return res.status(400).json({ error: '메시지를 입력해주세요.' });

  await sql`
    insert into guestbook_entries (home_owner_uid, author, content, author_uid)
    values (${home.id}, ${author}, ${content}, ${viewerUid || null})
  `;
  return res.status(200).json({ ok: true });
}

async function handleDelete(req, res) {
  const viewerUid = getUidFromRequest(req);
  if (!viewerUid) return res.status(401).json({ error: 'unauthorized' });

  const id = String(req.query.id || '');
  if (!id) return res.status(400).json({ error: 'id required' });

  await sql`
    delete from guestbook_entries
    where id = ${id} and (home_owner_uid = ${viewerUid} or author_uid = ${viewerUid})
  `;
  return res.status(200).json({ ok: true });
}

export default async function handler(req, res) {
  if (req.method === 'GET') return handleGet(req, res);
  if (req.method === 'POST') return handleCreate(req, res);
  if (req.method === 'DELETE') return handleDelete(req, res);
  return res.status(405).json({ error: 'method_not_allowed' });
}
