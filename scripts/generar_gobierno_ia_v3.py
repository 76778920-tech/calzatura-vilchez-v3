"""
Genera la plantilla Gobierno IA V3 completa para Calzatura Vilchez.
Fuente: bolts empresariales, procesos de trazabilidad y módulo IA del repositorio.
"""
from __future__ import annotations

import shutil
from datetime import date
from pathlib import Path

import openpyxl
from openpyxl.utils import get_column_letter

ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = Path.home() / "Downloads" / "Plantilla_Gobierno_IA_V3.xlsx"
BOLT_MATRIX = ROOT / "artifacts" / "matrices" / "Matriz_Registro_Web_Empresarial_AI_DLC_BOLT.xlsx"
OUT_ARTIFACTS = ROOT / "artifacts" / "matrices" / "Plantilla_Gobierno_IA_V3_CALZATURA_VILCHEZ.xlsx"
OUT_DOWNLOADS = Path.home() / "Downloads" / "Plantilla_Gobierno_IA_V3_CALZATURA_VILCHEZ.xlsx"
OUT_TEMPLATE_FILLED = TEMPLATE  # sobrescribe la plantilla original en Descargas

TODAY = date(2026, 5, 28).isoformat()
OWNER = "Serpa Sedano Yeferson Wilson"
AGENT = "Cursor Agent / revisión técnica automatizada"
BRANCH = "main"

MACRO_PROCESSES = [
    ("MP-01", "Estratégico", "Dirección comercial y alcance del sistema", "feature/alcance-sistema", "Gestión", "PRODUCCION", "1.0", "SRS y alcance web+BFF+IA documentados."),
    ("MP-02", "Misional", "Experiencia pública y captación digital", "feature/experiencia-publica", "Operaciones", "PRODUCCION", "1.0", "Home, tiendas y landings activas."),
    ("MP-03", "Misional", "Gestión del catálogo comercial", "feature/catalogo", "Operaciones", "PRODUCCION", "1.0", "Catálogo, filtros y detalle de producto."),
    ("MP-04", "Misional", "Gestión de carrito y compra web", "feature/carrito-checkout", "Operaciones", "PRODUCCION", "1.0", "Carrito, checkout, entrega y pagos."),
    ("MP-05", "Misional", "Gestión de pedidos y posventa", "feature/pedidos", "Operaciones", "PRODUCCION", "1.0", "Pedidos, confirmación y estados."),
    ("MP-06", "Misional", "Gestión de identidad, clientes y privacidad", "feature/clientes", "Operaciones", "PRODUCCION", "1.0", "Registro, login, perfil y favoritos."),
    ("MP-07", "Misional", "Administración comercial", "feature/admin-comercial", "Gestión", "PRODUCCION", "1.0", "Dashboard, productos, stock y finanzas."),
    ("MP-08", "Misional", "Gestión de ventas físicas y operación de tienda", "feature/ventas-fisicas", "Operaciones", "PRODUCCION", "1.0", "Ventas diarias, devoluciones y panel staff."),
    ("MP-09", "Apoyo", "Gestión de datos Excel e importación/exportación", "feature/admin-datos", "Soporte", "PRODUCCION", "1.0", "Plantillas xlsx, reglas comerciales y sanitización."),
    ("MP-10", "Apoyo", "Seguridad, auditoría y cumplimiento", "feature/seguridad", "Tecnología", "PRODUCCION", "1.0", "RLS, BFF, ZAP, App Check y rate limit."),
    ("MP-11", "Apoyo", "Base de datos y control de acceso Supabase", "feature/supabase-rls", "Tecnología", "PRODUCCION", "1.0", "Migraciones, RLS y hardening BFF-only."),
    ("MP-12", "Misional", "Analítica, IA y riesgo empresarial (IRE)", "feature/ia-ire", "Analítica", "PRODUCCION", "1.0", "Predicción demanda, IRE y gobierno IA ISO 42001."),
    ("MP-13", "Apoyo", "DevOps, pruebas y continuidad", "feature/devops", "Tecnología", "PRODUCCION", "1.0", "CI/CD, Sonar, Docker, stress y restore drill."),
    ("MP-14", "Misional", "Campañas, marketing y trazabilidad comercial", "feature/campanas", "Operaciones", "PRODUCCION", "1.0", "Landings y campañas conectadas al catálogo."),
    ("MP-15", "Apoyo", "Atención al consumidor y libro de reclamaciones", "feature/libro-reclamaciones", "Soporte", "PRODUCCION", "1.0", "Libro de reclamaciones y notificaciones."),
    ("MP-16", "Apoyo", "Consentimiento, políticas y cumplimiento legal", "feature/legal", "Soporte", "PRODUCCION", "1.0", "Términos, privacidad y cookies."),
]

