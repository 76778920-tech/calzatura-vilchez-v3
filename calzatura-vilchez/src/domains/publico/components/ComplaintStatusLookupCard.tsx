import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import { lookupComplaintByCode, type ComplaintLookupRecord } from "@/domains/publico/services/libroReclamaciones";

const ESTADO_LABEL: Record<string, string> = {
  recibido: "Recibido",
  en_tramite: "En trámite",
  respondido: "Respondido",
  cerrado: "Cerrado",
};

const TIPO_LABEL: Record<string, string> = {
  reclamo: "Reclamo",
  queja: "Queja",
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export function ComplaintStatusLookupCard() {
  const [codigo, setCodigo] = useState("");
  const [dni, setDni] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ComplaintLookupRecord | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const complaint = await lookupComplaintByCode(codigo, dni);
      setResult(complaint);
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : "No se pudo consultar la hoja");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="complaint-lookup-card" aria-label="Consulta por código de reclamación">
      <h3>Consultar mi hoja por código</h3>
      <p className="complaint-book-note">
        Ingresa el código de constancia y el DNI del titular. Solo mostraremos tipo, estado y fecha de registro.
      </p>
      <form className="complaint-book-form" onSubmit={onSubmit}>
        <div className="complaint-book-grid complaint-book-grid--two">
          <div className="form-group">
            <label htmlFor="lookup-codigo">Código</label>
            <input
              id="lookup-codigo"
              className="form-input"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="CV-LR-20260527-ABC123"
              autoCapitalize="characters"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="lookup-dni">DNI</label>
            <input
              id="lookup-dni"
              className="form-input"
              value={dni}
              onChange={(e) => setDni(e.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="12345678"
              inputMode="numeric"
              pattern="\d{8}"
              required
            />
          </div>
        </div>
        <button className="btn-ghost" type="submit" disabled={loading}>
          <Search size={16} aria-hidden="true" />
          {loading ? "Consultando..." : "Consultar estado"}
        </button>
      </form>
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}
      {result ? (
        <article className="complaint-status-result" aria-live="polite">
          <p>
            <strong>Código:</strong> {result.codigo}
          </p>
          <p>
            <strong>Tipo:</strong> {TIPO_LABEL[result.tipo] ?? result.tipo}
          </p>
          <p>
            <strong>Estado:</strong> {ESTADO_LABEL[result.estado] ?? result.estado}
          </p>
          <p>
            <strong>Registrado:</strong> {formatDate(result.creadoEn)}
          </p>
        </article>
      ) : null}
    </section>
  );
}
