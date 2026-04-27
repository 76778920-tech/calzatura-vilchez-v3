import { describe, it, expect } from "vitest";
import {
  inferScenario,
  scenarioLabel,
  deriveProductImportId,
  validateProducto,
  validateFabricante,
  validateVentaDiaria,
  transformProducto,
  transformFabricante,
  transformVentaDiaria,
} from "@/domains/administradores/utils/importRules";
import type { ImportContext } from "@/domains/administradores/utils/importRules";

// ── Contexto base reutilizable ────────────────────────────────────────────────

const CTX: ImportContext = {
  fileName: "ventas_normal.xlsx",
  importadoEn: "2026-04-25T10:00:00.000Z",
  loteImportacion: "normal-20260425-abc1-ventas-normal",
  escenario: "normal",
};

// ── inferScenario ─────────────────────────────────────────────────────────────

describe("inferScenario", () => {
  it("detecta 'crisis' en el nombre del archivo", () => {
    expect(inferScenario("ventas_crisis_abril.xlsx")).toBe("crisis");
  });

  it("detecta 'normal' en el nombre del archivo", () => {
    expect(inferScenario("datos_normal.xlsx")).toBe("normal");
  });

  it("detecta 'buenas' en el nombre del archivo", () => {
    expect(inferScenario("buenas_ventas_marzo.xlsx")).toBe("buenas");
  });

  it("detecta 'alta' como alias de buenas ventas", () => {
    expect(inferScenario("temporada_alta.xlsx")).toBe("buenas");
  });

  it("retorna 'general' cuando no reconoce el nombre", () => {
    expect(inferScenario("exportacion_2026.xlsx")).toBe("general");
  });

  it("es insensible a mayúsculas", () => {
    expect(inferScenario("VENTAS_CRISIS.xlsx")).toBe("crisis");
  });
});

// ── scenarioLabel ─────────────────────────────────────────────────────────────

describe("scenarioLabel", () => {
  it("retorna etiqueta legible para cada escenario", () => {
    expect(scenarioLabel("crisis")).toBe("Crisis");
    expect(scenarioLabel("normal")).toBe("Normal");
    expect(scenarioLabel("buenas")).toBe("Buenas Ventas");
    expect(scenarioLabel("general")).toBe("General");
  });

  it("retorna 'General' para valores desconocidos", () => {
    expect(scenarioLabel("desconocido")).toBe("General");
    expect(scenarioLabel(null)).toBe("General");
    expect(scenarioLabel(undefined)).toBe("General");
  });
});

// ── deriveProductImportId ─────────────────────────────────────────────────────

describe("deriveProductImportId", () => {
  it("usa el campo 'id' si está presente", () => {
    expect(deriveProductImportId({ id: "PRUEBA_CV001" })).toBe("PRUEBA_CV001");
  });

  it("usa 'productId' si no hay 'id'", () => {
    expect(deriveProductImportId({ productId: "PROD-123" })).toBe("PROD-123");
  });

  it("usa 'codigo' como último recurso", () => {
    expect(deriveProductImportId({ codigo: "CV-001" })).toBe("CV-001");
  });

  it("retorna null si no hay ningún identificador", () => {
    expect(deriveProductImportId({})).toBeNull();
    expect(deriveProductImportId({ nombre: "Zapatilla" })).toBeNull();
  });

  it("normaliza barras a guiones", () => {
    expect(deriveProductImportId({ id: "CV/001" })).toBe("CV-001");
  });

  it("recorta espacios y reemplaza con guiones", () => {
    expect(deriveProductImportId({ id: "CV 001" })).toBe("CV-001");
  });
});

// ── validateProducto ──────────────────────────────────────────────────────────

describe("validateProducto", () => {
  const base = {
    id: "PRUEBA_CV001",
    nombre: "Zapatilla",
    precio: 89.90,
    stock: 10,
    categoria: "Deportivo",
  };

  it("retorna null para una fila válida", () => {
    expect(validateProducto(base)).toBeNull();
  });

  it("rechaza fila sin identificador", () => {
    const { id: _, ...sinId } = base; // eslint-disable-line @typescript-eslint/no-unused-vars
    expect(validateProducto(sinId)).toMatch(/id.*codigo/i);
  });

  it("rechaza fila sin nombre", () => {
    expect(validateProducto({ ...base, nombre: "" })).toMatch(/nombre/i);
  });

  it("rechaza precio no numérico", () => {
    expect(validateProducto({ ...base, precio: "abc" })).toMatch(/precio/i);
  });

  it("rechaza stock no numérico", () => {
    expect(validateProducto({ ...base, stock: "abc" })).toMatch(/stock/i);
  });

  it("rechaza fila sin categoría", () => {
    expect(validateProducto({ ...base, categoria: "" })).toMatch(/categoria/i);
  });
});

// ── validateFabricante ────────────────────────────────────────────────────────