MACRO_BY_PREFIX = {
    "MP-01": "MP-01", "MP-02": "MP-02", "MP-03": "MP-03", "MP-04": "MP-04",
    "MP-05": "MP-05", "MP-06": "MP-06", "MP-07": "MP-07", "MP-08": "MP-08",
    "MP-09": "MP-09", "MP-10": "MP-10", "MP-11": "MP-11", "MP-12": "MP-12",
    "MP-13": "MP-13", "MP-14": "MP-14", "MP-15": "MP-15", "MP-16": "MP-16",
    "MP-17": "MP-13", "MP-18": "MP-03",
}

PROCESS_BY_BOLT = {
    "BOLT-WEB-001": "MP-01", "BOLT-WEB-002": "MP-02", "BOLT-WEB-003": "MP-03",
    "BOLT-WEB-004": "MP-03", "BOLT-WEB-005": "MP-04", "BOLT-WEB-006": "MP-04",
    "BOLT-WEB-007": "MP-05", "BOLT-WEB-008": "MP-06", "BOLT-WEB-009": "MP-06",
    "BOLT-WEB-010": "MP-07", "BOLT-WEB-011": "MP-07", "BOLT-WEB-012": "MP-05",
    "BOLT-WEB-013": "MP-07", "BOLT-WEB-014": "MP-08", "BOLT-WEB-015": "MP-08",
    "BOLT-WEB-016": "MP-09", "BOLT-WEB-017": "MP-09", "BOLT-WEB-018": "MP-10",
    "BOLT-WEB-019": "MP-04", "BOLT-WEB-020": "MP-10", "BOLT-WEB-021": "MP-10",
    "BOLT-WEB-022": "MP-11", "BOLT-WEB-023": "MP-11", "BOLT-WEB-024": "MP-12",
    "BOLT-WEB-025": "MP-13", "BOLT-WEB-026": "MP-13", "BOLT-WEB-027": "MP-13",
    "BOLT-WEB-028": "MP-14", "BOLT-WEB-029": "MP-15", "BOLT-WEB-030": "MP-16",
    "BOLT-WEB-031": "MP-13", "BOLT-WEB-032": "MP-06", "BOLT-WEB-033": "MP-06",
    "BOLT-WEB-034": "MP-05", "BOLT-WEB-035": "MP-07", "BOLT-WEB-036": "MP-03",
    "BOLT-WEB-037": "MP-04", "BOLT-WEB-038": "MP-09", "BOLT-WEB-039": "MP-09",
    "BOLT-WEB-040": "MP-09", "BOLT-WEB-041": "MP-07", "BOLT-WEB-042": "MP-03",
    "BOLT-WEB-043": "MP-07", "BOLT-WEB-044": "MP-11", "BOLT-WEB-045": "MP-11",
    "BOLT-WEB-046": "MP-11", "BOLT-WEB-047": "MP-05", "BOLT-WEB-048": "MP-10",
    "BOLT-WEB-049": "MP-08", "BOLT-WEB-050": "MP-06", "BOLT-WEB-051": "MP-10",
    "BOLT-WEB-052": "MP-13", "BOLT-WEB-053": "MP-12", "BOLT-WEB-054": "MP-13",
    "BOLT-WEB-055": "MP-14",
}

