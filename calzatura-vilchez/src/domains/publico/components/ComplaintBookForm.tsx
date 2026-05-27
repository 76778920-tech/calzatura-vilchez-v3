import { useMemo, useState } from "react";
import { useAuth } from "@/domains/usuarios/context/AuthContext";
import { ComplaintReceipt } from "@/domains/publico/components/ComplaintReceipt";
import { ComplaintBookFields } from "@/domains/publico/components/ComplaintBookFields";
import {
  profileBackfillComplaintForm,
  registerComplaintOnServer,
  ValidationAggregateError,
  type ComplaintSubmission,
} from "@/domains/publico/utils/complaintBookFormHelpers";
import type { ComplaintFieldErrors, ComplaintFormData } from "@/domains/publico/utils/complaintBook";
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

export function ComplaintBookForm() {
  const { userProfile } = useAuth();
  const [form, setForm] = useState<ComplaintFormData>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<ComplaintFieldErrors>({});
  const [aceptaPrivacidad, setAceptaPrivacidad] = useState(false);
  const [submission, setSubmission] = useState<ComplaintSubmission | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const effectiveForm = useMemo(
    () => profileBackfillComplaintForm(form, userProfile),
    [form, userProfile],
  );

  const update = <K extends keyof ComplaintFormData>(key: K, value: ComplaintFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const registered = await registerComplaintOnServer(effectiveForm, aceptaPrivacidad);
      setSubmission(registered);
      toast.success("Hoja registrada en el libro");
    } catch (err) {
      if (err instanceof ValidationAggregateError) {
        setFieldErrors(err.fieldErrors);
        toast.error(err.message);
        return;
      }
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
    <ComplaintBookFields
      form={form}
      effectiveForm={effectiveForm}
      fieldErrors={fieldErrors}
      aceptaPrivacidad={aceptaPrivacidad}
      submitting={submitting}
      onFieldChange={update}
      onPrivacyChange={(checked) => {
        setAceptaPrivacidad(checked);
        setFieldErrors((prev) => ({ ...prev, aceptaPrivacidad: undefined }));
      }}
      onSubmit={handleSubmit}
    />
  );
}
