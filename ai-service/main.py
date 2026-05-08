import time
import os
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from models.campaign import detect_campaign, _compute_feedback_adjustments
from services.firebase_verifier import is_firebase_admin
from models.demand import build_daily_sales_by_product, get_stock_alerts, get_weekly_chart, predict_demand
from models.revenue import forecast_revenue
from models.risk import compute_ire, compute_ire_proyectado
from services.supabase_client import (
    fetch_campana_detail,
    fetch_campana_feedback_stats,
    fetch_campanas_recientes,
    fetch_completed_orders,
    fetch_daily_sales,
    fetch_ire_historial,
    fetch_product_codes,
    fetch_products,
    get_client,
    get_last_campana_activa,
    load_modelo_estado,
    save_campana_detectada,
    save_campana_feedback,
    save_campana_metrica_diaria,
    save_campana_productos,
    save_ire_historial,
    save_modelo_estado,
    update_campana_admin_feedback,
    update_campana_estado,
)

load_dotenv()

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="Calzatura Vilchez AI Service", version="1.2.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

_DEFAULT_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://calzaturavilchez-ab17f.web.app",
]
_extra_origins = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
]
_allowed_origins = list(dict.fromkeys(_DEFAULT_ALLOWED_ORIGINS + _extra_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

_CACHE_TTL = 7200  # 2 hours — conserves Firestore free-tier quota

_cache: dict = {
    "data": None,       # (daily_sales, orders, products, product_codes)
    "expires_at": 0.0,
    "lookback_days": 0,
}

_AI_SERVICE_BEARER_TOKEN = os.getenv("AI_SERVICE_BEARER_TOKEN", "").strip()

# In-memory model registry: stores training metadata from the last predict call.
# Lost on restart — callers should treat this as a best-effort cache.
_model_registry: dict = {}

# In-memory prediction log for retrospective error monitoring.
# Each entry: {logged_at, horizon_days, model_type, products:[{productId, predicted_daily}]}
# Capped at 200 entries (≈ 200 unique prediction calls).
_prediction_log: list = []
_PREDICTION_LOG_MAX = 200


class IreHistorialResponse(BaseModel):
    historial: list[dict[str, Any]] = Field(default_factory=list)
    days: int


def _request_context(request: Request) -> dict:
    return {
        "method": request.method,
        "path": request.url.path,
        "host": request.client.host if request.client else None,
        "origin": request.headers.get("origin"),
        "has_auth_header": bool(request.headers.get("authorization")),
    }


def _require_service_auth(request: Request, location: str) -> None:
    auth_header = request.headers.get("authorization") or ""
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")

    token = auth_header.split(" ", 1)[1].strip()

    # Vía 1: bearer token interno (Supabase cron, scripts server-side).
    if _AI_SERVICE_BEARER_TOKEN and token == _AI_SERVICE_BEARER_TOKEN:
        return

    # Vía 2: Firebase ID token del panel admin (Option B — sin proxy ni Cloud Function).
    if is_firebase_admin(token):
        return

    raise HTTPException(status_code=401, detail="Unauthorized")


@app.on_event("startup")
def log_startup_context():
    port = os.getenv("PORT", "not-set")
    has_supabase_url = bool(os.getenv("SUPABASE_URL"))
    has_supabase_key = bool(os.getenv("SUPABASE_SERVICE_KEY"))
    print(f"[startup] cwd={os.getcwd()}")
    print(f"[startup] PORT={port}")
    has_firebase_project = bool(os.getenv("FIREBASE_PROJECT_ID"))
    superadmin_emails_raw = os.getenv("SUPERADMIN_EMAILS", "")
    superadmin_count = len([e for e in superadmin_emails_raw.split(",") if e.strip()])
    print(f"[startup] SUPABASE_URL present={has_supabase_url}")
    print(f"[startup] SUPABASE_SERVICE_KEY present={has_supabase_key}")
    print(f"[startup] FIREBASE_PROJECT_ID present={has_firebase_project}")
    print(f"[startup] SUPERADMIN_EMAILS count={superadmin_count}")

    # F-04: restaurar training_meta guardado en BD para no arrancar en frío sin contexto
    try:
        saved = load_modelo_estado()
        if saved:
            _model_registry.update({**saved, "restored_from_db": True})
            print(f"[startup] training_meta restaurado desde BD (data_hash={saved.get('data_hash', '?')})")
        else:
            print("[startup] Sin training_meta previo en BD - se generara en la primera prediccion")
    except Exception as exc:
        print(f"[startup] No se pudo restaurar training_meta: {exc}")


def _load_data(force: bool = False, lookback_days: int = 180):
    """Returns cached Supabase data or refreshes it when expired."""
    now = time.monotonic()
    if (
        not force
        and _cache["data"] is not None
        and now < _cache["expires_at"]
        and _cache["lookback_days"] >= lookback_days
    ):
        return _cache["data"]

    with ThreadPoolExecutor(max_workers=4) as pool:
        f_daily = pool.submit(fetch_daily_sales, lookback_days)
        f_orders = pool.submit(fetch_completed_orders, lookback_days)
        f_products = pool.submit(fetch_products)
        f_codes = pool.submit(fetch_product_codes)
        data = (
            f_daily.result(),
            f_orders.result(),
            f_products.result(),
            f_codes.result(),
        )
    _cache["data"] = data
    _cache["expires_at"] = now + _CACHE_TTL
    _cache["lookback_days"] = lookback_days
    return data


def _raise_http_error(error: Exception) -> None:
    if isinstance(error, HTTPException):
        raise error
    detail = str(error)
    if "quota exceeded" in detail.lower():
        raise HTTPException(
            status_code=503,
            detail="Supabase quota or backend rate limit exceeded. Retry later.",
        )
    raise HTTPException(status_code=500, detail=detail)


@app.get("/")
def root():
    cached = _cache["data"] is not None and time.monotonic() < _cache["expires_at"]
    return {
        "status": "ok",
        "service": "Calzatura Vilchez AI",
        "cache_active": cached,
    }


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "service": "Calzatura Vilchez AI",
        "port": os.getenv("PORT", "not-set"),
    }


@app.get("/api/debug/supabase")
def debug_supabase(request: Request):
    """Diagnose Supabase connection — use only to troubleshoot."""
    _require_service_auth(request, "ai-service/main.py:debug_supabase")
    result: dict = {
        "SUPABASE_URL": bool(os.getenv("SUPABASE_URL")),
        "SUPABASE_SERVICE_KEY": bool(os.getenv("SUPABASE_SERVICE_KEY")),
    }
    try:
        from services.supabase_client import fetch_products
        products = fetch_products()
        result["supabase"] = "connected"
        result["productos_count"] = len(products)
    except Exception as e:
        result["supabase"] = f"ERROR: {e}"
    return result


@app.get("/api/predict/demand")
@limiter.limit("20/minute")
def demand_prediction(
    request: Request,
    horizon: int = Query(default=30, ge=7, le=90, description="Dias a predecir (7-90)"),
    history: int = Query(default=90, ge=14, le=365, description="Dias de historial a usar"),
):
    """Predicts product demand for the next horizon days."""
    try:
        _require_service_auth(request, "ai-service/main.py:demand_prediction")
        lookback_days = max(history, 120)
        daily_sales, orders, products, product_codes = _load_data(lookback_days=lookback_days)
        predictions, training_meta = predict_demand(
            daily_sales=daily_sales,
            completed_orders=orders,
            products=products,
            product_codes=product_codes,
            horizon_days=horizon,
            history_days=history,
        )

        # Cache training metadata for /api/model/info
        _model_registry.clear()
        _model_registry.update({**training_meta, "cached_at": date.today().isoformat()})

        # F-04: persiste en BD para sobrevivir reinicios (fire-and-forget)
        try:
            save_modelo_estado({**training_meta, "cached_at": date.today().isoformat()})
        except Exception as save_err:
            print(f"[model_registry] No se pudo persistir training_meta: {save_err}")

        # Log prediction for retrospective error monitoring
        log_entry = {
            "logged_at": date.today().isoformat(),
            "horizon_days": horizon,
            "model_type": training_meta.get("model_type", "unknown"),
            "products": [
                {
                    "productId": p["productId"],
                    "predicted_daily": p["prediccion_diaria"],
                    "predicted_total": p["prediccion_unidades"],
                }
                for p in predictions
                if not p.get("sin_historial")
            ],
        }
        _prediction_log.append(log_entry)
        if len(_prediction_log) > _PREDICTION_LOG_MAX:
            _prediction_log.pop(0)

        return {
            "horizon_days": horizon,
            "history_days": history,
            "total_products": len(predictions),
            "modelo_meta": training_meta,
            "predictions": predictions,
        }
    except Exception as error:
        _raise_http_error(error)


@app.get("/api/predict/combined")
@limiter.limit("20/minute")
def combined_prediction(
    request: Request,
    horizon: int = Query(default=30, ge=7, le=90, description="Dias a predecir (7-90)"),
    history: int = Query(default=120, ge=30, le=365, description="Dias de historial a usar"),
):
    """
    Returns demand predictions and revenue forecast in a single response.
    Both models share the same Supabase data load, saving one round trip and
    eliminating the second cache-miss penalty on the first page load.
    """
    try:
        _require_service_auth(request, "ai-service/main.py:combined_prediction")
        lookback_days = max(history, 120)
        daily_sales, orders, products, product_codes = _load_data(lookback_days=lookback_days)

        predictions, training_meta = predict_demand(
            daily_sales=daily_sales,
            completed_orders=orders,
            products=products,
            product_codes=product_codes,
            horizon_days=horizon,
            history_days=history,
        )

        # Update model registry and prediction log (same as /api/predict/demand)
        _model_registry.clear()
        _model_registry.update({**training_meta, "cached_at": date.today().isoformat()})
        log_entry = {
            "logged_at": date.today().isoformat(),
            "horizon_days": horizon,
            "model_type": training_meta.get("model_type", "unknown"),
            "products": [
                {
                    "productId": p["productId"],
                    "predicted_daily": p["prediccion_diaria"],
                    "predicted_total": p["prediccion_unidades"],
                }
                for p in predictions
                if not p.get("sin_historial")
            ],
        }
        _prediction_log.append(log_entry)
        if len(_prediction_log) > _PREDICTION_LOG_MAX:
            _prediction_log.pop(0)

        warnings: list[str] = []
        try:
            revenue = forecast_revenue(
                daily_sales=daily_sales,
                completed_orders=orders,
                horizon_days=horizon,
                history_days=history,
            )
        except Exception as rev_err:
            revenue = None
            warnings.append(f"Proyección de ingresos no disponible: {str(rev_err)[:120]}")

        ire = compute_ire(predictions, revenue)
        ire_proyectado = compute_ire_proyectado(predictions, revenue, horizon)

        try:
            save_ire_historial(ire)
        except Exception as save_err:
            warnings.append(f"Historial IRE no guardado: {str(save_err)[:80]}")

        return {
            "demand": {
                "horizon_days": horizon,
                "history_days": history,
                "total_products": len(predictions),
                "modelo_meta": training_meta,
                "predictions": predictions,
            },
            "revenue": revenue,
            "ire": ire,
            "ire_proyectado": ire_proyectado,
            "warnings": warnings,
        }
    except Exception as error:
        _raise_http_error(error)


@app.get("/api/ire/historial", response_model=IreHistorialResponse)
@limiter.limit("30/minute")
def ire_historial(
    request: Request,
    days: int = Query(default=30, ge=7, le=90, description="Días de historial a retornar"),
):
    """Devuelve el historial de IRE de los últimos N días."""
    _require_service_auth(request, "api/ire/historial")
    try:
        rows = fetch_ire_historial(days)
        return {"historial": rows, "days": days}
    except Exception as error:
        _raise_http_error(error)


@app.get("/api/predict/stock-alert")
@limiter.limit("20/minute")
def stock_alerts(
    request: Request,
    days_threshold: int = Query(default=14, ge=1, le=60, description="Alertar si se agota en N días"),
):
    """Returns products predicted to run out of stock within the requested threshold."""
    try:
        _require_service_auth(request, "ai-service/main.py:stock_alerts")
        lookback_days = max(days_threshold, 90)
        daily_sales, orders, products, product_codes = _load_data(lookback_days=lookback_days)
        predictions, _ = predict_demand(
            daily_sales=daily_sales,
            completed_orders=orders,
            products=products,
            product_codes=product_codes,
            horizon_days=days_threshold,
            history_days=90,
        )
        alerts = get_stock_alerts(predictions, days_threshold=days_threshold)
        return {
            "days_threshold": days_threshold,
            "total_alerts": len(alerts),
            "alerts": alerts,
        }
    except Exception as error:
        _raise_http_error(error)


@app.get("/api/predict/revenue")
@limiter.limit("20/minute")
def revenue_prediction(
    request: Request,
    horizon: int = Query(default=30, ge=7, le=90, description="Dias a proyectar"),
    history: int = Query(default=120, ge=30, le=365, description="Dias historicos a usar"),
):
    """Returns future revenue forecast for the next week and month."""
    try:
        _require_service_auth(request, "ai-service/main.py:revenue_prediction")
        lookback_days = max(history, 120)
        daily_sales, orders, *_ = _load_data(lookback_days=lookback_days)
        return forecast_revenue(
            daily_sales=daily_sales,
            completed_orders=orders,
            horizon_days=horizon,
            history_days=history,
        )
    except Exception as error:
        _raise_http_error(error)


@app.get("/api/sales/weekly-chart")
@limiter.limit("20/minute")
def weekly_chart(
    request: Request,
    weeks: int = Query(default=8, ge=2, le=24, description="Número de semanas"),
):
    """Returns weekly sales volume for the last weeks."""
    try:
        _require_service_auth(request, "ai-service/main.py:weekly_chart")
        lookback_days = max(weeks * 7, 56)
        daily_sales, orders, *_ = _load_data(lookback_days=lookback_days)
        chart = get_weekly_chart(daily_sales, orders, weeks=weeks)
        return {"weeks": weeks, "chart": chart}
    except Exception as error:
        _raise_http_error(error)


@app.post("/api/cache/invalidate")
@limiter.limit("5/minute")
def invalidate_cache(request: Request):
    """Force a cache refresh on the next request."""
    _require_service_auth(request, "ai-service/main.py:invalidate_cache")
    _cache["expires_at"] = 0.0
    _cache["lookback_days"] = 0
    return {"status": "cache invalidated"}


@app.get("/api/model/info")
@limiter.limit("20/minute")
def model_info(request: Request):
    """
    Returns training metadata from the last predict_demand call.
    Includes: reproducibility fields (data_hash, random_state, sklearn_version),
    explainability fields (feature_importances sorted by importance), and
    drift baseline (feature_stats mean/std per lag feature).
    """
    _require_service_auth(request, "ai-service/main.py:model_info")
    if not _model_registry:
        return {
            "status": "sin_datos",
            "mensaje": "El modelo no ha sido entrenado en esta sesión. Carga el panel de predicción primero.",
        }
    return {"status": "ok", **_model_registry}


@app.get("/api/model/metrics")
@limiter.limit("20/minute")
def model_metrics(request: Request):
    """
    Retrospective error metrics: compares past predictions (from _prediction_log)
    against actual sales once the prediction horizon has elapsed.
    Returns MAE (units/day per product) and MAPE (%).
    Note: log is in-memory — data resets on each Render deploy/restart.
    """
    _require_service_auth(request, "ai-service/main.py:model_metrics")

    if not _prediction_log:
        return {
            "status": "sin_datos",
            "n_evaluaciones": 0,
            "mensaje": "No hay predicciones en memoria. Las métricas se acumulan desde el primer uso del panel de IA tras cada arranque del servicio.",
        }

    today = date.today()
    daily_sales, orders, _, _ = _load_data()
    sales_map = build_daily_sales_by_product(daily_sales, orders)

    evaluated = []
    for entry in _prediction_log:
        log_date = date.fromisoformat(entry["logged_at"])
        h = entry["horizon_days"]
        if today < log_date + timedelta(days=h):
            continue  # Horizon not yet elapsed — can't compare

        period_start = log_date + timedelta(days=1)
        period_dates = [(period_start + timedelta(days=i)).isoformat() for i in range(h)]

        errors = []
        for item in entry.get("products", []):
            pid = item["productId"]
            actual_total = sum(sales_map.get(pid, {}).get(d, 0.0) for d in period_dates)
            actual_daily = actual_total / h if h else 0.0
            predicted_daily = item["predicted_daily"]
            abs_err = abs(predicted_daily - actual_daily)
            rel_err = abs_err / max(actual_daily, 0.01)
            errors.append({"abs": abs_err, "rel": rel_err})

        if errors:
            mae = sum(e["abs"] for e in errors) / len(errors)
            mape = sum(e["rel"] for e in errors) / len(errors) * 100
            evaluated.append({
                "period_start": period_start.isoformat(),
                "period_end": (log_date + timedelta(days=h)).isoformat(),
                "n_products": len(errors),
                "mae": round(mae, 4),
                "mape_pct": round(mape, 1),
                "model_type": entry.get("model_type", "unknown"),
            })

    if not evaluated:
        pending = len(_prediction_log)
        return {
            "status": "pendiente",
            "n_evaluaciones": 0,
            "n_predicciones_en_cola": pending,
            "mensaje": f"Hay {pending} predicción(es) registrada(s). Las métricas estarán disponibles cuando el horizonte de predicción haya transcurrido.",
        }

    overall_mae = sum(e["mae"] for e in evaluated) / len(evaluated)
    overall_mape = sum(e["mape_pct"] for e in evaluated) / len(evaluated)

    return {
        "status": "ok",
        "n_evaluaciones": len(evaluated),
        "mae_promedio": round(overall_mae, 4),
        "mape_promedio_pct": round(overall_mape, 1),
        "evaluaciones": evaluated,
        "nota": "MAE: error absoluto medio en unidades/día por producto. MAPE: error porcentual medio relativo al valor real.",
    }


def decide_next_state(
    result: dict,
    last: dict | None,
    today_iso: str,
    metricas: dict,
) -> dict:
    """
    Pure function: computes what DB operations are needed and what fields to
    propagate into result. Does NOT touch the database.

    Returned dict keys:
      action          "save_new" | "update_estado" | "noop"
      evento          dict for save_campana_detectada  (save_new only)
      estado_inicial  str                              (save_new only)
      campana_id      int                              (update_estado only)
      new_estado      str                              (update_estado only)
      prev_estado     str                              (update_estado only)
      update_kwargs   dict  extra kwargs for update_campana_estado
      fecha_inicio_campana  str | None
      mensaje_suffix  str | None  appended to result["mensaje"]
    """
    cierre = result.get("cierre_estado")

    if result["campaign_detected"]:
        riesgo = result.get("riesgo_stock", False)

        if last is None:
            estado_inicial = "en_riesgo_stock" if riesgo else "inicio"
            evento = {
                "fecha_deteccion":                   today_iso,
                "fecha_inicio":                      today_iso,
                "nivel":                             result["nivel"],
                "scope":                             result.get("scope"),
                "foco_tipo":                         result.get("foco_tipo"),
                "foco_nombre":                       result.get("foco_nombre"),
                "foco_uplift":                       result.get("foco_uplift"),
                "tipo_sugerido":                     result["tipo_sugerido"],
                "categorias_afectadas":              result["categorias_afectadas"],
                "uplift_ratio":                      metricas.get("uplift_ratio"),
                "z_score":                           metricas.get("z_score"),
                "confidence_pct":                    result["confidence_pct"],
                "estado":                            estado_inicial,
                "metricas":                          metricas,
                "recomendacion":                     result["recomendacion"],
                "impacto_estimado_soles":            result.get("impacto_estimado_soles"),
                "impacto_estimado_soles_focalizado": result.get("impacto_estimado_soles_focalizado"),
            }
            return {
                "action":              "save_new",
                "evento":              evento,
                "estado_inicial":      estado_inicial,
                "campana_id":          None,
                "new_estado":          None,
                "prev_estado":         None,
                "update_kwargs":       {},
                "fecha_inicio_campana": None,
                "mensaje_suffix":      None,
            }

        prev = last["estado"]
        if prev in ("observando", "inicio", "finalizando", "activa"):
            new_estado = "en_riesgo_stock" if riesgo else "activa"
        elif prev == "en_riesgo_stock":
            new_estado = "activa" if not riesgo else "en_riesgo_stock"
        else:
            new_estado = prev  # descartada u otro terminal

        return {
            "action":              "update_estado",
            "evento":              None,
            "estado_inicial":      None,
            "campana_id":          last["id"],
            "new_estado":          new_estado,
            "prev_estado":         prev,
            "update_kwargs":       {},
            "fecha_inicio_campana": last.get("fecha_deteccion"),
            "mensaje_suffix":      None,
        }

    # campaign_detected=False
    if last is None:
        return {
            "action":              "noop",
            "evento":              None,
            "estado_inicial":      None,
            "campana_id":          None,
            "new_estado":          None,
            "prev_estado":         None,
            "update_kwargs":       {},
            "fecha_inicio_campana": None,
            "mensaje_suffix":      None,
        }

    if cierre == "finalizada" or last["estado"] == "finalizando":
        return {
            "action":              "update_estado",
            "evento":              None,
            "estado_inicial":      None,
            "campana_id":          last["id"],
            "new_estado":          "finalizada",
            "prev_estado":         last["estado"],
            "update_kwargs":       {
                "fecha_fin":               today_iso,
                "impacto_estimado_soles":  result.get("impacto_estimado_soles"),
            },
            "fecha_inicio_campana": None,
            "mensaje_suffix":      (
                f" La campaña iniciada el {last.get('fecha_deteccion')} ha finalizado."
            ),
        }

    return {
        "action":              "update_estado",
        "evento":              None,
        "estado_inicial":      None,
        "campana_id":          last["id"],
        "new_estado":          "finalizando",
        "prev_estado":         last["estado"],
        "update_kwargs":       {},
        "fecha_inicio_campana": None,
        "mensaje_suffix":      None,
    }


def apply_state_transition(decision: dict, result: dict) -> int | None:
    """Executes DB side-effects from decide_next_state and mutates result."""
    action     = decision["action"]
    campana_id = None

    if action == "save_new":
        saved      = save_campana_detectada(decision["evento"])
        campana_id = saved.get("id") if saved else None
        result["evento_id"]     = campana_id
        result["evento_estado"] = decision["estado_inicial"]

    elif action == "update_estado":
        campana_id  = decision["campana_id"]
        new_estado  = decision["new_estado"]
        prev_estado = decision["prev_estado"]

        if new_estado != prev_estado:
            update_campana_estado(campana_id, new_estado, **decision["update_kwargs"])

        result["evento_id"]     = campana_id
        result["evento_estado"] = new_estado

        if decision["fecha_inicio_campana"]:
            result["fecha_inicio_campaña"] = decision["fecha_inicio_campana"]

        if decision["mensaje_suffix"]:
            result["mensaje"] += decision["mensaje_suffix"]

    # action == "noop": nothing to do
    return campana_id


def _advance_state(
    result: dict,
    last: dict | None,
    today_iso: str,
    metricas: dict,
) -> int | None:
    """Thin wrapper: decide then apply."""
    decision = decide_next_state(result, last, today_iso, metricas)
    return apply_state_transition(decision, result)


@app.get("/api/predict/campaign-detection")
@limiter.limit("20/minute")
def campaign_detection(
    request: Request,
    recent_days: int = Query(default=7, ge=3, le=14, description="Días recientes a evaluar"),
    baseline_days: int = Query(default=60, ge=30, le=120, description="Días de historial para baseline"),
):
    """
    Detecta automáticamente si el negocio está en período de campaña.
    Usa uplift ajustado por día de semana, z-score, mediana robusta y
    desglose por categoría. Persiste eventos en campanas_detectadas (Supabase).

    Ciclo de vida:
        observando → inicio → activa → finalizando → finalizada
                                     ↘ en_riesgo_stock ↗
    """
    _require_service_auth(request, "ai-service/main.py:campaign_detection")

    lookback = baseline_days + recent_days + 7
    daily_sales, _, products, _ = _load_data(lookback_days=lookback)

    # Load feedback-learned thresholds (fire-and-forget; defaults to constants on error)
    threshold_overrides: dict | None = None
    try:
        fb_stats = fetch_campana_feedback_stats()
        if fb_stats:
            threshold_overrides = _compute_feedback_adjustments(fb_stats)
    except Exception:
        pass

    result = detect_campaign(
        daily_sales=daily_sales,
        products=products,
        recent_days=recent_days,
        baseline_days=baseline_days,
        threshold_overrides=threshold_overrides,
    )
    if threshold_overrides:
        result["threshold_overrides"] = threshold_overrides

    # Persistir evento y avanzar ciclo de vida (fire-and-forget, no bloquea respuesta)
    try:
        last      = get_last_campana_activa()
        today_iso = date.today().isoformat()
        metricas  = result.get("metricas", {})

        campana_id = _advance_state(result, last, today_iso, metricas)

        # ── Métricas diarias (persiste una fila por campaña+fecha) ───────────
        if campana_id and metricas:
            try:
                save_campana_metrica_diaria(campana_id, {
                    "fecha":            today_iso,
                    "ventas_unidades":  metricas.get("actual_sum", 0),
                    "ventas_soles":     metricas.get("ventas_soles_recientes", 0),
                    "uplift_ratio":     metricas.get("uplift_ratio"),
                    "z_score":          metricas.get("z_score"),
                })
            except Exception:
                pass

        # ── Top productos reales ──────────────────────────────────────────────
        if campana_id and result.get("top_productos"):
            try:
                productos_payload = [
                    {
                        "producto_id":      p["producto_id"],
                        "nombre":           p["nombre"],
                        "categoria":        p["categoria"],
                        "uplift_ratio":     p["uplift_ratio"],
                        "ventas_recientes": p["ventas_recientes"],
                        "ventas_baseline":  p["ventas_baseline"],
                        "stock_actual":     p.get("stock_actual"),
                        "impacto_soles":    p.get("impacto_soles"),
                    }
                    for p in result["top_productos"][:5]
                ]
                save_campana_productos(campana_id, productos_payload)
            except Exception:
                pass

    except Exception as persist_err:
        result["_persist_warning"] = str(persist_err)

    return result


# ── Campaign admin endpoints ──────────────────────────────────────────────────

class FeedbackPayload(BaseModel):
    campana_id: int
    accion: str                      # confirmar | descartar | nota
    nota: str | None = None
    admin_email: str | None = None


@app.get("/api/campaign/active")
@limiter.limit("30/minute")
def campaign_active(request: Request):
    """
    Devuelve la campaña activa más reciente con top_productos para el panel admin.
    Incluye historial de las últimas 10 campañas detectadas.
    """
    _require_service_auth(request, "api/campaign/active")
    try:
        last   = get_last_campana_activa()
        detail = fetch_campana_detail(last["id"]) if last else None
        historial = fetch_campanas_recientes(limit=10)
        return {
            "status":   "ok",
            "activa":   detail,
            "historial": historial,
        }
    except Exception as error:
        _raise_http_error(error)


@app.post("/api/campaign/feedback")
@limiter.limit("20/minute")
def campaign_feedback(request: Request, payload: FeedbackPayload):
    """
    Registra feedback del administrador sobre una campaña detectada.
    accion: 'confirmar' | 'descartar' | 'nota'
    """
    _require_service_auth(request, "api/campaign/feedback")
    try:
        confirmada = None
        if payload.accion == "confirmar":
            confirmada = True
        elif payload.accion == "descartar":
            confirmada = False

        # Registrar en tabla de historial de feedback
        save_campana_feedback(
            campana_id=payload.campana_id,
            accion=payload.accion,
            nota=payload.nota,
            admin_email=payload.admin_email,
        )
        # Actualizar campo principal si es confirmar/descartar
        if confirmada is not None:
            update_campana_admin_feedback(
                campana_id=payload.campana_id,
                confirmada=confirmada,
                nota=payload.nota,
            )
            if not confirmada:
                update_campana_estado(payload.campana_id, "descartada")

        return {"status": "ok", "campana_id": payload.campana_id, "accion": payload.accion}
    except Exception as error:
        _raise_http_error(error)


@app.get("/api/campaign/learning-stats")
@limiter.limit("30/minute")
def campaign_learning_stats(request: Request):
    """
    Estadisticas de aprendizaje por feedback del admin.
    Devuelve conteos por scope, precision, umbrales base y umbrales activos aprendidos.
    """
    _require_service_auth(request, "api/campaign/learning-stats")
    try:
        from models.campaign import (
            MIN_FEEDBACK_SAMPLES,
            UPLIFT_ALTA, UPLIFT_MEDIA, UPLIFT_BAJA,
        )
        fb_stats = fetch_campana_feedback_stats()
        learned  = _compute_feedback_adjustments(fb_stats) if fb_stats else {}

        def _precision(confirmadas: int, descartadas: int) -> float | None:
            total = confirmadas + descartadas
            if total < MIN_FEEDBACK_SAMPLES:
                return None
            return round(confirmadas / total * 100, 1)

        g_conf  = fb_stats.get("global_confirmadas",     0)
        g_desc  = fb_stats.get("global_descartadas",     0)
        f_conf  = fb_stats.get("focalizada_confirmadas", 0)
        f_desc  = fb_stats.get("focalizada_descartadas", 0)

        return {
            "status": "ok",
            "min_feedback_samples": MIN_FEEDBACK_SAMPLES,
            "conteos": {
                "global":    {"confirmadas": g_conf, "descartadas": g_desc, "total": g_conf + g_desc},
                "focalizada": {"confirmadas": f_conf, "descartadas": f_desc, "total": f_conf + f_desc},
            },
            "precision_pct": {
                "global":    _precision(g_conf, g_desc),
                "focalizada": _precision(f_conf, f_desc),
            },
            "umbrales_base": {
                "uplift_alta":       UPLIFT_ALTA,
                "uplift_media":      UPLIFT_MEDIA,
                "uplift_baja":       UPLIFT_BAJA,
                "uplift_focalizada": UPLIFT_MEDIA,
            },
            "umbrales_activos": learned if learned else {
                "uplift_alta":       UPLIFT_ALTA,
                "uplift_media":      UPLIFT_MEDIA,
                "uplift_baja":       UPLIFT_BAJA,
                "uplift_focalizada": UPLIFT_MEDIA,
            },
            "aprendizaje_activo": bool(learned and any(
                learned.get(k) != base
                for k, base in [
                    ("uplift_alta",       UPLIFT_ALTA),
                    ("uplift_media",      UPLIFT_MEDIA),
                    ("uplift_baja",       UPLIFT_BAJA),
                    ("uplift_focalizada", UPLIFT_MEDIA),
                ]
            )),
        }
    except Exception as error:
        _raise_http_error(error)
