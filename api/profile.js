import { sql } from './_lib/db.js';
import { getUidFromRequest } from './_lib/auth.js';

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

async function handleGet(req, res) {
  const username = String(req.query.username || '').trim().toLowerCase();
  if (!username) return res.status(400).json({ error: 'username required' });

  const result = await sql`
    select u.id, u.username, u.nickname, u.bio, u.profile_image,
           h.visibility, h.theme, h.background, h.header_image
    from users u
    left join homes h on h.uid = u.id
    where u.username = ${username}
  `;
  const row = result[0];
  if (!row) return res.status(404).json({ error: 'not_found' });

  const viewerUid = getUidFromRequest(req);
  const isOwner = viewerUid === row.id;

  if (!isOwner && row.visibility === 'private') {
    return res.status(403).json({ error: 'private' });
  }

  return res.status(200).json({
    profile: {
      username: row.username,
      nickname: row.nickname,
      bio: row.bio,
      profileImage: row.profile_image
    },
    home: {
      visibility: row.visibility,
      theme: row.theme,
      background: row.background,
      headerImage: row.header_image || ''
    },
    isOwner
  });
}

async function handleCreate(req, res) {
  const uid = getUidFromRequest(req);
  if (!uid) return res.status(401).json({ error: 'unauthorized' });

  const { username, nickname, profileImage } = req.body || {};
  const cleanUsername = String(username || '').trim().toLowerCase();
  const cleanNickname = String(nickname || '').trim() || cleanUsername;

  if (!USERNAME_PATTERN.test(cleanUsername)) {
    return res.status(400).json({ error: '핸들은 영문 소문자/숫자/밑줄 3~20자만 가능합니다.' });
  }

  const existing = await sql`select username from users where id = ${uid}`;
  if (existing[0]?.username) {
    return res.status(409).json({ error: '이미 프로필이 설정되어 있습니다.' });
  }

  const taken = await sql`select 1 from users where username = ${cleanUsername}`;
  if (taken.length > 0) {
    return res.status(409).json({ error: '이미 사용 중인 핸들입니다.' });
  }

  await sql`
    update users
    set username = ${cleanUsername}, nickname = ${cleanNickname}, profile_image = ${profileImage || ''}
    where id = ${uid}
  `;
  await sql`
    insert into homes (uid) values (${uid})
    on conflict (uid) do nothing
  `;
  await sql`
    insert into pages (uid, name, slug, kind, order_index, is_default)
    values (${uid}, 'HOME', 'home', 'canvas', 0, true)
    on conflict (uid, slug) do nothing
  `;

  return res.status(200).json({ ok: true, username: cleanUsername });
}

async function handleUpdate(req, res) {
  const uid = getUidFromRequest(req);
  if (!uid) return res.status(401).json({ error: 'unauthorized' });

  const { nickname, bio, profileImage, visibility, theme, background, headerImage } = req.body || {};

  if (nickname !== undefined || bio !== undefined || profileImage !== undefined) {
    await sql`
      update users set
        nickname = coalesce(${nickname}, nickname),
        bio = coalesce(${bio}, bio),
        profile_image = coalesce(${profileImage}, profile_image)
      where id = ${uid}
    `;
  }

  if (visibility !== undefined || theme !== undefined || background !== undefined || headerImage !== undefined) {
    await sql`
      update homes set
        visibility = coalesce(${visibility}, visibility),
        theme = coalesce(${theme}, theme),
        background = coalesce(${background ? JSON.stringify(background) : null}::jsonb, background),
        header_image = coalesce(${headerImage}, header_image),
        updated_at = now()
      where uid = ${uid}
    `;
  }

  return res.status(200).json({ ok: true });
}

export default async function handler(req, res) {
  if (req.method === 'GET') return handleGet(req, res);
  if (req.method === 'POST') return handleCreate(req, res);
  if (req.method === 'PUT') return handleUpdate(req, res);
  return res.status(405).json({ error: 'method_not_allowed' });
}