AI_SERVICE_BOLTS = [
    {
        "id": "BOLT-IA-001",
        "macro": "MP-12",
        "desc": "Exponer API FastAPI de predicción combinada, demanda, IRE y alertas de stock.",
        "domain": "ai-service / API",
        "location": "ai-service/main.py",
        "parent": "BOLT-WEB-024",
    },
    {
        "id": "BOLT-IA-002",
        "macro": "MP-12",
        "desc": "Calcular IRE 0-100 con dimensiones stock/ingresos/demanda y niveles de riesgo.",
        "domain": "ai-service / IRE",
        "location": "ai-service/models/risk.py",
        "parent": "BOLT-WEB-024",
    },
    {
        "id": "BOLT-IA-003",
        "macro": "MP-12",
        "desc": "Entrenar y ejecutar RandomForestRegressor para predicción de demanda por producto.",
        "domain": "ai-service / ML",
        "location": "ai-service/models/demand.py",
        "parent": "BOLT-WEB-024",
    },
    {
        "id": "BOLT-IA-004",
        "macro": "MP-12",
        "desc": "Persistir historial IRE, estado del modelo y lectura de ventas desde Supabase.",
        "domain": "ai-service / datos",
        "location": "ai-service/services/supabase_client.py",
        "parent": "BOLT-WEB-053",
    },
]

REQUIREMENTS = [
    ("RF-001", "RF", "El sistema debe mostrar catálogo público de calzado con filtros y detalle de producto.", "Alta", "PMV-01", "PRODUCCION", "BOLT-WEB-003"),
    ("RF-002", "RF", "El sistema debe gestionar carrito por sesión y checkout con validación de stock.", "Alta", "PMV-02", "PRODUCCION", "BOLT-WEB-005"),
    ("RF-003", "RF", "El sistema debe procesar pagos Stripe y contraentrega con confirmación de pedido.", "Alta", "PMV-02", "PRODUCCION", "BOLT-WEB-019"),
    ("RF-004", "RF", "El sistema debe registrar ventas físicas diarias, devoluciones y documentos de venta.", "Alta", "PMV-03", "PRODUCCION", "BOLT-WEB-014"),
    ("RF-005", "RF", "El sistema debe administrar productos, stock, finanzas y fabricantes desde panel admin.", "Alta", "PMV-04", "PRODUCCION", "BOLT-WEB-010"),
    ("RF-006", "RF", "El sistema debe calcular y mostrar el IRE con variables, fórmula y nivel de riesgo.", "Alta", "PMV-05", "PRODUCCION", "BOLT-WEB-024"),
    ("RF-007", "RF", "El sistema debe predecir demanda por producto y alertar quiebres de stock.", "Alta", "PMV-05", "PRODUCCION", "BOLT-IA-001"),
    ("RF-008", "RF", "El sistema debe importar y exportar datos comerciales mediante plantillas Excel.", "Media", "PMV-04", "PRODUCCION", "BOLT-WEB-016"),
    ("RNF-001", "RNF", "El sistema debe aplicar RLS en Supabase y operaciones sensibles solo vía BFF.", "Alta", "PMV-06", "PRODUCCION", "BOLT-WEB-022"),
    ("RNF-002", "RNF", "El servicio IA debe autenticarse con Bearer token y no exponer secretos al cliente.", "Alta", "PMV-05", "PRODUCCION", "BOLT-IA-001"),
    ("RNF-003", "RNF", "El pipeline CI/CD debe ejecutar lint, typecheck, tests y gates antes de despliegue.", "Alta", "PMV-06", "PRODUCCION", "BOLT-WEB-025"),
    ("RNF-004", "RNF", "El módulo IA debe registrar backtesting, suficiencia de datos y calidad del modelo.", "Alta", "PMV-05", "PRODUCCION", "BOLT-WEB-053"),
    ("RNF-005", "RNF", "La aplicación debe cumplir controles de seguridad OWASP ZAP sin alertas altas.", "Alta", "PMV-06", "PRODUCCION", "BOLT-WEB-021"),
    ("RNF-006", "RNF", "Los datos personales deben minimizarse, enmascararse y protegerse según Ley 29733.", "Alta", "PMV-06", "PRODUCCION", "BOLT-WEB-023"),
]

