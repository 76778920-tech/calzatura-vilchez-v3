import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/domains/usuarios/context/AuthContext";
import type { AccessArea } from "../security/accessControl";
import { canAccessArea } from "../security/accessControl";
import { PUBLIC_ROUTES } from "./paths";

function PageLoader() {
  return (
    <div style={{
      minHeight: "60vh", display: "flex", alignItems: "center",
      justifyContent: "center", flexDirection: "column", gap: "1rem",
    }}>
      <div className="success-spinner" />
    </div>
  );
}

type AreaRouteProps = Readonly<{
  area: AccessArea;
  children: ReactNode;
}>;

export function AuthenticatedRoute({ children }: Readonly<{ children: ReactNode }>) {
  const { user, loading, requiresEmailVerification } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to={`/login?redirect=${location.pathname}`} replace />;
  if (requiresEmailVerification) {
    return <Navigate to={PUBLIC_ROUTES.verifyEmail} replace />;
  }

  return <>{children}</>;
}

export function AreaRoute({
  area,
  children,
}: AreaRouteProps) {
  const { user, userProfile, loading, requiresEmailVerification } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader />;
  if (requiresEmailVerification) {
    return <Navigate to={PUBLIC_ROUTES.verifyEmail} replace />;
  }

  const allowed = canAccessArea(area, userProfile?.rol, user?.email);
  if (!allowed && !user) {
    return <Navigate to={`/login?redirect=${location.pathname}`} replace />;
  }
  if (!allowed) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export { PageLoader };
