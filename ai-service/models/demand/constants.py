"""Demand model constants."""

MIN_TRAIN_ROWS = 30
MIN_PRODUCTS_FOR_RELIABLE_PREDICTIONS = 5

SEASONAL_FEATURES = [
    "temporada_verano",
    "temporada_escolar",
    "temporada_fiestas_patrias",
    "temporada_navidad",
]

FEATURE_COLS = [
    "weekday",
    "month",
    "day_of_month",
    "lag_7",
    "lag_30",
    "categoria",
    "campana",
    *SEASONAL_FEATURES,
]
