import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { auth } from "@/firebase/config";
import { getUserProfile, saveUserProfile } from "@/domains/usuarios/services/users";
import type { UserProfile } from "@/types";
import { isSuperAdminEmail } from "@/config/security";

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  isAdmin: false,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (currentUser: User) => {
    const isSuperAdmin = isSuperAdminEmail(currentUser.email);

    // Perfil fallback en memoria (siempre disponible para superadmin)
    const memoryProfile: UserProfile = {
      uid: currentUser.uid,
      nombre: currentUser.displayName ?? currentUser.email?.split("@")[0] ?? "Usuario",
      email: currentUser.email ?? "",
      rol: isSuperAdmin ? "admin" : "usuario",
      creadoEn: new Date().toISOString(),
    };

    try {
      let profile = await getUserProfile(currentUser.uid);

      if (!profile) {
        // Primera vez: crear documento en Firestore para cualquier usuario
        const newProfile: UserProfile = {
          ...memoryProfile,
          nombre: isSuperAdmin ? "Administrador" : memoryProfile.nombre,
        };
        await saveUserProfile(newProfile);
        profile = newProfile;
      } else if (isSuperAdmin && profile.rol !== "admin") {
        // Superadmin siempre debe tener rol admin
        const upgraded = { ...profile, rol: "admin" as const };
        await saveUserProfile(upgraded);
        profile = upgraded;
      }

      setUserProfile(profile);
    } catch {
      // Firestore falla (reglas no desplegadas, sin red, etc.)
      // Superadmin siempre obtiene acceso aunque Firestore falle
      setUserProfile(isSuperAdmin ? { ...memoryProfile, nombre: "Administrador" } : null);
    }
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await loadProfile(currentUser);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const isAdmin =
    userProfile?.rol === "admin" || isSuperAdminEmail(user?.email);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, isAdmin, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
