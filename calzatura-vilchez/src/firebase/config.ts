import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBAnVUP4M6wujGs-x8EytdGabkIP7EJkwo",
  authDomain: "calzaturavilchez-ab17f.firebaseapp.com",
  projectId: "calzaturavilchez-ab17f",
  messagingSenderId: "337744526151",
  appId: "1:337744526151:web:bc86b90832e667c36baa62",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export default app;
