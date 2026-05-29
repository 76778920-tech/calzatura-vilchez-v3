import ExcelJS from "exceljs";

export const MAX_XLSX_IMPORT_BYTES = 5 * 1024 * 1024;

export type SpreadsheetRow = Record<string, unknown>;
const FORMULA_PREFIXES = new Set(["=", "+", "-", "@"]);

function formatHeaderCell(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const rich = value as { text?: string; result?: string | number };
    if (typeof rich.text === "string") return rich.text.trim();
    if (rich.result != null) return String(rich.result).trim();
    return "";
  }
  return String(value).trim();
}

export async function readXlsxFirstSheet(buffer: ArrayBuffer): Promise<SpreadsheetRow[]> {
  if (buffer.byteLength > MAX_XLSX_IMPORT_BYTES) {
    throw new Error("El archivo supera el limite de 5 MB");
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const headers: string[] = [];
  const rows: SpreadsheetRow[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      row.eachCell((cell, col) => {
        headers[col - 1] = formatHeaderCell(cell.value);
      });
      return;
    }
    const record: SpreadsheetRow = {};
    row.eachCell((cell, col) => {
      const key = headers[col - 1];
      if (!key) return;
      const value = cell.value;
      record[key] = value instanceof Date ? value.toISOString() : value;
    });
    if (Object.keys(record).length > 0) rows.push(record);
  });

  return rows;
}

export function sanitizeSpreadsheetCellValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const first = value[0];
  if (first && (FORMULA_PREFIXES.has(first) || first === "\t" || first === "\r")) {
    return `'${value}`;
  }
  return value;
}

function sanitizeSpreadsheetRow(row: SpreadsheetRow): SpreadsheetRow {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, sanitizeSpreadsheetCellValue(value)]),
  );
}

export async function downloadXlsx(
  filename: string,
  sheetName: string,
  rows: SpreadsheetRow[],
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName.slice(0, 31));
  if (rows.length > 0) {
    const keys = Object.keys(rows[0]);
    sheet.columns = keys.map((key) => ({ header: key, key, width: 16 }));
    for (const row of rows) {
      sheet.addRow(sanitizeSpreadsheetRow(row));
    }
  }
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
