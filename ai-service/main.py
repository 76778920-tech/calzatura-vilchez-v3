import time
import os
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from models.demand import build_daily_sales_by_product, get_stock_alerts, get_weekly_chart, predict_demand
from models.revenue import forecast_revenue
from services.supabase_client import (
    fetch_completed_orders,
    fetch_daily_sales,
    fetch_product_codes,
    fetch_products,
    get_client,
)

load_dotenv()

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="Calzatura Vilchez AI Service", version="1.1.0")
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
    if not _AI_SERVICE_BEARER_TOKEN:
        raise HTTPException(status_code=503, detail="Auth not configured")

    if token != _AI_SERVICE_BEARER_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")


@app.on_event("startup")
def log_startup_context():
    port = os.getenv("PORT", "not-set")
    has_supabase_url = bool(os.getenv("SUPABASE_URL"))
    has_supabase_key = bool(os.getenv("SUPABASE_SERVICE_KEY"))
    print(f"[startup] cwd={os.getcwd()}")
    print(f"[startup] PORT={port}")
    print(f"[startup] SUPABASE_URL present={has_supabase_url}")
    print(f"[startup] SUPABASE_SERVICE_KEY present={has_supabase_key}")


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

        return {
            "demand": {
                "horizon_days": horizon,
                "history_days": history,
                "total_products": len(predictions),
                "modelo_meta": training_meta,
                "predictions": predictions,
            },
            "revenue": revenue,
            "warnings": warnings,
        }
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
