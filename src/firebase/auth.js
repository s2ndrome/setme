import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from './config.js';

const googleProvider = new GoogleAuthProvider();

export function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export function signUpWithEmail(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export function signInWithEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function resetPassword(email) {
  return sendPasswordResetEmail(auth, email);
}

const EMAIL_AUTH_ERROR_MESSAGES = {
  'auth/email-already-in-use': '이미 가입된 이메일입니다.',
  'auth/invalid-email': '이메일 형식이 올바르지 않습니다.',
  'auth/weak-password': '비밀번호는 6자 이상이어야 합니다.',
  'auth/invalid-credential': '이메일 또는 비밀번호가 올바르지 않습니다.',
  'auth/user-not-found': '가입되지 않은 이메일입니다.',
  'auth/wrong-password': '이메일 또는 비밀번호가 올바르지 않습니다.',
  'auth/too-many-requests': '시도가 너무 많습니다. 잠시 후 다시 시도해주세요.'
};

export function describeEmailAuthError(error) {
  return EMAIL_AUTH_ERROR_MESSAGES[error?.code] || '요청을 처리하지 못했습니다. 다시 시도해주세요.';
}

export function signOutUser() {
  return signOut(auth);
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser() {
  return auth.currentUser;
}

export function isCancelledPopupError(error) {
  return error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request';
}
