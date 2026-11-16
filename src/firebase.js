import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase 웹 설정값은 비밀 정보가 아니에요. 데이터 보호는 firestore.rules가 맡습니다.
const firebaseConfig = {
  apiKey: 'AIzaSyAt893Kwcj73G2Tbn9fqgZ4eeFukb1jaiQ',
  authDomain: 'plan-and-gathering.firebaseapp.com',
  projectId: 'plan-and-gathering',
  storageBucket: 'plan-and-gathering.firebasestorage.app',
  messagingSenderId: '486803380691',
  appId: '1:486803380691:web:e8876cb7a6e6e89cdcb726',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
