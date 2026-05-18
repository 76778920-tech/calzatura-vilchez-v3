import ExcelJS from "exceljs";

export const MAX_XLSX_IMPORT_BYTES = 5 * 1024 * 1024;

export type SpreadsheetRow = Record<string, unknown>;

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
        headers[col - 1] = String(cell.value ?? "").trim();
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
      sheet.addRow(row);
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
