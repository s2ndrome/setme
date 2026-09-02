import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyD8akxHPucltsAvPLCmvjXKiGk6y0xhrCk',
  authDomain: 'setme-b45b6.firebaseapp.com',
  projectId: 'setme-b45b6',
  storageBucket: 'setme-b45b6.firebasestorage.app',
  messagingSenderId: '1084635223664',
  appId: '1:1084635223664:web:b3ce7fd2737bf76c8cc6b5'
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
// Some networks/security software block Firestore's default streaming
// (WebChannel) transport, which surfaces as "client is offline" even
// though the network is otherwise fine. Auto-detection didn't catch
// this case, so long-polling is forced on unconditionally.
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false
});
export const storage = getStorage(app);
