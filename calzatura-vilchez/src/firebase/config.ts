import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  indexedDBLocalPersistence,
  initializeAuth,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBAnVUP4M6wujGs-x8EytdGabkIP7EJkwo",
  authDomain: "calzaturavilchez-ab17f.firebaseapp.com",
  projectId: "calzaturavilchez-ab17f",
  messagingSenderId: "337744526151",
  appId: "1:337744526151:web:bc86b90832e667c36baa62",
};

const app = initializeApp(firebaseConfig);

// En E2E (Playwright), usar localStorage para que storageState lo capture.
// En producción, usar IndexedDB como persistencia primaria.
export const auth = initializeAuth(app, {
  persistence: import.meta.env.VITE_E2E === "true"
    ? [browserLocalPersistence]
    : [indexedDBLocalPersistence, browserLocalPersistence],
});

export default app;
