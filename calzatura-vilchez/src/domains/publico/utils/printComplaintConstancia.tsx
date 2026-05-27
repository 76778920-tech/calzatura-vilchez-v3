import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { ComplaintConstanciaDocument } from "@/domains/publico/utils/complaintConstanciaDocument";
import type { ComplaintConstanciaSubmission } from "@/domains/publico/utils/complaintConstanciaTypes";

const PRINT_ROOT_ID = "complaint-print-root";
const PRINT_BODY_CLASS = "complaint-print-active";

function removePrintRoot(): void {
  document.body.classList.remove(PRINT_BODY_CLASS);
  document.getElementById(PRINT_ROOT_ID)?.remove();
}

/** Imprime solo la constancia legal; oculta menú, formulario y textos de la página. */
export function printComplaintConstancia(submission: ComplaintConstanciaSubmission): void {
  removePrintRoot();

  const host = document.createElement("div");
  host.id = PRINT_ROOT_ID;
  document.body.append(host);
  document.body.classList.add(PRINT_BODY_CLASS);

  const root = createRoot(host);
  flushSync(() => {
    root.render(<ComplaintConstanciaDocument submission={submission} />);
  });

  const cleanup = () => {
    root.unmount();
    removePrintRoot();
  };

  globalThis.addEventListener("afterprint", cleanup, { once: true });
  globalThis.setTimeout(() => {
    if (document.getElementById(PRINT_ROOT_ID)) cleanup();
  }, 60_000);

  globalThis.focus();
  globalThis.print();
}