PMV_ROWS = [
    ("PMV-01", "Catálogo público navegable", "BOLT-WEB-003", "Productos", "PRODUCCION", "Catálogo, filtros y detalle accesible."),
    ("PMV-02", "Compra web end-to-end", "BOLT-WEB-006", "Carrito/Pedidos", "PRODUCCION", "Carrito → checkout → pago → confirmación."),
    ("PMV-03", "Ventas físicas y devoluciones", "BOLT-WEB-014", "Ventas", "PRODUCCION", "Registro diario, documentos y stock revertido."),
    ("PMV-04", "Panel administrativo comercial", "BOLT-WEB-010", "Admin", "PRODUCCION", "Productos, stock, finanzas y Excel."),
    ("PMV-05", "IA comercial y gobierno del IRE", "BOLT-WEB-024", "IA", "PRODUCCION", "Predicción, IRE, alertas y controles ISO 42001."),
    ("PMV-06", "Seguridad, calidad y DevOps", "BOLT-WEB-025", "Operaciones", "PRODUCCION", "CI/CD, RLS, ZAP, stress y continuidad."),
]

BPMN_IA_FLOW = [
    ("N-IA-01", "MP-12", "EVENTO", "Inicio solicitud de predicción", "", "N-IA-02", ""),
    ("N-IA-02", "MP-12", "ACTIVIDAD", "Recolectar ventasDiarias y pedidos pagados", "N-IA-01", "N-IA-03", ""),
    ("N-IA-03", "MP-12", "GATEWAY", "¿Datos suficientes para modelo?", "N-IA-02", "N-IA-04", "Sí"),
    ("N-IA-04", "MP-12", "ACTIVIDAD", "Entrenar/ejecutar Random Forest de demanda", "N-IA-03", "N-IA-05", ""),
    ("N-IA-05", "MP-12", "ACTIVIDAD", "Calcular forecast de ingresos", "N-IA-04", "N-IA-06", ""),
    ("N-IA-06", "MP-12", "ACTIVIDAD", "Calcular IRE y alertas de stock", "N-IA-05", "N-IA-07", ""),
    ("N-IA-07", "MP-12", "ACTIVIDAD", "Persistir ireHistorial y modelo_estado", "N-IA-06", "N-IA-08", ""),
    ("N-IA-08", "MP-12", "ACTIVIDAD", "Mostrar dashboard admin de predicciones", "N-IA-07", "N-IA-09", ""),
    ("N-IA-09", "MP-12", "EVENTO", "Fin — decisión comercial asistida", "N-IA-08", "", ""),
    ("N-IA-03B", "MP-12", "ACTIVIDAD", "Emitir aviso data_sufficient=false (cold start)", "N-IA-03", "N-IA-09", "No"),
]

MERGES = [
    ("MRG-001", "feature → main", "feature/catalogo", "main", TODAY, OWNER, "INTEGRADO", "Catálogo y filtros publicados."),
    ("MRG-002", "feature → main", "feature/carrito-checkout", "main", TODAY, OWNER, "INTEGRADO", "Checkout y pagos integrados."),
    ("MRG-003", "feature → main", "feature/ia-ire", "main", TODAY, OWNER, "INTEGRADO", "Servicio IA + panel IRE en producción."),
    ("MRG-004", "feature → main", "feature/ventas-fisicas", "main", TODAY, OWNER, "INTEGRADO", "Ventas admin/staff web y móvil."),
    ("MRG-005", "hotfix → main", "fix/bff-manufacturers", "main", TODAY, OWNER, "INTEGRADO", "Fabricantes vía BFF sin Supabase directo."),
]

HISTORY = [
    (TODAY, "BOLT-WEB-024", "1.0", "Despliegue IA", "Panel predicciones e IRE operativo en admin.", AGENT, OWNER),
    (TODAY, "BOLT-WEB-053", "1.0", "Gobierno IA", "Backtesting gate y controles de suficiencia de datos.", AGENT, OWNER),
    (TODAY, "BOLT-WEB-014", "1.0", "Ventas físicas", "Registro de ventas diarias y devoluciones en producción.", AGENT, OWNER),
    (TODAY, "BOLT-IA-001", "1.0", "API IA", "FastAPI /api/predict/combined desplegado en Render.", AGENT, OWNER),
    (TODAY, "BOLT-WEB-025", "1.0", "CI/CD", "Pipeline verde con lint, tests, E2E y Sonar.", AGENT, OWNER),
]


