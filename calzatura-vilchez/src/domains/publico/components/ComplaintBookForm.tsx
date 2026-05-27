import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/domains/usuarios/context/AuthContext";
import { INFO_ROUTES } from "@/routes/paths";
import { ComplaintReceipt } from "@/domains/publico/components/ComplaintReceipt";
import { submitComplaintToServer } from "@/domains/publico/services/libroReclamaciones";
import {
  validateComplaintForm,
  type ComplaintFormData,
  type ComplaintFieldErrors,
  type ComplaintType,
} from "@/domains/publico/utils/complaintBook";
import toast from "react-hot-toast";

const EMPTY_FORM: ComplaintFormData = {
  tipo: "reclamo",
  nombres: "",
  apellidos: "",
  dni: "",
  domicilio: "",
  telefono: "",
  email: "",
  bienContratado: "",
  monto: "",
  numeroPedido: "",
  detalle: "",
};

type Submission = ComplaintFormData & { codigo: string; submittedAt: string };

function profileBackfill(form: ComplaintFormData, userProfile: ReturnType<typeof useAuth>["userProfile"]): ComplaintFormData {
  if (!userProfile) return form;
  const nombreParts = userProfile.nombre.split(" ");
  return {
    ...form,
    nombres: form.nombres || userProfile.nombres || nombreParts[0] || "",
    apellidos: form.apellidos || userProfile.apellidos || nombreParts.slice(1).join(" ") || "",
    dni: form.dni || userProfile.dni || "",
    email: form.email || userProfile.email || "",
    telefono: form.telefono || userProfile.telefono || "",
    domicilio: form.domicilio || userProfile.direcciones?.[0]?.direccion || "",
  };
}

