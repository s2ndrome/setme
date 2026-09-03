import { sql } from './_lib/db.js';
import { getUidFromRequest } from './_lib/auth.js';
import { getHomeMeta, canView } from './_lib/home.js';

const MAX_PAGES = 20;
const KINDS = new Set(['canvas', 'board', 'guestbook']);

function slugify(name) {
  const base = String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 40);
  return base || 'page';
}

async function handleGet(req, res) {
  const username = String(req.query.username || '').trim().toLowerCase();
  if (!username) return res.status(400).json({ error: 'username required' });

  const home = await getHomeMeta(username);
  if (!home) return res.status(404).json({ error: 'not_found' });

  const viewerUid = getUidFromRequest(req);
  if (!canView(home, viewerUid)) return res.status(403).json({ error: 'private' });
  const isOwner = viewerUid === home.id;

  if (!isOwner) {
    await sql`update homes set visit_count = visit_count + 1 where uid = ${home.id}`;
  }

  const pages = await sql`
    select id, name, slug, kind, order_index, is_default
    from pages where uid = ${home.id}
    order by order_index asc
  `;

  return res.status(200).json({
    isOwner,
    visitCount: (home.visit_count || 0) + (isOwner ? 0 : 1),
    pages: pages.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      kind: p.kind,
      orderIndex: p.order_index,
      isDefault: p.is_default
    }))
  });
}

async function handleCreate(req, res) {
  const uid = getUidFromRequest(req);
  if (!uid) return res.status(401).json({ error: 'unauthorized' });

  const { name, kind } = req.body || {};
  const cleanName = String(name || '').trim().slice(0, 30);
  if (!cleanName) return res.status(400).json({ error: '페이지 이름을 입력해주세요.' });
  if (!KINDS.has(kind)) return res.status(400).json({ error: 'invalid_kind' });

  const existing = await sql`select count(*)::int as n from pages where uid = ${uid}`;
  if (existing[0].n >= MAX_PAGES) {
    return res.status(400).json({ error: `페이지는 최대 ${MAX_PAGES}개까지 만들 수 있어요.` });
  }

  const base = slugify(cleanName);
  let slug = base;
  let suffix = 2;
  while ((await sql`select 1 from pages where uid = ${uid} and slug = ${slug}`).length > 0) {
    slug = `${base}-${suffix++}`;
  }

  const maxOrder = await sql`select coalesce(max(order_index), -1) as m from pages where uid = ${uid}`;

  const inserted = await sql`
    insert into pages (uid, name, slug, kind, order_index)
    values (${uid}, ${cleanName}, ${slug}, ${kind}, ${maxOrder[0].m + 1})
    returning id, name, slug, kind, order_index, is_default
  `;
  const page = inserted[0];

  return res.status(200).json({
    id: page.id,
    name: page.name,
    slug: page.slug,
    kind: page.kind,
    orderIndex: page.order_index,
    isDefault: page.is_default
  });
}

async function handleUpdate(req, res) {
  const uid = getUidFromRequest(req);
  if (!uid) return res.status(401).json({ error: 'unauthorized' });

  const { id, name, order } = req.body || {};

  if (Array.isArray(order) && order.length > 0) {
    const queries = order.map((pageId, index) =>
      sql`update pages set order_index = ${index} where id = ${pageId} and uid = ${uid}`
    );
    await sql.transaction(queries);
    return res.status(200).json({ ok: true });
  }

  if (id && name !== undefined) {
    const cleanName = String(name).trim().slice(0, 30);
    if (!cleanName) return res.status(400).json({ error: '페이지 이름을 입력해주세요.' });
    await sql`update pages set name = ${cleanName} where id = ${id} and uid = ${uid}`;
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: 'invalid_request' });
}

async function handleDelete(req, res) {
  const uid = getUidFromRequest(req);
  if (!uid) return res.status(401).json({ error: 'unauthorized' });

  const id = String(req.query.id || '');
  if (!id) return res.status(400).json({ error: 'id required' });

  const page = await sql`select is_default from pages where id = ${id} and uid = ${uid}`;
  if (!page[0]) return res.status(404).json({ error: 'not_found' });
  if (page[0].is_default) {
    return res.status(400).json({ error: '기본 페이지는 삭제할 수 없어요.' });
  }

  await sql`delete from pages where id = ${id} and uid = ${uid}`;
  return res.status(200).json({ ok: true });
}

export default async function handler(req, res) {
  if (req.method === 'GET') return handleGet(req, res);
  if (req.method === 'POST') return handleCreate(req, res);
  if (req.method === 'PUT') return handleUpdate(req, res);
  if (req.method === 'DELETE') return handleDelete(req, res);
  return res.status(405).json({ error: 'method_not_allowed' });
}
