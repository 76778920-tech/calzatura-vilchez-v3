import time
import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware

from models.demand import get_stock_alerts, get_weekly_chart, predict_demand
from models.revenue import forecast_revenue
from services.supabase_client import (
    fetch_completed_orders,
    fetch_daily_sales,
    fetch_product_codes,
    fetch_products,
    get_client,
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

_CACHE_TTL = 7200  # 2 hours — conserves Firestore free-tier quota

_cache: dict = {
    "data": None,       # (daily_sales, orders, products, product_codes)
    "expires_at": 0.0,
    "lookback_days": 0,
}

_AI_SERVICE_BEARER_TOKEN = os.getenv("AI_SERVICE_BEARER_TOKEN", "").strip()


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

    data = (
        fetch_daily_sales(days=lookback_days),
        fetch_completed_orders(days=lookback_days),
        fetch_products(),
        fetch_product_codes(),
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
    request: Request,
    days_threshold: int = Query(default=14, ge=1, le=60, description="Alertar si se agota en N días"),
):
    """Returns products predicted to run out of stock within the requested threshold."""
    try:
        _require_service_auth(request, "ai-service/main.py:stock_alerts")
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
    request: Request,
    horizon: int = Query(default=30, ge=7, le=90, description="Dias a proyectar"),
    history: int = Query(default=120, ge=30, le=365, description="Dias historicos a usar"),
):
    """Returns future revenue forecast for the next week and month."""
    try:
        _require_service_auth(request, "ai-service/main.py:revenue_prediction")
        _debug_log(
            hypothesis_id="H1-H4",
            location="ai-service/main.py:revenue_prediction",
            message="predict revenue accessed",
            data={**_request_context(request), "horizon": horizon, "history": history},
        )
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
def invalidate_cache(request: Request):
    """Force a cache refresh on the next request."""
    _require_service_auth(request, "ai-service/main.py:invalidate_cache")
    _cache["expires_at"] = 0.0
    _cache["lookback_days"] = 0
    return {"status": "cache invalidated"}
