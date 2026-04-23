import time

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "https://calzaturavilchez-ab17f.web.app",
    ],
    allow_methods=["GET"],
    allow_headers=["*"],
)

_CACHE_TTL = 300

_cache: dict = {
    "data": None,       # (daily_sales, orders, products, product_codes)
    "expires_at": 0.0,
}


def _load_data(force: bool = False):
    """Returns cached Firestore data or refreshes it when expired."""
    now = time.monotonic()
    if not force and _cache["data"] is not None and now < _cache["expires_at"]:
        return _cache["data"]

    db = get_db()
    data = (
        fetch_daily_sales(db),
        fetch_completed_orders(db),
        fetch_products(db),
        fetch_product_codes(db),
    )
    _cache["data"] = data
    _cache["expires_at"] = now + _CACHE_TTL
    return data


@app.get("/")
def root():
    cached = _cache["data"] is not None and time.monotonic() < _cache["expires_at"]
    return {
        "status": "ok",
        "service": "Calzatura Vilchez AI",
        "cache_active": cached,
    }


@app.get("/api/predict/demand")
def demand_prediction(
    horizon: int = Query(default=30, ge=7, le=90, description="Dias a predecir (7-90)"),
    history: int = Query(default=90, ge=14, le=365, description="Dias de historial a usar"),
):
    """Predicts product demand for the next horizon days."""
    try:
        daily_sales, orders, products, product_codes = _load_data()
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
        raise HTTPException(status_code=500, detail=str(error))


@app.get("/api/predict/stock-alert")
def stock_alerts(
    days_threshold: int = Query(default=14, ge=1, le=60, description="Alertar si se agota en N dias"),
):
    """Returns products predicted to run out of stock within the requested threshold."""
    try:
        daily_sales, orders, products, product_codes = _load_data()
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
        raise HTTPException(status_code=500, detail=str(error))


@app.get("/api/predict/revenue")
def revenue_prediction(
    horizon: int = Query(default=30, ge=7, le=90, description="Dias a proyectar"),
    history: int = Query(default=120, ge=30, le=365, description="Dias historicos a usar"),
):
    """Returns future revenue forecast for the next week and month."""
    try:
        daily_sales, orders, *_ = _load_data()
        return forecast_revenue(
            daily_sales=daily_sales,
            completed_orders=orders,
            horizon_days=horizon,
            history_days=history,
        )
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


@app.get("/api/sales/weekly-chart")
def weekly_chart(
    weeks: int = Query(default=8, ge=2, le=24, description="Numero de semanas"),
):
    """Returns weekly sales volume for the last weeks."""
    try:
        daily_sales, orders, *_ = _load_data()
        chart = get_weekly_chart(daily_sales, orders, weeks=weeks)
        return {"weeks": weeks, "chart": chart}
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


@app.post("/api/cache/invalidate")
def invalidate_cache():
    """Force a cache refresh on the next request."""
    _cache["expires_at"] = 0.0
    return {"status": "cache invalidated"}