export function ComplaintBookForm() {
  const { userProfile } = useAuth();
  const [form, setForm] = useState<ComplaintFormData>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<ComplaintFieldErrors>({});
  const [aceptaPrivacidad, setAceptaPrivacidad] = useState(false);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const effectiveForm = useMemo(() => profileBackfill(form, userProfile), [form, userProfile]);

  const update = <K extends keyof ComplaintFormData>(key: K, value: ComplaintFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    const errors = validateComplaintForm(effectiveForm, aceptaPrivacidad);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error("Revisa los campos marcados");
      return;
    }

    const trimmed: ComplaintFormData = {
      ...effectiveForm,
      nombres: effectiveForm.nombres.trim(),
      apellidos: effectiveForm.apellidos.trim(),
      dni: effectiveForm.dni.trim(),
      domicilio: effectiveForm.domicilio.trim(),
      telefono: effectiveForm.telefono.trim(),
      email: effectiveForm.email.trim(),
      bienContratado: effectiveForm.bienContratado.trim(),
      monto: effectiveForm.monto.trim(),
      numeroPedido: effectiveForm.numeroPedido.trim(),
      detalle: effectiveForm.detalle.trim(),
    };

    setSubmitting(true);
    try {
      const result = await submitComplaintToServer(trimmed, aceptaPrivacidad);
      setSubmission({
        ...trimmed,
        codigo: result.codigo,
        submittedAt: result.submittedAt,
      });
      toast.success("Hoja registrada en el libro");
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo registrar la hoja";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submission) {
    return <ComplaintReceipt submission={submission} />;
  }

  return (
    <form className="complaint-book-form" onSubmit={handleSubmit} noValidate>
      <p className="complaint-book-form-lead">
        Al enviar, tu hoja se registra en nuestro libro virtual con un código de referencia. El
        trámite es gratuito y no sustituye la atención presencial ni por WhatsApp.
      </p>

      <fieldset className="complaint-book-fieldset">
        <legend>Tipo de hoja</legend>
        <div className="complaint-book-radio-row">
          {(
            [
              ["reclamo", "Reclamo (producto o servicio)"],
              ["queja", "Queja (atención recibida)"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="complaint-book-radio">
              <input
                type="radio"
                name="tipo"
                value={value}
                checked={form.tipo === value}
                onChange={() => update("tipo", value as ComplaintType)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="complaint-book-grid">
        <div className="form-group">
          <label htmlFor="lr-nombres">Nombres *</label>
          <input
            id="lr-nombres"
            className={`form-input${fieldErrors.nombres ? " input-error" : ""}`}
            value={effectiveForm.nombres}
            onChange={(e) => update("nombres", e.target.value)}
            autoComplete="given-name"
            required
          />
          {fieldErrors.nombres ? <p className="field-error">{fieldErrors.nombres}</p> : null}
        </div>
        <div className="form-group">
          <label htmlFor="lr-apellidos">Apellidos *</label>
          <input
            id="lr-apellidos"
            className={`form-input${fieldErrors.apellidos ? " input-error" : ""}`}
            value={effectiveForm.apellidos}
            onChange={(e) => update("apellidos", e.target.value)}
            autoComplete="family-name"
            required
          />
          {fieldErrors.apellidos ? <p className="field-error">{fieldErrors.apellidos}</p> : null}
        </div>
        <div className="form-group">
          <label htmlFor="lr-dni">DNI *</label>
          <input
            id="lr-dni"
            className={`form-input${fieldErrors.dni ? " input-error" : ""}`}
            value={effectiveForm.dni}
            onChange={(e) => update("dni", e.target.value.replace(/\D/g, "").slice(0, 8))}
            inputMode="numeric"
            required
          />
          {fieldErrors.dni ? <p className="field-error">{fieldErrors.dni}</p> : null}
        </div>
        <div className="form-group complaint-book-grid-full">
          <label htmlFor="lr-domicilio">Domicilio *</label>
          <input
            id="lr-domicilio"
            className={`form-input${fieldErrors.domicilio ? " input-error" : ""}`}
            value={effectiveForm.domicilio}
            onChange={(e) => update("domicilio", e.target.value)}
            autoComplete="street-address"
            required
          />
          {fieldErrors.domicilio ? <p className="field-error">{fieldErrors.domicilio}</p> : null}
        </div>
        <div className="form-group">
          <label htmlFor="lr-telefono">Teléfono *</label>
          <input
            id="lr-telefono"
            className={`form-input${fieldErrors.telefono ? " input-error" : ""}`}
            value={effectiveForm.telefono}
            onChange={(e) => update("telefono", e.target.value)}
            autoComplete="tel"
            required
          />
          {fieldErrors.telefono ? <p className="field-error">{fieldErrors.telefono}</p> : null}
        </div>
        <div className="form-group">
          <label htmlFor="lr-email">Correo electrónico *</label>
          <input
            id="lr-email"
            type="email"
            className={`form-input${fieldErrors.email ? " input-error" : ""}`}
            value={effectiveForm.email}
            onChange={(e) => update("email", e.target.value)}
            autoComplete="email"
            required
          />
          {fieldErrors.email ? <p className="field-error">{fieldErrors.email}</p> : null}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="lr-bien">Producto o servicio *</label>
        <input
          id="lr-bien"
          className={`form-input${fieldErrors.bienContratado ? " input-error" : ""}`}
          value={effectiveForm.bienContratado}
          onChange={(e) => update("bienContratado", e.target.value)}
        />
        {fieldErrors.bienContratado ? (
          <p className="field-error">{fieldErrors.bienContratado}</p>
        ) : null}
      </div>

      <div className="complaint-book-grid">
        <div className="form-group">
          <label htmlFor="lr-monto">
            Monto (S/) {effectiveForm.tipo === "reclamo" ? "*" : "(opcional)"}
          </label>
          <input
            id="lr-monto"
            className={`form-input${fieldErrors.monto ? " input-error" : ""}`}
            value={effectiveForm.monto}
            onChange={(e) => update("monto", e.target.value)}
            inputMode="decimal"
          />
          {fieldErrors.monto ? <p className="field-error">{fieldErrors.monto}</p> : null}
        </div>
        <div className="form-group">
          <label htmlFor="lr-pedido-num">N.° de pedido (opcional)</label>
          <input
            id="lr-pedido-num"
            className="form-input"
            value={effectiveForm.numeroPedido}
            onChange={(e) => update("numeroPedido", e.target.value)}
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="lr-detalle">Detalle y pedido del consumidor *</label>
        <textarea
          id="lr-detalle"
          className={`form-input complaint-book-textarea${fieldErrors.detalle ? " input-error" : ""}`}
          rows={5}
          value={effectiveForm.detalle}
          onChange={(e) => update("detalle", e.target.value)}
          placeholder="Describe el problema y qué solución solicitas (cambio, reembolso, etc.)"
          required
        />
        {fieldErrors.detalle ? <p className="field-error">{fieldErrors.detalle}</p> : null}
      </div>

      <label className="complaint-book-check">
        <input
          type="checkbox"
          checked={aceptaPrivacidad}
          onChange={(e) => {
            setAceptaPrivacidad(e.target.checked);
            setFieldErrors((prev) => ({ ...prev, aceptaPrivacidad: undefined }));
          }}
        />
        <span>
          Autorizo el tratamiento de mis datos conforme a la{" "}
          <Link to={INFO_ROUTES.legalPrivacidad}>Política de privacidad</Link>.
        </span>
      </label>
      {fieldErrors.aceptaPrivacidad ? (
        <p className="field-error">{fieldErrors.aceptaPrivacidad}</p>
      ) : null}

      <button type="submit" className="btn-primary complaint-book-submit" disabled={submitting}>
        {submitting ? "Registrando…" : "Registrar hoja en el libro"}
      </button>
    </form>
  );
}
