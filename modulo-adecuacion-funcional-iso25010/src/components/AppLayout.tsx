import { Link, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

export function AppLayout({ children }: { children: ReactNode }) {
  const loc = useLocation();
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div>
            <p className="kicker">Instrumento de medición · ISO/IEC 25010</p>
            <h1>Calzatura Vilchez — Adecuación Funcional</h1>
            <p className="topbar-muted">
              Indicadores CF, COF y TECP calculados en tiempo real desde los datos registrados en el sistema.
            </p>
          </div>
          <nav className="topnav">
            <a href="/" className="topnav-external">
              ← Dashboard ISO 25000
            </a>
            <Link to="/" className={loc.pathname === "/" ? "active" : ""}>
              Panel CF / COF / TECP
            </Link>
            <Link to="/nueva" className={loc.pathname === "/nueva" ? "active" : ""}>
              Nueva evaluación
            </Link>
          </nav>
        </div>
      </header>
      <main className="main-content">{children}</main>
      <footer className="app-footer">
        <span>Sistema de Gestión de Calzados · Calzatura Vilchez</span>
        <span className="footer-note">Los porcentajes solo cambian al modificar registros en el programa.</span>
      </footer>
    </div>
  );
}