describe("validateFabricante", () => {
  const base = {
    dni: "12345678",
    nombres: "Juan",
    apellidos: "Perez",
    marca: "Marca XYZ",
  };

  it("retorna null para una fila válida", () => {
    expect(validateFabricante(base)).toBeNull();
  });

  it("rechaza DNI con menos de 8 dígitos", () => {
    expect(validateFabricante({ ...base, dni: "1234567" })).toMatch(/DNI/i);
  });

  it("rechaza DNI con más de 8 dígitos", () => {
    expect(validateFabricante({ ...base, dni: "123456789" })).toMatch(/DNI/i);
  });

  it("acepta DNI con puntos o guiones (los ignora)", () => {
    expect(validateFabricante({ ...base, dni: "12.345.678" })).toBeNull();
  });

  it("rechaza fila sin nombres", () => {
    expect(validateFabricante({ ...base, nombres: "" })).toMatch(/nombres/i);
  });

  it("rechaza fila sin apellidos", () => {
    expect(validateFabricante({ ...base, apellidos: "" })).toMatch(/apellidos/i);
  });

  it("rechaza fila sin marca", () => {
    expect(validateFabricante({ ...base, marca: "" })).toMatch(/marca/i);
  });
});

// ── validateVentaDiaria ───────────────────────────────────────────────────────

describe("validateVentaDiaria", () => {
  const base = {
    productId: "PRUEBA_CV001",
    fecha: "2026-04-20",
    cantidad: 2,
    precioVenta: 89.90,
    total: 179.80,
  };

  it("retorna null para una fila válida", () => {
    expect(validateVentaDiaria(base)).toBeNull();
  });

  it("rechaza fila sin productId", () => {
    expect(validateVentaDiaria({ ...base, productId: "" })).toMatch(/productId/i);
  });

  it("rechaza fila sin fecha", () => {
    expect(validateVentaDiaria({ ...base, fecha: "" })).toMatch(/fecha/i);
  });

  it("rechaza cantidad no numérica", () => {
    expect(validateVentaDiaria({ ...base, cantidad: "x" })).toMatch(/cantidad/i);
  });

  it("rechaza precioVenta no numérico", () => {
    expect(validateVentaDiaria({ ...base, precioVenta: "x" })).toMatch(/precioVenta/i);
  });

  it("rechaza total no numérico", () => {
    expect(validateVentaDiaria({ ...base, total: "x" })).toMatch(/total/i);
  });
});

// ── transformProducto ─────────────────────────────────────────────────────────

describe("transformProducto", () => {
  it("convierte precio y stock a número", () => {
    const row = { id: "P1", nombre: "Zapato", precio: "89.90", stock: "10", categoria: "Deportivo" };
    const result = transformProducto(row, CTX);
    expect(result.precio).toBe(89.9);
    expect(result.stock).toBe(10);
  });

  it("aplica esDePrueba = true siempre", () => {
    const result = transformProducto({ nombre: "Zapato" }, CTX);
    expect(result.esDePrueba).toBe(true);
  });

  it("copia loteImportacion y escenario del contexto", () => {
    const result = transformProducto({ nombre: "X" }, CTX);
    expect(result.loteImportacion).toBe(CTX.loteImportacion);
    expect(result.escenario).toBe("normal");
  });

  it("recorta espacios en nombre", () => {
    const result = transformProducto({ nombre: "  Zapatilla  " }, CTX);
    expect(result.nombre).toBe("Zapatilla");
  });
});

// ── transformFabricante ───────────────────────────────────────────────────────

describe("transformFabricante", () => {
  it("establece activo = true siempre", () => {
    const result = transformFabricante({ dni: "12345678", nombres: "Juan", apellidos: "P", marca: "X" }, CTX);
    expect(result.activo).toBe(true);
  });

  it("recorta espacios en campos de texto", () => {
    const result = transformFabricante({ dni: " 12345678 ", nombres: " Juan ", apellidos: " P ", marca: " M " }, CTX);
    expect(result.dni).toBe("12345678");
    expect(result.nombres).toBe("Juan");
  });

  it("usa importadoEn del contexto como creadoEn", () => {
    const result = transformFabricante({}, CTX);
    expect(result.creadoEn).toBe(CTX.importadoEn);
  });
});

// ── transformVentaDiaria ──────────────────────────────────────────────────────

describe("transformVentaDiaria", () => {
  it("convierte cantidad y montos a número", () => {
    const row = { productId: "P1", fecha: "2026-04-20", cantidad: "3", precioVenta: "89.90", total: "269.70" };
    const result = transformVentaDiaria(row, CTX);
    expect(result.cantidad).toBe(3);
    expect(result.precioVenta).toBe(89.9);
    expect(result.total).toBe(269.7);
  });

  it("establece devuelto = false siempre", () => {
    const result = transformVentaDiaria({ productId: "P1", fecha: "2026-04-20" }, CTX);
    expect(result.devuelto).toBe(false);
  });

  it("usa 'ninguno' como documentoTipo por defecto", () => {
    const result = transformVentaDiaria({}, CTX);
    expect(result.documentoTipo).toBe("ninguno");
  });
});
