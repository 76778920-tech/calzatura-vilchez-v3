import { collection, doc, setDoc, getDoc, getDocs, updateDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import type { UserProfile, UserRole } from "@/types";

export async function saveUserProfile(user: UserProfile): Promise<void> {
  await setDoc(doc(db, "usuarios", user.uid), user);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "usuarios", uid));
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}

export async function fetchAllUsers(): Promise<UserProfile[]> {
  const snap = await getDocs(collection(db, "usuarios"));
  return snap.docs.map((item) => item.data() as UserProfile);
}

// setDoc con merge: funciona tanto si el documento existe como si no
export async function updateUserProfile(
  uid: string,
  data: Partial<Pick<UserProfile, "telefono" | "direcciones">>
): Promise<void> {
  await setDoc(doc(db, "usuarios", uid), data, { merge: true });
}

export async function updateUserRole(uid: string, rol: UserRole): Promise<void> {
  await updateDoc(doc(db, "usuarios", uid), { rol });
}
