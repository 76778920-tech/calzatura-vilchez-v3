import time
import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from models.demand import get_stock_alerts, get_weekly_chart, predict_demand
from models.revenue import forecast_revenue
from services.firebase_client import (
    fetch_completed_orders,
    fetch_daily_sales,
    fetch_product_codes,
    fetch_products,
    get_db,
)

load_dotenv()

app = FastAPI(title="Calzatura Vilchez AI Service", version="1.0.0")

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

_CACHE_TTL = 300

_cache: dict = {
    "data": None,       # (daily_sales, orders, products, product_codes)
    "expires_at": 0.0,
    "lookback_days": 0,
}


@app.on_event("startup")
def log_startup_context():
    port = os.getenv("PORT", "not-set")
    has_json_cred = bool(os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON"))
    print(f"[startup] cwd={os.getcwd()}")
    print(f"[startup] PORT={port}")
    print(f"[startup] FIREBASE_SERVICE_ACCOUNT_JSON present={has_json_cred}")


def _load_data(force: bool = False, lookback_days: int = 180):
    """Returns cached Firestore data or refreshes it when expired."""
    now = time.monotonic()
    if (
        not force
        and _cache["data"] is not None
        and now < _cache["expires_at"]
        and _cache["lookback_days"] >= lookback_days
    ):
        return _cache["data"]

    db = get_db()
    data = (
        fetch_daily_sales(db, days=lookback_days),
        fetch_completed_orders(db, days=lookback_days),
        fetch_products(db),
        fetch_product_codes(db),
    )
    _cache["data"] = data
    _cache["expires_at"] = now + _CACHE_TTL
    _cache["lookback_days"] = lookback_days
    return data


def _raise_http_error(error: Exception) -> None:
    detail = str(error)
    if "quota exceeded" in detail.lower():
        raise HTTPException(
            status_code=503,
            detail="Firestore quota exceeded. Reduce reads or wait for quota reset.",
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


@app.get("/api/debug/firebase")
def debug_firebase():
    """Diagnose Firebase connection — use only to troubleshoot, not in production."""
    import json as _json
    result: dict = {}
    json_env = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
    result["env_var_present"] = bool(json_env)
    result["env_var_length"] = len(json_env) if json_env else 0
    if json_env:
        try:
            parsed = _json.loads(json_env)
            result["json_parse"] = "ok"
            result["project_id"] = parsed.get("project_id", "missing")
            result["has_private_key"] = "private_key" in parsed
            result["client_email"] = parsed.get("client_email", "missing")
        except Exception as e:
            result["json_parse"] = f"ERROR: {e}"
            return result
    try:
        db = get_db()
        # Quick ping — list collections without reading docs
        list(db.collections())
        result["firestore"] = "connected"
    except Exception as e:
        result["firestore"] = f"ERROR: {e}"
    return result


@app.get("/api/predict/demand")
def demand_prediction(
    horizon: int = Query(default=30, ge=7, le=90, description="Dias a predecir (7-90)"),
    history: int = Query(default=90, ge=14, le=365, description="Dias de historial a usar"),
):
    """Predicts product demand for the next horizon days."""
    try:
        lookback_days = max(history, 120)
        daily_sales, orders, products, product_codes = _load_data(lookback_days=lookback_days)
        predictions = predict_demand(
            daily_sales=daily_sales,
            completed_orders=orders,
            products=products,
            product_codes=product_codes,
            horizon_days=horizon,
            history_days=history,
        )
        return {
            "horizon_days": horizon,
            "history_days": history,
            "total_products": len(predictions),
            "predictions": predictions,
        }
    except Exception as error:
        _raise_http_error(error)


@app.get("/api/predict/stock-alert")
def stock_alerts(
    days_threshold: int = Query(default=14, ge=1, le=60, description="Alertar si se agota en N dias"),
):
    """Returns products predicted to run out of stock within the requested threshold."""
    try:
        lookback_days = max(days_threshold, 90)
        daily_sales, orders, products, product_codes = _load_data(lookback_days=lookback_days)
        predictions = predict_demand(
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
def revenue_prediction(
    horizon: int = Query(default=30, ge=7, le=90, description="Dias a proyectar"),
    history: int = Query(default=120, ge=30, le=365, description="Dias historicos a usar"),
):
    """Returns future revenue forecast for the next week and month."""
    try:
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
def weekly_chart(
    weeks: int = Query(default=8, ge=2, le=24, description="Numero de semanas"),
):
    """Returns weekly sales volume for the last weeks."""
    try:
        lookback_days = max(weeks * 7, 56)
        daily_sales, orders, *_ = _load_data(lookback_days=lookback_days)
        chart = get_weekly_chart(daily_sales, orders, weeks=weeks)
        return {"weeks": weeks, "chart": chart}
    except Exception as error:
        _raise_http_error(error)


@app.post("/api/cache/invalidate")
def invalidate_cache():
    """Force a cache refresh on the next request."""
    _cache["expires_at"] = 0.0
    _cache["lookback_days"] = 0
    return {"status": "cache invalidated"}
