import {
  createUserWithEmailAndPassword,
  deleteUser,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import type { User } from "firebase/auth";
import { auth } from "@/firebase/config";
import { deleteUserProfile, getUserProfile, saveUserProfile } from "./users";
import { logAudit } from "@/services/audit";
import { isSuperAdminEmail } from "@/config/security";
import type { UserRole } from "@/types";
import { clearFavoriteProductsByUser } from "@/domains/clientes/services/favorites";
import { getBackendApiBaseUrl } from "@/config/apiBackend";
import { clearSensitiveClientStorage } from "@/utils/clientStorageCleanup";
import { assertHttpsInProduction } from "@/utils/requireHttpsInProd";
import {
  MAX_AUTH_PASSWORD_LENGTH,
  MIN_AUTH_PASSWORD_LENGTH,
  validateLoginPasswordLength,
} from "@/config/authCredentials";

const PENDING_PROFILE_PREFIX = "CV_PENDING";

function encodePendingSegment(value: string): string {
  return encodeURIComponent(value.trim());
}

function decodePendingSegment(value: string): string {
  return decodeURIComponent(value);
}

function buildPendingProfileMarker(data: {
  dni: string;
  nombres: string;
  apellidos: string;
  celular?: string;
}): string {
  return [
    PENDING_PROFILE_PREFIX,
    encodePendingSegment(data.dni),
    encodePendingSegment(data.nombres),
    encodePendingSegment(data.apellidos),
    encodePendingSegment(data.celular ?? ""),
  ].join("|");
}

function parsePendingProfileMarker(displayName: string | null): {
  dni: string;
  nombres: string;
  apellidos: string;
  celular?: string;
} | null {
  if (!displayName?.startsWith(PENDING_PROFILE_PREFIX)) return null;

  const parts = displayName.split("|");
  if (parts.length < 4) return null;

  const [, dni, nombres, apellidos, celular] = parts;

  try {
    return {
      dni: decodePendingSegment(dni),
      nombres: decodePendingSegment(nombres),
      apellidos: decodePendingSegment(apellidos),
      celular: celular ? decodePendingSegment(celular) : undefined,
    };
  } catch {
    return null;
  }
}

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

export function getCurrentAuthUser(): User | null {
  return auth.currentUser;
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
    celular?: string;
  }
) {
  if (data.password.length < MIN_AUTH_PASSWORD_LENGTH) {
    throw new Error("PASSWORD_TOO_SHORT");
  }
  if (data.password.length > MAX_AUTH_PASSWORD_LENGTH) {
    throw new Error("PASSWORD_TOO_LONG");
  }
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    data.email,
    data.password
  );
  const user = userCredential.user;
  const nombres = data.nombres.trim();
  const apellidos = data.apellidos.trim();

  try {
    await updateProfile(user, {
      displayName: buildPendingProfileMarker({
        dni: data.dni,
        nombres,
        apellidos,
        celular: data.celular,
      }),
    });
    await sendEmailVerification(user);
  } catch (error) {
    await deleteUser(user).catch(() => undefined);
    throw error;
  }

  return user;
}

export async function ensureVerifiedUserProfile(user: User) {
  const existingProfile = await getUserProfile(user.uid);
  if (existingProfile) return existingProfile;

  const isAdmin = isSuperAdminEmail(user.email);
  if (!user.emailVerified && !isAdmin) return null;
  const role: UserRole = isAdmin ? "admin" : "cliente";

  const pending = parsePendingProfileMarker(user.displayName);
  const nombres = pending?.nombres?.trim();
  const apellidos = pending?.apellidos?.trim();
  const nombre =
    `${nombres ?? ""} ${apellidos ?? ""}`.trim() ||
    user.displayName?.trim() ||
    user.email?.split("@")[0] ||
    "Usuario";

  const profile = {
    uid: user.uid,
    dni: pending?.dni,
    nombres,
    apellidos,
    nombre,
    email: user.email ?? "",
    rol: role,
    creadoEn: new Date().toISOString(),
    ...(pending?.celular ? { telefono: pending.celular } : {}),
  };

  await saveUserProfile(profile);

  if (pending) {
    await updateProfile(user, { displayName: nombre }).catch(() => undefined);
  }

  void logAudit("crear", "usuario", user.uid, nombre, {
    dni: pending?.dni,
    email: user.email ?? "",
    rol: profile.rol,
    validadoPorDNI: Boolean(pending?.dni),
    correoVerificado: user.emailVerified,
  });

  return profile;
}

function resolveAuthLoginProxyUrl(): string | null {
  const explicit = import.meta.env.VITE_AUTH_PROXY_LOGIN_URL?.trim() ?? "";
  if (explicit === "0" || explicit === "false") return null;
  if (explicit) return assertHttpsInProduction(explicit.replaceAll(/\/$/g, ""), "VITE_AUTH_PROXY_LOGIN_URL");
  const backend = getBackendApiBaseUrl();
  if (backend) return `${backend}/authLogin`;
  return null;
}

async function loginThroughAuthProxy(proxyUrl: string, email: string, password: string): Promise<User> {
  const res = await fetch(proxyUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  let json: { ok?: boolean; customToken?: string };
  try {
    json = (await res.json()) as { ok?: boolean; customToken?: string };
  } catch {
    throw new Error("AUTH_FAILED");
  }
  if (!json.ok || typeof json.customToken !== "string" || json.customToken.length === 0) {
    throw new Error("AUTH_FAILED");
  }
  const cred = await signInWithCustomToken(auth, json.customToken);
  return cred.user;
}

export async function loginUser(email: string, password: string) {
  const passLenErr = validateLoginPasswordLength(password);
  if (passLenErr) {
    throw new Error("PASSWORD_TOO_LONG");
  }
  const proxyUrl = resolveAuthLoginProxyUrl();
  if (proxyUrl) {
    return loginThroughAuthProxy(proxyUrl, email, password);
  }
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

export async function logoutUser() {
  await signOut(auth);
  clearSensitiveClientStorage();
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function deleteOwnAccount(): Promise<void> {
  const user = auth.currentUser;
  if (!user?.email) throw new Error("NO_USER");

  const profile = await getUserProfile(user.uid).catch(() => null);
  const entityName = profile?.nombre?.trim() || user.email;

  await logAudit("eliminar", "usuario", user.uid, entityName, {
    email: user.email,
    selfService: true,
  });

  try {
    await deleteUser(user);
  } catch (error) {
    const code = (error as { code?: string })?.code ?? "";
    if (code.includes("requires-recent-login")) {
      throw new Error("REQUIRES_RECENT_LOGIN");
    }
    throw error;
  }

  const cleanupResults = await Promise.allSettled([
    deleteUserProfile(user.uid),
    clearFavoriteProductsByUser(user.uid),
  ]);

  const cleanupFailed = cleanupResults.some((result) => result.status === "rejected");
  if (cleanupFailed) {
    throw new Error("ACCOUNT_DELETED_WITH_PARTIAL_DATA");
  }
}
