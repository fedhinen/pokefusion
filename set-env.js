// set-env.js
const fs = require('fs');

const targetPath = './src/environments/firebase.config.ts';

const envConfigFile = `
import { initializeApp, type FirebaseApp } from 'firebase/app';

export const firebaseConfig = {
  apiKey: '${process.env.FIREBASE_API_KEY || ''}',
  authDomain: '${process.env.FIREBASE_AUTH_DOMAIN || ''}',
  projectId: '${process.env.FIREBASE_PROJECT_ID || ''}',
  storageBucket: '${process.env.FIREBASE_STORAGE_BUCKET || ''}',
  messagingSenderId: '${process.env.FIREBASE_MESSAGING_SENDER_ID || ''}',
  appId: '${process.env.FIREBASE_APP_ID || ''}',
  measurementId: '${process.env.FIREBASE_MEASUREMENT_ID || ''}',
};

export const firebaseApp: FirebaseApp = initializeApp(firebaseConfig);
`;

fs.writeFileSync(targetPath, envConfigFile);
console.log('Archivo de configuración de Firebase generado correctamente.');