import { describe, expect, it } from "vitest";
import { sanitizeSpreadsheetCellValue } from "@/domains/administradores/utils/spreadsheet";

describe("spreadsheet export security", () => {
  it("neutraliza texto que Excel podria interpretar como formula", () => {
    expect(sanitizeSpreadsheetCellValue("=HYPERLINK(\"http://evil.test\")")).toBe("'=HYPERLINK(\"http://evil.test\")");
    expect(sanitizeSpreadsheetCellValue("+SUM(1,1)")).toBe("'+SUM(1,1)");
    expect(sanitizeSpreadsheetCellValue("-10+cmd")).toBe("'-10+cmd");
    expect(sanitizeSpreadsheetCellValue("@NOW()")).toBe("'@NOW()");
  });

  it("mantiene valores normales y no texto sin cambios", () => {
    expect(sanitizeSpreadsheetCellValue("Zapato Casual")).toBe("Zapato Casual");
    expect(sanitizeSpreadsheetCellValue(42)).toBe(42);
    expect(sanitizeSpreadsheetCellValue(null)).toBeNull();
  });
});