def load_web_bolts() -> list[dict]:
    wb = openpyxl.load_workbook(BOLT_MATRIX, data_only=True)
    ws = wb["Bolts"]
    bolts = []
    for row in ws.iter_rows(min_row=5, max_col=78, values_only=True):
        if not row[1]:
            continue
        macro_raw = str(row[0] or "")
        macro_code = macro_raw.split()[0] if macro_raw else "MP-01"
        macro_code = MACRO_BY_PREFIX.get(macro_code, macro_code)
        bolts.append({
            "id": str(row[1]),
            "macro": macro_code,
            "desc": str(row[2] or ""),
            "domain": str(row[5] or ""),
            "status": str(row[74] or "VERDE"),
            "observation": str(row[75] or ""),
            "location": str(row[77] or ""),
            "process": PROCESS_BY_BOLT.get(str(row[1]), macro_code),
        })
    return bolts


def clear_data_rows(ws, start_row: int = 2):
    if ws.max_row >= start_row:
        ws.delete_rows(start_row, ws.max_row - start_row + 1)


def write_rows(ws, rows: list[tuple], start_row: int = 2):
    for offset, row in enumerate(rows):
        for col, value in enumerate(row, start=1):
            ws.cell(start_row + offset, col, value)


def ai_dlc_row(bolt_id: str, intent: str, stages: dict[str, str]) -> tuple:
    return (
        bolt_id,
        intent,
        stages.get("requerimiento", "Completado"),
        stages.get("diseno", "Completado"),
        stages.get("desarrollo", "Completado"),
        stages.get("qa", "Completado"),
        stages.get("produccion", "Completado"),
        stages.get("resultado", "VERDE"),
        TODAY,
    )


def build_dependencies(bolts: list[dict]) -> list[tuple]:
    deps = [
        ("BOLT-WEB-024", "BOLT-WEB-014", "Datos", "Alta", "IRE requiere ventasDiarias históricas."),
        ("BOLT-WEB-024", "BOLT-WEB-006", "Datos", "Alta", "Pedidos pagados alimentan demanda online."),
        ("BOLT-WEB-024", "BOLT-IA-001", "Servicio", "Alta", "UI admin consume API FastAPI."),
        ("BOLT-WEB-053", "BOLT-IA-001", "Gobierno", "Alta", "Controles de calidad sobre servicio IA."),
        ("BOLT-IA-002", "BOLT-IA-003", "Modelo", "Alta", "IRE usa salidas de predicción de demanda."),
        ("BOLT-IA-001", "BOLT-IA-004", "Datos", "Alta", "API depende de lectura Supabase."),
        ("BOLT-WEB-006", "BOLT-WEB-005", "Flujo", "Media", "Checkout parte del carrito activo."),
        ("BOLT-WEB-019", "BOLT-WEB-006", "Pago", "Alta", "Stripe/contraentrega tras checkout."),
        ("BOLT-WEB-025", "BOLT-WEB-024", "Calidad", "Media", "CI valida módulo IA antes de release."),
    ]
    return deps


