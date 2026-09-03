import { sql } from './_lib/db.js';
import { getUidFromRequest } from './_lib/auth.js';
import { getHomeMeta, canView } from './_lib/home.js';
import { sanitizeRichText } from './_lib/richtext.js';
import { sanitizeUrl } from './_lib/text.js';

const MAX_TITLE = 100;
const MAX_IMAGES = 10;

function sanitizePost(raw) {
  const title = String(raw.title || '').slice(0, MAX_TITLE);
  const content = sanitizeRichText(raw.content);
  const coverImage = sanitizeUrl(raw.coverImage);
  const images = Array.isArray(raw.images)
    ? raw.images.filter((u) => typeof u === 'string').slice(0, MAX_IMAGES)
    : [];
  const visibility = raw.visibility === 'private' ? 'private' : 'public';
  return { title, content, coverImage, images, visibility };
}

function formatPost(row) {
  return {
    id: row.id,
    pageId: row.page_id,
    title: row.title,
    content: row.content,
    coverImage: row.cover_image || '',
    images: row.images,
    visibility: row.visibility,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function handleGet(req, res) {
  const username = String(req.query.username || '').trim().toLowerCase();
  const id = req.query.id ? String(req.query.id) : null;
  if (!username) return res.status(400).json({ error: 'username required' });

  const home = await getHomeMeta(username);
  if (!home) return res.status(404).json({ error: 'not_found' });

  const viewerUid = getUidFromRequest(req);
  if (!canView(home, viewerUid)) return res.status(403).json({ error: 'private' });
  const isOwner = viewerUid === home.id;

  if (id) {
    const rows = await sql`select * from posts where id = ${id} and uid = ${home.id}`;
    const post = rows[0];
    if (!post) return res.status(404).json({ error: 'not_found' });
    if (post.visibility === 'private' && !isOwner) return res.status(403).json({ error: 'private' });
    return res.status(200).json({ post: formatPost(post), isOwner });
  }

  const pageSlug = String(req.query.page || '').trim().toLowerCase();
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);

  let pageId = null;
  if (pageSlug) {
    const pageRows = await sql`select id from pages where uid = ${home.id} and slug = ${pageSlug}`;
    if (!pageRows[0]) return res.status(404).json({ error: 'page_not_found' });
    pageId = pageRows[0].id;
  }

  const rows = pageId
    ? isOwner
      ? await sql`select * from posts where uid = ${home.id} and page_id = ${pageId} order by created_at desc limit ${limit}`
      : await sql`select * from posts where uid = ${home.id} and page_id = ${pageId} and visibility = 'public' order by created_at desc limit ${limit}`
    : isOwner
      ? await sql`select * from posts where uid = ${home.id} order by created_at desc limit ${limit}`
      : await sql`select * from posts where uid = ${home.id} and visibility = 'public' order by created_at desc limit ${limit}`;

  return res.status(200).json({ posts: rows.map(formatPost), isOwner });
}

async function handleCreate(req, res) {
  const uid = getUidFromRequest(req);
  if (!uid) return res.status(401).json({ error: 'unauthorized' });

  const { pageId } = req.body || {};
  if (!pageId) return res.status(400).json({ error: 'pageId required' });
  const owned = await sql`select 1 from pages where id = ${pageId} and uid = ${uid}`;
  if (owned.length === 0) return res.status(403).json({ error: 'forbidden' });

  const clean = sanitizePost(req.body || {});
  const inserted = await sql`
    insert into posts (uid, page_id, title, content, cover_image, images, visibility)
    values (${uid}, ${pageId}, ${clean.title}, ${clean.content}, ${clean.coverImage}, ${JSON.stringify(clean.images)}::jsonb, ${clean.visibility})
    returning id
  `;
  return res.status(200).json({ id: inserted[0].id });
}

async function handleUpdate(req, res) {
  const uid = getUidFromRequest(req);
  if (!uid) return res.status(401).json({ error: 'unauthorized' });

  const { id, pageId } = req.body || {};
  if (!id) return res.status(400).json({ error: 'id required' });
  const owned = await sql`select 1 from posts where id = ${id} and uid = ${uid}`;
  if (owned.length === 0) return res.status(404).json({ error: 'not_found' });

  let newPageId = null;
  if (pageId) {
    const pageOwned = await sql`select 1 from pages where id = ${pageId} and uid = ${uid}`;
    if (pageOwned.length === 0) return res.status(403).json({ error: 'forbidden' });
    newPageId = pageId;
  }

  const clean = sanitizePost(req.body || {});
  await sql`
    update posts set
      title = ${clean.title},
      content = ${clean.content},
      cover_image = ${clean.coverImage},
      images = ${JSON.stringify(clean.images)}::jsonb,
      visibility = ${clean.visibility},
      page_id = coalesce(${newPageId}, page_id),
      updated_at = now()
    where id = ${id} and uid = ${uid}
  `;
  return res.status(200).json({ ok: true });
}

async function handleDelete(req, res) {
  const uid = getUidFromRequest(req);
  if (!uid) return res.status(401).json({ error: 'unauthorized' });
  const id = String(req.query.id || '');
  if (!id) return res.status(400).json({ error: 'id required' });
  await sql`delete from posts where id = ${id} and uid = ${uid}`;
  return res.status(200).json({ ok: true });
}

export default async function handler(req, res) {
  if (req.method === 'GET') return handleGet(req, res);
  if (req.method === 'POST') return handleCreate(req, res);
  if (req.method === 'PUT') return handleUpdate(req, res);
  if (req.method === 'DELETE') return handleDelete(req, res);
  return res.status(405).json({ error: 'method_not_allowed' });
}
