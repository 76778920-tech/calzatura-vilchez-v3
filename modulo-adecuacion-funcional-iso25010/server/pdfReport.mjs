import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

function fmtPct(v) {
  return v == null ? "N/D" : `${v.toFixed(2)}%`;
}

export function buildEvaluationPdf(metrics) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const { evaluacion, completitud_funcional: cf, correccion_funcional: cof, tecp } = metrics;
  const margin = 14;
  let y = 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Reporte de Adecuación Funcional", margin, y);
  y += 8;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("ISO/IEC 25010 — Sistema de Gestión de Calzados", margin, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.text("Datos de la evaluación", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  const meta = [
    ["Código", evaluacion.codigo],
    ["Título", evaluacion.titulo],
    ["Sistema", evaluacion.sistema],
    ["Periodo", evaluacion.periodo || "—"],
    ["Evaluador", evaluacion.evaluador || "—"],
    ["Fecha", evaluacion.fecha_evaluacion],
  ];
  autoTable(doc, {
    startY: y,
    head: [],
    body: meta,
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 1.5 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 35 } },
    margin: { left: margin, right: margin },
  });
  y = doc.lastAutoTable.finalY + 8;

  doc.setFont("helvetica", "bold");
  doc.text("Indicadores", margin, y);
  y += 4;
  autoTable(doc, {
    startY: y,
    head: [["Indicador", "Fórmula", "Resultado", "Clasificación"]],
    body: [
      [
        "Completitud Funcional (CF)",
        `(${cf.funciones_implementadas}/${cf.funciones_requeridas})×100`,
        fmtPct(cf.pct),
        cf.classification.label,
      ],
      [
        "Corrección Funcional (COF)",
        `(${cof.transacciones_correctas}/${cof.transacciones_evaluadas})×100`,
        fmtPct(cof.pct),
        cof.classification.label,
      ],
      [
        "Tasa Éxito Casos (TECP)",
        `(${tecp.casos_aprobados}/${tecp.casos_ejecutados})×100`,
        fmtPct(tecp.pct),
        tecp.classification.label,
      ],
      [
        "Promedio Adecuación Funcional",
        "Media aritmética CF, COF, TECP",
        fmtPct(metrics.promedio_adecuacion),
        metrics.promedio_classification.label,
      ],
    ],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [22, 50, 79] },
    margin: { left: margin, right: margin },
  });
  y = doc.lastAutoTable.finalY + 8;

  doc.setFont("helvetica", "bold");
  doc.text("Escala de clasificación", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("90%–100% Excelente | 80%–89% Bueno | 70%–79% Aceptable | <70% Deficiente", margin, y);
  y += 8;

  if (evaluacion.observaciones) {
    doc.setFont("helvetica", "bold");
    doc.text("Observaciones", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(evaluacion.observaciones, 180);
    doc.text(lines, margin, y);
    y += lines.length * 4 + 4;
  }

  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(`Generado: ${new Date().toLocaleString("es-PE")} — Calzatura Vilchez QC Module`, margin, 285);

  return Buffer.from(doc.output("arraybuffer"));
}
