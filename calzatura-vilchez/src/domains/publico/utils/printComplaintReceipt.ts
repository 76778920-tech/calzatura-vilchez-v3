/** Abre ventana de impresión sin document.write (API obsoleta). */
export function printHtmlDocument(html: string, title: string): void {
  const w = window.open("", "_blank", "noopener,noreferrer,width=720,height=900");
  if (!w) return;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);

  const cleanup = () => URL.revokeObjectURL(url);
  w.addEventListener("afterprint", cleanup, { once: true });
  w.addEventListener("load", () => {
    w.document.title = title;
    w.focus();
    w.print();
  }, { once: true });
  w.location.href = url;
}

export function buildComplaintReceiptPrintHtml(bodyHtml: string, codigo: string): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/>
<title>Constancia ${codigo}</title>
<style>
body{font-family:system-ui,sans-serif;padding:24px;color:#111;line-height:1.5}
h1{font-size:1.25rem;margin:0 0 8px}
.meta{color:#444;font-size:0.9rem;margin-bottom:20px}
dl{display:grid;grid-template-columns:140px 1fr;gap:6px 12px;margin:0}
dt{font-weight:600;margin:0}
dd{margin:0}
.foot{margin-top:24px;font-size:0.85rem;color:#555;border-top:1px solid #ddd;padding-top:12px}
</style></head><body>${bodyHtml}</body></html>`;
}
