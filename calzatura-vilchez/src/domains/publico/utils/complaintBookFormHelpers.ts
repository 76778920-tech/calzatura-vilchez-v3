import type { UserProfile } from "@/types";
import type { ComplaintFormData } from "@/domains/publico/utils/complaintBook";
import { submitComplaintToServer } from "@/domains/publico/services/libroReclamaciones";
import { validateComplaintForm } from "@/domains/publico/utils/complaintBookValidation";

export type ComplaintSubmission = ComplaintFormData & {
  codigo: string;
  submittedAt: string;
};

export function profileBackfillComplaintForm(
  form: ComplaintFormData,
  userProfile: UserProfile | null | undefined,
): ComplaintFormData {
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

export function trimComplaintFormData(form: ComplaintFormData): ComplaintFormData {
  return {
    ...form,
    nombres: form.nombres.trim(),
    apellidos: form.apellidos.trim(),
    dni: form.dni.trim(),
    domicilio: form.domicilio.trim(),
    telefono: form.telefono.trim(),
    email: form.email.trim(),
    bienContratado: form.bienContratado.trim(),
    monto: form.monto.trim(),
    numeroPedido: form.numeroPedido.trim(),
    detalle: form.detalle.trim(),
  };
}

export async function registerComplaintOnServer(
  form: ComplaintFormData,
  aceptaPrivacidad: boolean,
): Promise<ComplaintSubmission> {
  const errors = validateComplaintForm(form, aceptaPrivacidad);
  if (Object.keys(errors).length > 0) {
    throw new ValidationAggregateError(errors);
  }

  const trimmed = trimComplaintFormData(form);
  const result = await submitComplaintToServer(trimmed, aceptaPrivacidad);
  return {
    ...trimmed,
    codigo: result.codigo,
    submittedAt: result.submittedAt,
  };
}

export class ValidationAggregateError extends Error {
  readonly fieldErrors: ReturnType<typeof validateComplaintForm>;

  constructor(fieldErrors: ReturnType<typeof validateComplaintForm>) {
    super("Revisa los campos marcados");
    this.name = "ValidationAggregateError";
    this.fieldErrors = fieldErrors;
  }
}
