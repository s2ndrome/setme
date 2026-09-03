import { sql } from './_lib/db.js';
import { getUidFromRequest } from './_lib/auth.js';
import { sanitizeCss } from './_lib/css.js';
import { sanitizeThemeColors } from './_lib/theme.js';
import { sanitizeShortText, sanitizeUrl } from './_lib/text.js';

const FONT_KEYS = new Set(['pretendard', 'noto', 'gowun', 'nanum', 'myeongjo', 'plex']);

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

function sanitizeHeaderPosition(raw) {
  const obj = raw && typeof raw === 'object' ? raw : {};
  const clamp = (n) => Math.min(100, Math.max(0, Number.isFinite(Number(n)) ? Number(n) : 50));
  return { x: clamp(obj.x), y: clamp(obj.y) };
}

async function handleGet(req, res) {
  const username = String(req.query.username || '').trim().toLowerCase();
  if (!username) return res.status(400).json({ error: 'username required' });

  const result = await sql`
    select u.id, u.username, u.nickname, u.bio, u.profile_image,
           h.visibility, h.theme, h.background, h.header_image, h.header_position, h.header_enabled, h.custom_css, h.theme_colors,
           h.site_name, h.favicon_url, h.cursor_url, h.banner_image, h.banner_title, h.font_family
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
      headerImage: row.header_image || '',
      headerPosition: row.header_position || { x: 50, y: 50 },
      headerEnabled: row.header_enabled !== false,
      customCss: row.custom_css || '',
      themeColors: row.theme_colors || {},
      siteName: row.site_name || '',
      faviconUrl: row.favicon_url || '',
      cursorUrl: row.cursor_url || '',
      bannerImage: row.banner_image || '',
      bannerTitle: row.banner_title || '',
      fontFamily: row.font_family || 'pretendard'
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

  const {
    nickname,
    bio,
    profileImage,
    visibility,
    theme,
    background,
    headerImage,
    headerPosition,
    headerEnabled,
    customCss,
    themeColors,
    siteName,
    faviconUrl,
    cursorUrl,
    bannerImage,
    bannerTitle,
    fontFamily
  } = req.body || {};
  const cleanCustomCss = customCss !== undefined ? sanitizeCss(customCss) : undefined;
  const cleanThemeColors = themeColors !== undefined ? sanitizeThemeColors(themeColors) : undefined;
  const cleanHeaderPosition = headerPosition !== undefined ? sanitizeHeaderPosition(headerPosition) : undefined;
  const cleanHeaderEnabled = headerEnabled !== undefined ? headerEnabled === true : undefined;
  const cleanSiteName = siteName !== undefined ? sanitizeShortText(siteName, 60) : undefined;
  const cleanFaviconUrl = faviconUrl !== undefined ? sanitizeUrl(faviconUrl) : undefined;
  const cleanCursorUrl = cursorUrl !== undefined ? sanitizeUrl(cursorUrl) : undefined;
  const cleanBannerImage = bannerImage !== undefined ? sanitizeUrl(bannerImage) : undefined;
  const cleanBannerTitle = bannerTitle !== undefined ? sanitizeShortText(bannerTitle, 60) : undefined;
  const cleanFontFamily = fontFamily !== undefined && FONT_KEYS.has(fontFamily) ? fontFamily : undefined;

  if (nickname !== undefined || bio !== undefined || profileImage !== undefined) {
    await sql`
      update users set
        nickname = coalesce(${nickname}, nickname),
        bio = coalesce(${bio}, bio),
        profile_image = coalesce(${profileImage}, profile_image)
      where id = ${uid}
    `;
  }

  if (
    visibility !== undefined ||
    theme !== undefined ||
    background !== undefined ||
    headerImage !== undefined ||
    cleanHeaderPosition !== undefined ||
    cleanHeaderEnabled !== undefined ||
    cleanCustomCss !== undefined ||
    cleanThemeColors !== undefined ||
    cleanSiteName !== undefined ||
    cleanFaviconUrl !== undefined ||
    cleanCursorUrl !== undefined ||
    cleanBannerImage !== undefined ||
    cleanBannerTitle !== undefined ||
    cleanFontFamily !== undefined
  ) {
    await sql`
      update homes set
        visibility = coalesce(${visibility}, visibility),
        theme = coalesce(${theme}, theme),
        background = coalesce(${background ? JSON.stringify(background) : null}::jsonb, background),
        header_image = coalesce(${headerImage}, header_image),
        header_position = coalesce(${cleanHeaderPosition ? JSON.stringify(cleanHeaderPosition) : null}::jsonb, header_position),
        header_enabled = coalesce(${cleanHeaderEnabled}, header_enabled),
        custom_css = coalesce(${cleanCustomCss}, custom_css),
        theme_colors = coalesce(${cleanThemeColors ? JSON.stringify(cleanThemeColors) : null}::jsonb, theme_colors),
        site_name = coalesce(${cleanSiteName}, site_name),
        favicon_url = coalesce(${cleanFaviconUrl}, favicon_url),
        cursor_url = coalesce(${cleanCursorUrl}, cursor_url),
        banner_image = coalesce(${cleanBannerImage}, banner_image),
        banner_title = coalesce(${cleanBannerTitle}, banner_title),
        font_family = coalesce(${cleanFontFamily}, font_family),
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
