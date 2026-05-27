import type { ComplaintFieldErrors, ComplaintFormData } from "@/domains/publico/utils/complaintBook";
import {
  ComplaintBookClaimFields,
  ComplaintBookIdentityFields,
  ComplaintBookPrivacySubmit,
  ComplaintBookTipoFieldset,
} from "@/domains/publico/components/ComplaintBookFormSections";

type ComplaintBookFieldsProps = Readonly<{
  form: ComplaintFormData;
  effectiveForm: ComplaintFormData;
  fieldErrors: ComplaintFieldErrors;
  aceptaPrivacidad: boolean;
  submitting: boolean;
  onFieldChange: <K extends keyof ComplaintFormData>(key: K, value: ComplaintFormData[K]) => void;
  onPrivacyChange: (checked: boolean) => void;
  onSubmit: (e: { preventDefault(): void }) => void;
}>;

export function ComplaintBookFields({
  form,
  effectiveForm,
  fieldErrors,
  aceptaPrivacidad,
  submitting,
  onFieldChange,
  onPrivacyChange,
  onSubmit,
}: ComplaintBookFieldsProps) {
  const sectionProps = { form, effectiveForm, fieldErrors, onFieldChange };

  return (
    <form
      className="complaint-book-form"
      onSubmit={onSubmit}
      noValidate
      autoComplete="off"
      data-form-type="other"
    >
      <p className="complaint-book-form-lead">
        Al enviar, tu hoja se registra en nuestro libro virtual con un código de referencia. El
        trámite es gratuito y no sustituye la atención presencial ni por WhatsApp.
      </p>

      <ComplaintBookTipoFieldset {...sectionProps} />
      <ComplaintBookIdentityFields {...sectionProps} />
      <ComplaintBookClaimFields {...sectionProps} />
      <ComplaintBookPrivacySubmit
        aceptaPrivacidad={aceptaPrivacidad}
        fieldErrors={fieldErrors}
        submitting={submitting}
        onPrivacyChange={onPrivacyChange}
      />
    </form>
  );
}
