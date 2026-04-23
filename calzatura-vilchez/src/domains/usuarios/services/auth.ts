import {
  createUserWithEmailAndPassword,
  deleteUser,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "@/firebase/config";
import { saveUserProfile } from "./users";

export async function registerUser(
  data: {
    dni: string;
    nombres: string;
    apellidos: string;
    email: string;
    password: string;
  }
) {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    data.email,
    data.password
  );
  const user = userCredential.user;
  const nombres = data.nombres.trim();
  const apellidos = data.apellidos.trim();
  const nombre = `${nombres} ${apellidos}`.trim();

  try {
    await saveUserProfile({
      uid: user.uid,
      dni: data.dni,
      nombres,
      apellidos,
      nombre,
      email: user.email || data.email,
      rol: "cliente",
      creadoEn: new Date().toISOString(),
    });
  } catch (error) {
    await deleteUser(user).catch(() => undefined);
    throw error;
  }

  return user;
}

export async function loginUser(email: string, password: string) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

export async function logoutUser() {
  await signOut(auth);
}
