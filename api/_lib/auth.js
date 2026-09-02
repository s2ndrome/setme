import jwt from 'jsonwebtoken';
import { serialize, parse } from 'cookie';

const COOKIE_NAME = 'session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error('JWT_SECRET 환경변수가 설정되지 않았습니다.');
  return value;
}

export function createSessionCookie(uid) {
  const token = jwt.sign({ uid }, secret(), { expiresIn: MAX_AGE });
  return serialize(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.VERCEL === '1',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE
  });
}

export function clearSessionCookie() {
  return serialize(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.VERCEL === '1',
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  });
}

export function getUidFromRequest(req) {
  const cookies = parse(req.headers.cookie || '');
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  try {
    return jwt.verify(token, secret()).uid;
  } catch {
    return null;
  }
}
