import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  indexedDBLocalPersistence,
  initializeAuth,
} from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            as string,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        as string,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID              as string,
};

const app = initializeApp(firebaseConfig);

// En E2E (Playwright), usar localStorage para que storageState lo capture.
// En producción, usar IndexedDB como persistencia primaria.
export const auth = initializeAuth(app, {
  persistence: import.meta.env.VITE_E2E === "true"
    ? [browserLocalPersistence]
    : [indexedDBLocalPersistence, browserLocalPersistence],
});
/** Long-polling evita cortes del canal Listen en redes/proxies/antivirus que bufferizan mal WebChannel. */
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

export default app;
