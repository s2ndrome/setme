import bcrypt from 'bcryptjs';
import { sql } from './_lib/db.js';
import { createSessionCookie, clearSessionCookie } from './_lib/auth.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { action, email: rawEmail, password, inviteCode } = req.body || {};
  const email = String(rawEmail || '').trim().toLowerCase();

  if (action === 'logout') {
    res.setHeader('Set-Cookie', clearSessionCookie());
    return res.status(200).json({ ok: true });
  }

  if (!EMAIL_PATTERN.test(email) || !password) {
    return res.status(400).json({ error: '이메일과 비밀번호를 입력해주세요.' });
  }

  if (action === 'signup') {
    // Optional invite gate: set SIGNUP_INVITE_CODE in the environment to
    // require it at signup and cut down on indiscriminate sign-ups. Left
    // unset, signup stays open (so this never silently locks anyone out).
    const required = process.env.SIGNUP_INVITE_CODE;
    if (required && String(inviteCode || '') !== required) {
      return res.status(403).json({ error: '초대 코드가 올바르지 않습니다.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: '비밀번호는 6자 이상이어야 합니다.' });
    }

    const existing = await sql`select id from users where email = ${email}`;
    if (existing.length > 0) {
      return res.status(409).json({ error: '이미 가입된 이메일입니다.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await sql`
      insert into users (email, password_hash)
      values (${email}, ${passwordHash})
      returning id
    `;
    res.setHeader('Set-Cookie', createSessionCookie(result[0].id));
    return res.status(200).json({ ok: true });
  }

  if (action === 'login') {
    const result = await sql`select id, password_hash from users where email = ${email}`;
    const user = result[0];
    const valid = user && (await bcrypt.compare(password, user.password_hash));
    if (!valid) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }
    res.setHeader('Set-Cookie', createSessionCookie(user.id));
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: 'invalid_action' });
}
