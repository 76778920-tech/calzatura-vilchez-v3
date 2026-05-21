import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider, type AppCheck } from "firebase/app-check";
import {
  browserLocalPersistence,
  indexedDBLocalPersistence,
  initializeAuth,
} from "firebase/auth";

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            as string,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        as string,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID              as string,
};

const app = initializeApp(firebaseConfig);

export let appCheck: AppCheck | null = null;

const appCheckSiteKey = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY as string | undefined;
if (import.meta.env.PROD && import.meta.env.VITE_E2E !== "true" && !appCheckSiteKey) {
  throw new Error("VITE_FIREBASE_APPCHECK_SITE_KEY requerido en produccion");
}

if (appCheckSiteKey && import.meta.env.VITE_E2E !== "true") {
  appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
}

// En E2E (Playwright), usar localStorage para que storageState lo capture.
// En producción, usar IndexedDB como persistencia primaria.
export const auth = initializeAuth(app, {
  persistence: import.meta.env.VITE_E2E === "true"
    ? [browserLocalPersistence]
    : [indexedDBLocalPersistence, browserLocalPersistence],
});

export default app;
