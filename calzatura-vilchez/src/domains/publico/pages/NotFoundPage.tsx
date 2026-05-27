import { Link } from "react-router-dom";
import { Home, ArrowLeft } from "lucide-react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function NotFoundPage() {
  useDocumentTitle("Página no encontrada");
  return (
    <main className="not-found-page">
      <div className="not-found-inner">
        <span className="not-found-code" aria-hidden="true">404</span>
        <h1 className="not-found-title">Esta página no existe</h1>
        <p className="not-found-desc">
          La dirección que buscas no está disponible o fue movida.
        </p>
        <div className="not-found-actions">
          <Link to="/" className="btn-primary not-found-btn">
            <Home size={16} aria-hidden="true" /> Ir al inicio
          </Link>
          <button
            type="button"
            className="btn-outline not-found-btn"
            onClick={() => history.back()}
          >
            <ArrowLeft size={16} aria-hidden="true" /> Volver
          </button>
        </div>
      </div>
    </main>
  );
}
