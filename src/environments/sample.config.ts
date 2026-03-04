import { initializeApp, type FirebaseApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
  measurementId: '',
};

export const firebaseApp: FirebaseApp = initializeApp(firebaseConfig);