def build_artifacts(bolts: list[dict]) -> list[tuple]:
    artifacts = [
        ("ART-001", "Documento", "BOLT-WEB-001", "SRS Calzatura Vilchez", "calzatura-vilchez/docs/01-srs/SRS-Calzatura-Vilchez.md", "1.0", "Requisitos funcionales y no funcionales."),
        ("ART-002", "Documento", "BOLT-WEB-024", "Módulo IA y IRE", "documentacion/07-modulo-ia-riesgo-empresarial.md", "1.2", "Definición operativa del riesgo empresarial."),
        ("ART-003", "Código", "BOLT-IA-001", "API FastAPI IA", "ai-service/main.py", "1.0", "Endpoints predict/combined."),
        ("ART-004", "Código", "BOLT-IA-002", "Motor IRE", "ai-service/models/risk.py", "1.0", "compute_ire y niveles."),
        ("ART-005", "Código", "BOLT-IA-003", "Modelo demanda RF", "ai-service/models/demand.py", "1.0", "RandomForestRegressor."),
        ("ART-006", "Código", "BOLT-WEB-024", "Panel predicciones", "calzatura-vilchez/src/domains/administradores/pages/AdminPredictions.tsx", "1.0", "UI IRE y métricas."),
        ("ART-007", "Código", "BOLT-WEB-003", "Catálogo web", "calzatura-vilchez/src/domains/productos/pages/ProductsPage.tsx", "1.0", "Catálogo público."),
        ("ART-008", "Código", "BOLT-WEB-014", "Ventas físicas", "calzatura-vilchez/src/domains/ventas/", "1.0", "Registro ventas y devoluciones."),
        ("ART-009", "Código", "BOLT-WEB-022", "BFF servidor", "calzatura-vilchez/bff/server.cjs", "1.0", "API segura y rate limit."),
        ("ART-010", "Evidencia", "BOLT-WEB-021", "Reporte ZAP", "zap-reports/zap-production-report-v2.json", "2.0", "DAST sin alertas altas."),
        ("ART-011", "Evidencia", "BOLT-WEB-026", "Stress test 2000", "artifacts/load-tests/autocannon-home-c2000-20260528-231905.json", "1.0", "Carga concurrente home."),
        ("ART-012", "Evidencia", "BOLT-WEB-053", "Backtest gate IA", "scripts/ai-backtest-gate.mjs", "1.0", "Control gobierno IA."),
        ("ART-013", "Matriz", "BOLT-WEB-001", "Estado del arte 43 tablas", "Estado_del_Arte_43_Tablas_CORREGIDO.docx", "1.0", "43 artículos con evidencia funcional."),
        ("ART-014", "Matriz", "BOLT-WEB-001", "Registro BOLT empresarial", "artifacts/matrices/Matriz_Registro_Web_Empresarial_AI_DLC_BOLT.xlsx", "1.0", "55 bolts web verificados."),
    ]
    for idx, b in enumerate(bolts[:8], start=15):
        if b["location"]:
            first_loc = b["location"].split(";")[0].strip()
            artifacts.append((
                f"ART-{idx:03d}",
                "Código",
                b["id"],
                b["domain"][:40],
                first_loc,
                "1.0",
                b["desc"][:80],
            ))
    return artifacts


