import {
  createUserWithEmailAndPassword,
  deleteUser,
  reload,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "@/firebase/config";
import { saveUserProfile } from "./users";
import { logAudit } from "@/services/audit";

const MIN_PASSWORD_LENGTH = 8;

export async function checkDisposableEmail(email: string): Promise<void> {
  try {
    const res = await fetch(
      `https://www.disify.com/api/email/${encodeURIComponent(email)}`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) return;
    const data = await res.json();
    if (data.disposable === true) throw new Error("DISPOSABLE_EMAIL");
  } catch (err) {
    // Si la API falla por red/timeout dejamos pasar — Firebase igual exige verificación
    if (err instanceof Error && err.message === "DISPOSABLE_EMAIL") throw err;
  }
}

export async function resendVerificationEmail(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("NO_USER");
  await sendEmailVerification(user);
}

export async function reloadCurrentUser(): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;
  await reload(user);
  return user.emailVerified;
}

export async function registerUser(
  data: {
    dni: string;
    nombres: string;
    apellidos: string;
    email: string;
    password: string;
  }
) {
  if (data.password.length < MIN_PASSWORD_LENGTH) {
    throw new Error("PASSWORD_TOO_SHORT");
  }

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
    await sendEmailVerification(user);
    void logAudit("crear", "usuario", user.uid, nombre, {
      dni: data.dni,
      email: user.email || data.email,
      rol: "cliente",
      validadoPorDNI: true,
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
