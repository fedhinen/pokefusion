const fs = require('fs');

const getEnv = (name) => {
    const value = process.env[name] || '';
    return value.trim();
};

const targetPath = './src/environments/firebase.config.ts';

const envConfigFile = `
import { initializeApp, type FirebaseApp } from 'firebase/app';

export const firebaseConfig = {
  apiKey: ${JSON.stringify(getEnv('FIREBASE_API_KEY'))},
  authDomain: ${JSON.stringify(getEnv('FIREBASE_AUTH_DOMAIN'))},
  projectId: ${JSON.stringify(getEnv('FIREBASE_PROJECT_ID'))},
  storageBucket: ${JSON.stringify(getEnv('FIREBASE_STORAGE_BUCKET'))},
  messagingSenderId: ${JSON.stringify(getEnv('FIREBASE_MESSAGING_SENDER_ID'))},
  appId: ${JSON.stringify(getEnv('FIREBASE_APP_ID'))},
  measurementId: ${JSON.stringify(getEnv('FIREBASE_MEASUREMENT_ID'))},
};

export const firebaseApp: FirebaseApp = initializeApp(firebaseConfig);
`;

fs.writeFileSync(targetPath, envConfigFile);