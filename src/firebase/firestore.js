import {
  doc,
  getDoc,
  writeBatch,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './config.js';

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export function isValidUsername(username) {
  return USERNAME_PATTERN.test(username);
}

export async function isUsernameAvailable(username) {
  const snap = await getDoc(doc(db, 'usernames', username));
  return !snap.exists();
}

export async function createUserProfile(uid, { username, nickname, profileImage }) {
  if (!isValidUsername(username)) {
    throw new Error('핸들은 영문 소문자/숫자/밑줄 3~20자만 가능합니다.');
  }

  const batch = writeBatch(db);

  batch.set(doc(db, 'usernames', username), { uid });

  batch.set(doc(db, 'users', uid), {
    uid,
    username,
    nickname: nickname || username,
    bio: '',
    profileImage: profileImage || '',
    createdAt: serverTimestamp()
  });

  batch.set(doc(db, 'homes', uid), {
    uid,
    visibility: 'public',
    editMode: 'builder',
    theme: 'basic',
    background: { type: 'color', value: '#f5f5f5' },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  try {
    await batch.commit();
  } catch (err) {
    if (err.code === 'permission-denied') {
      throw new Error('이미 사용 중인 핸들입니다.');
    }
    throw err;
  }
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

export async function getUidByUsername(username) {
  const snap = await getDoc(doc(db, 'usernames', username));
  return snap.exists() ? snap.data().uid : null;
}

export async function getHome(uid) {
  const snap = await getDoc(doc(db, 'homes', uid));
  return snap.exists() ? snap.data() : null;
}

export async function updateUserProfile(uid, data) {
  await updateDoc(doc(db, 'users', uid), data);
}

export async function updateHome(uid, data) {
  await updateDoc(doc(db, 'homes', uid), { ...data, updatedAt: serverTimestamp() });
}