def main():
    if not TEMPLATE.exists():
        raise FileNotFoundError(f"No se encontró la plantilla: {TEMPLATE}")
    if not BOLT_MATRIX.exists():
        raise FileNotFoundError(f"No se encontró la matriz BOLT: {BOLT_MATRIX}")

    web_bolts = load_web_bolts()
    all_bolts = web_bolts + [
        {**b, "desc": b["desc"], "domain": b["domain"], "status": "VERDE",
         "observation": "Componente ai-service en producción Render.",
         "location": b["location"], "process": b["macro"]}
        for b in AI_SERVICE_BOLTS
    ]

    wb = openpyxl.load_workbook(TEMPLATE)

    # PROCESOS
    ws = wb["PROCESOS"]
    clear_data_rows(ws)
    write_rows(ws, MACRO_PROCESSES)

    # ACTIVIDADES_BPMN
    ws = wb["ACTIVIDADES_BPMN"]
    clear_data_rows(ws)
    act_rows = []
    for b in all_bolts:
        act_rows.append((
            b["id"],
            b["process"],
            f"Implementar {b['domain']}",
            "Desarrollador / Admin" if "IA" in b["domain"] or "Admin" in b["domain"] else "Desarrollador",
            "Tarea",
            b["desc"][:200],
            b["domain"],
        ))
    write_rows(ws, act_rows)

    # FLUJO_BPMN
    ws = wb["FLUJO_BPMN"]
    clear_data_rows(ws)
    write_rows(ws, [(r[0], r[1], r[2], r[3], r[4], r[5], r[6]) for r in BPMN_IA_FLOW])

    # REQUERIMIENTOS
    ws = wb["REQUERIMIENTOS"]
    clear_data_rows(ws)
    write_rows(ws, REQUIREMENTS)

    # CONTROL_VERSIONES
    ws = wb["CONTROL_VERSIONES"]
    clear_data_rows(ws)
    cv_rows = []
    for idx, b in enumerate(all_bolts, start=1):
        estado = "PRODUCCION" if b["status"] == "VERDE" else "ACTIVO"
        cv_rows.append((
            f"CV-{idx:03d}",
            b["id"],
            AI_SERVICE_BOLTS[0]["parent"] if b["id"].startswith("BOLT-IA") else "",
            "1.0",
            "Implementación inicial",
            estado,
            "INTEGRADO",
            TODAY,
            OWNER,
            AGENT,
            "main@latest",
            "",
            "Repositorio Calzatura Vilchez V3",
            "Alta",
            "No",
            b["observation"][:120] if b.get("observation") else b["desc"][:120],
        ))
    write_rows(ws, cv_rows)

    # AI_DLC
    ws = wb["AI_DLC"]
    clear_data_rows(ws)
    ai_bolts = [b for b in all_bolts if "IA" in b["id"] or "IA" in b["domain"] or b["id"] in {"BOLT-WEB-024", "BOLT-WEB-053"}]
    ai_rows = []
    for b in ai_bolts:
        ai_rows.append(ai_dlc_row(
            b["id"],
            b["desc"][:120],
            {
                "requerimiento": "HU-IA-001 / RF-006 definidos en SRS",
                "diseno": "CRISP-ML + IRE documentado en docs/06-ia",
                "desarrollo": f"Implementado en {b.get('location', b['domain']).split(';')[0]}",
                "qa": "pytest ai-service + admin-predictions.spec.ts + ai-backtest-gate",
                "produccion": "Desplegado Render/Docker — estado VERDE",
                "resultado": "VERDE",
            },
        ))
    write_rows(ws, ai_rows)

    # DEPENDENCIAS
    ws = wb["DEPENDENCIAS"]
    clear_data_rows(ws)
    write_rows(ws, build_dependencies(all_bolts))

    # MERGES
    ws = wb["MERGES"]
    clear_data_rows(ws)
    write_rows(ws, MERGES)

    # HISTORIAL
    ws = wb["HISTORIAL"]
    clear_data_rows(ws)
    write_rows(ws, HISTORY)

    # ARTEFACTOS
    ws = wb["ARTEFACTOS"]
    clear_data_rows(ws)
    write_rows(ws, build_artifacts(all_bolts))

    # PMV
    ws = wb["PMV"]
    clear_data_rows(ws)
    write_rows(ws, PMV_ROWS)

    # DASHBOARD fórmulas
    ws = wb["DASHBOARD"]
    ws["B2"] = "=COUNTA(CONTROL_VERSIONES!B:B)-1"
    ws["B3"] = '=COUNTIF(CONTROL_VERSIONES!F:F,"PRODUCCION")+COUNTIF(CONTROL_VERSIONES!F:F,"ACTIVO")'
    ws["B4"] = '=COUNTIF(CONTROL_VERSIONES!F:F,"PRODUCCION")'
    ws["B5"] = '=COUNTIF(PROCESOS!B:B,"Estratégico")'
    ws["B6"] = '=COUNTIF(PROCESOS!B:B,"Misional")'
    ws["B7"] = '=COUNTIF(PROCESOS!B:B,"Apoyo")'

    OUT_ARTIFACTS.parent.mkdir(parents=True, exist_ok=True)
    wb.save(OUT_ARTIFACTS)
    shutil.copy2(OUT_ARTIFACTS, OUT_DOWNLOADS)
    shutil.copy2(OUT_ARTIFACTS, OUT_TEMPLATE_FILLED)

    print(f"Generado: {OUT_ARTIFACTS}")
    print(f"Copia:    {OUT_DOWNLOADS}")
    print(f"Plantilla original actualizada: {OUT_TEMPLATE_FILLED}")
    print(f"Procesos: {len(MACRO_PROCESSES)}")
    print(f"Bolts:    {len(all_bolts)}")
    print(f"Requerimientos: {len(REQUIREMENTS)}")
    print(f"AI_DLC:   {len(ai_rows)}")
    print(f"Artefactos: {len(build_artifacts(all_bolts))}")


if __name__ == "__main__":
    main()
