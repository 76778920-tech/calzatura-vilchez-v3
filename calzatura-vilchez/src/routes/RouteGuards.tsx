import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/domains/usuarios/context/AuthContext";
import type { AccessArea } from "../security/accessControl";
import { canAccessArea } from "../security/accessControl";

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

export function AuthenticatedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to={`/login?redirect=${location.pathname}`} replace />;

  return <>{children}</>;
}

export function AreaRoute({
  area,
  children,
}: {
  area: AccessArea;
  children: ReactNode;
}) {
  const { user, userProfile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader />;

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
