import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { auth } from "@/firebase/config";
import { ensureVerifiedUserProfile } from "@/domains/usuarios/services/auth";
import { getUserProfile, saveUserProfile } from "@/domains/usuarios/services/users";
import type { UserProfile } from "@/types";
import { isSuperAdminEmail } from "@/config/security";

type AuthContextType = Readonly<{
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  requiresEmailVerification: boolean;
  hasVerifiedAccess: boolean;
  refreshProfile: () => Promise<void>;
}>;

type AuthProviderProps = Readonly<{
  children: ReactNode;
}>;

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  isAdmin: false,
  requiresEmailVerification: false,
  hasVerifiedAccess: false,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (currentUser: User) => {
    const isSuperAdmin = isSuperAdminEmail(currentUser.email);

    if (!currentUser.emailVerified && !isSuperAdmin) {
      setUserProfile(null);
      return;
    }

    const memoryProfile: UserProfile = {
      uid: currentUser.uid,
      nombre: currentUser.displayName ?? currentUser.email?.split("@")[0] ?? "Usuario",
      email: currentUser.email ?? "",
      rol: isSuperAdmin ? "admin" : "cliente",
      creadoEn: new Date().toISOString(),
    };

    try {
      let profile = await getUserProfile(currentUser.uid);

      profile ??= await ensureVerifiedUserProfile(currentUser);

      if (!profile && isSuperAdmin) {
        const newProfile: UserProfile = { ...memoryProfile, nombre: "Administrador" };
        await saveUserProfile(newProfile);
        profile = newProfile;
      } else if (profile && isSuperAdmin && profile.rol !== "admin") {
        const upgraded: UserProfile = { ...profile, rol: "admin" };
        await saveUserProfile(upgraded);
        profile = upgraded;
      }

      setUserProfile(profile ?? null);
    } catch {
      setUserProfile(isSuperAdmin ? { ...memoryProfile, nombre: "Administrador" } : null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user);
  }, [user, loadProfile]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      const isSuperAdmin = isSuperAdminEmail(currentUser?.email);

      if (currentUser && !currentUser.emailVerified && !isSuperAdmin) {
        setUser(null);
        setUserProfile(null);
        setLoading(false);
        return;
      }

      setUser(currentUser);

      if (currentUser) {
        await loadProfile(currentUser);
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [loadProfile]);

  const isAdmin =
    userProfile?.rol === "admin" || isSuperAdminEmail(user?.email);
  const requiresEmailVerification =
    Boolean(user && !user.emailVerified && !isAdmin);
  const hasVerifiedAccess =
    Boolean(user && (user.emailVerified || isAdmin));

  const contextValue = useMemo(
    () => ({
      user,
      userProfile,
      loading,
      isAdmin,
      requiresEmailVerification,
      hasVerifiedAccess,
      refreshProfile,
    }),
    [user, userProfile, loading, isAdmin, requiresEmailVerification, hasVerifiedAccess, refreshProfile],
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
