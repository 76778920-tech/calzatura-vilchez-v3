import { Link } from "react-router-dom";
import { INFO_ROUTES } from "@/routes/paths";
import type { ComplaintFieldErrors, ComplaintFormData, ComplaintType } from "@/domains/publico/utils/complaintBook";

/** Evita que el navegador muestre datos guardados (privacidad en equipos compartidos). */
const NO_BROWSER_AUTOCOMPLETE = "off" as const;

const COMPLAINT_TIPO_OPTIONS = [
  ["reclamo", "Reclamo (producto o servicio)"],
  ["queja", "Queja (atención recibida)"],
] as const satisfies ReadonlyArray<readonly [ComplaintType, string]>;

type ComplaintBookSectionProps = Readonly<{
  form: ComplaintFormData;
  effectiveForm: ComplaintFormData;
  fieldErrors: ComplaintFieldErrors;
  onFieldChange: <K extends keyof ComplaintFormData>(key: K, value: ComplaintFormData[K]) => void;
}>;

export function ComplaintBookTipoFieldset({ form, onFieldChange }: ComplaintBookSectionProps) {
  return (
    <fieldset className="complaint-book-fieldset">
      <legend>Tipo de hoja</legend>
      <div className="complaint-book-radio-row">
        {COMPLAINT_TIPO_OPTIONS.map(([value, label]) => (
          <label key={value} className="complaint-book-radio">
            <input
              type="radio"
              name="tipo"
              value={value}
              checked={form.tipo === value}
              onChange={() => onFieldChange("tipo", value)}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ComplaintBookIdentityFields({
  effectiveForm,
  fieldErrors,
  onFieldChange,
}: ComplaintBookSectionProps) {
  return (
    <div className="complaint-book-grid">
      <div className="form-group">
        <label htmlFor="lr-nombres">Nombres *</label>
        <input
          id="lr-nombres"
          className={`form-input${fieldErrors.nombres ? " input-error" : ""}`}
          value={effectiveForm.nombres}
          onChange={(e) => onFieldChange("nombres", e.target.value)}
          autoComplete={NO_BROWSER_AUTOCOMPLETE}
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
          onChange={(e) => onFieldChange("apellidos", e.target.value)}
          autoComplete={NO_BROWSER_AUTOCOMPLETE}
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
          onChange={(e) => onFieldChange("dni", e.target.value.replace(/\D/g, "").slice(0, 8))}
          inputMode="numeric"
          autoComplete={NO_BROWSER_AUTOCOMPLETE}
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
          onChange={(e) => onFieldChange("domicilio", e.target.value)}
          autoComplete={NO_BROWSER_AUTOCOMPLETE}
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
          onChange={(e) => onFieldChange("telefono", e.target.value)}
          autoComplete={NO_BROWSER_AUTOCOMPLETE}
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
          onChange={(e) => onFieldChange("email", e.target.value)}
          autoComplete={NO_BROWSER_AUTOCOMPLETE}
          required
        />
        {fieldErrors.email ? <p className="field-error">{fieldErrors.email}</p> : null}
      </div>
    </div>
  );
}

export function ComplaintBookClaimFields({
  effectiveForm,
  fieldErrors,
  onFieldChange,
}: ComplaintBookSectionProps) {
  return (
    <>
      <div className="form-group">
        <label htmlFor="lr-bien">Producto o servicio *</label>
        <input
          id="lr-bien"
          className={`form-input${fieldErrors.bienContratado ? " input-error" : ""}`}
          value={effectiveForm.bienContratado}
          onChange={(e) => onFieldChange("bienContratado", e.target.value)}
          autoComplete={NO_BROWSER_AUTOCOMPLETE}
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
            onChange={(e) => onFieldChange("monto", e.target.value)}
            inputMode="decimal"
            autoComplete={NO_BROWSER_AUTOCOMPLETE}
          />
          {fieldErrors.monto ? <p className="field-error">{fieldErrors.monto}</p> : null}
        </div>
        <div className="form-group">
          <label htmlFor="lr-pedido-num">N.° de pedido (opcional)</label>
          <input
            id="lr-pedido-num"
            className="form-input"
            value={effectiveForm.numeroPedido}
            onChange={(e) => onFieldChange("numeroPedido", e.target.value)}
            autoComplete={NO_BROWSER_AUTOCOMPLETE}
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
          onChange={(e) => onFieldChange("detalle", e.target.value)}
          placeholder="Describe el problema y qué solución solicitas (cambio, reembolso, etc.)"
          autoComplete={NO_BROWSER_AUTOCOMPLETE}
          required
        />
        {fieldErrors.detalle ? <p className="field-error">{fieldErrors.detalle}</p> : null}
      </div>
    </>
  );
}

type ComplaintBookPrivacySubmitProps = Readonly<{
  aceptaPrivacidad: boolean;
  fieldErrors: ComplaintFieldErrors;
  submitting: boolean;
  onPrivacyChange: (checked: boolean) => void;
}>;

export function ComplaintBookPrivacySubmit({
  aceptaPrivacidad,
  fieldErrors,
  submitting,
  onPrivacyChange,
}: ComplaintBookPrivacySubmitProps) {
  return (
    <>
      <label className="complaint-book-check">
        <input
          type="checkbox"
          checked={aceptaPrivacidad}
          onChange={(e) => onPrivacyChange(e.target.checked)}
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
    </>
  );
}
