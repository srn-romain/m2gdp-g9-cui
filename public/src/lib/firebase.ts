import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectDatabaseEmulator, getDatabase } from 'firebase/database';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
};

/**
 * Sans clé API, `getAuth` lève « auth/invalid-api-key » à l'import et la page
 * reste blanche. On vérifie donc la configuration avant d'initialiser, pour
 * pouvoir afficher un écran d'explication à la place.
 */
const REQUIRED: Array<[string, string | undefined]> = [
  ['VITE_FIREBASE_API_KEY', config.apiKey],
  ['VITE_FIREBASE_AUTH_DOMAIN', config.authDomain],
  ['VITE_FIREBASE_PROJECT_ID', config.projectId],
  ['VITE_FIREBASE_APP_ID', config.appId],
];

/** Variables manquantes dans public/.env.local. Vide = configuration complète. */
export const firebaseConfigMissing = REQUIRED.filter(([, value]) => !value).map(([key]) => key);

const configured = firebaseConfigMissing.length === 0;
const app = configured ? initializeApp(config) : null;

export const auth = configured ? getAuth(app!) : (null as unknown as ReturnType<typeof getAuth>);
export const db = configured ? getFirestore(app!) : (null as unknown as ReturnType<typeof getFirestore>);
/** `getDatabase` échoue sans `databaseURL` : la présence Realtime est optionnelle. */
export const rtdb =
  configured && config.databaseURL ? getDatabase(app!) : (null as unknown as ReturnType<typeof getDatabase>);

if (configured && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
  const host = window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname;
  connectAuthEmulator(auth, `http://${host}:9099`);
  connectFirestoreEmulator(db, host, 8081);
  // La Realtime Database est optionnelle : sans `databaseURL`, rien à connecter.
  if (rtdb) connectDatabaseEmulator(rtdb, host, 9000);
}
