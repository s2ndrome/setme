import { sql } from './_lib/db.js';
import { getUidFromRequest } from './_lib/auth.js';
import { getHomeMeta, canView } from './_lib/home.js';
import { sanitizeElements } from './_lib/elements.js';

async function handleGet(req, res) {
  const username = String(req.query.username || '').trim().toLowerCase();
  const slug = String(req.query.page || '').trim().toLowerCase();
  if (!username) return res.status(400).json({ error: 'username required' });

  const home = await getHomeMeta(username);
  if (!home) return res.status(404).json({ error: 'not_found' });

  const viewerUid = getUidFromRequest(req);
  if (!canView(home, viewerUid)) return res.status(403).json({ error: 'private' });

  const pageRows = slug
    ? await sql`select id, kind from pages where uid = ${home.id} and slug = ${slug}`
    : await sql`select id, kind from pages where uid = ${home.id} and is_default = true`;
  const page = pageRows[0];
  if (!page) return res.status(404).json({ error: 'page_not_found' });

  const elementRows = await sql`
    select id, type, x, y, width, height, rotation, z_index, visible, opacity, content, style
    from elements where page_id = ${page.id}
    order by z_index asc
  `;

  return res.status(200).json({
    pageId: page.id,
    pageKind: page.kind,
    elements: elementRows.map((el) => ({
      id: el.id,
      type: el.type,
      x: el.x,
      y: el.y,
      width: el.width,
      height: el.height,
      rotation: el.rotation,
      zIndex: el.z_index,
      visible: el.visible,
      opacity: el.opacity,
      content: el.content,
      style: el.style
    }))
  });
}

async function handleSave(req, res) {
  const uid = getUidFromRequest(req);
  if (!uid) return res.status(401).json({ error: 'unauthorized' });

  const { pageId, elements } = req.body || {};
  if (!pageId) return res.status(400).json({ error: 'pageId required' });

  const owned = await sql`select 1 from pages where id = ${pageId} and uid = ${uid}`;
  if (owned.length === 0) return res.status(403).json({ error: 'forbidden' });

  const clean = sanitizeElements(elements);
  const queries = [sql`delete from elements where page_id = ${pageId}`];
  for (const el of clean) {
    queries.push(sql`
      insert into elements
        (uid, page_id, type, x, y, width, height, rotation, z_index, visible, opacity, content, style)
      values
        (${uid}, ${pageId}, ${el.type}, ${el.x}, ${el.y}, ${el.width}, ${el.height},
         ${el.rotation}, ${el.zIndex}, ${el.visible}, ${el.opacity}, ${el.content}::jsonb, ${el.style}::jsonb)
    `);
  }
  await sql.transaction(queries);

  return res.status(200).json({ ok: true });
}

export default async function handler(req, res) {
  if (req.method === 'GET') return handleGet(req, res);
  if (req.method === 'PUT') return handleSave(req, res);
  return res.status(405).json({ error: 'method_not_allowed' });
}
