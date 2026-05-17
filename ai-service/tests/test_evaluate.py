"""Regresión de evaluate.py (reporte y helpers; sin Supabase en tests unitarios)."""
from __future__ import annotations

import os
from pathlib import Path

import pandas as pd
import pytest

import evaluate as ev


def _minimal_report_data() -> dict:
    return {
        "date": "2026-05-16",
        "history_days": 30,
        "n_folds": 2,
        "date_start": "2026-04-17",
        "date_end": "2026-05-16",
        "n_products": 2,
        "n_days": 30,
        "n_rows": 60,
        "n_with_sales": 10,
        "density_pct": 16.7,
        "e1_train_days": 24,
        "e1_test_days": 6,
        "m_rf": {"mae": 1.0, "rmse": 1.2, "mape": 70.0, "r2": 0.1},
        "m_base": {"mae": 0.9, "rmse": 1.1, "mape": 84.0, "r2": 0.0},
        "m_rf_w": {"mae": 1.1, "mape": 68.0},
        "m_base_w": {"mae": 0.8, "mape": 82.0},
        "fold_results": [
            {
                "fold": 1,
                "train_days": 10,
                "test_days": 5,
                "test_start": "2026-05-01",
                "test_end": "2026-05-05",
                "mape_rf": 70.0,
                "mape_base": 84.0,
                "mae_rf": 1.0,
                "mae_base": 0.9,
            },
        ],
        "avg_mape_rf": 70.0,
        "avg_mape_base": 84.0,
        "n_wins_mape": 1,
        "n_wins_mae": 0,
        "best_params": {},
        "top_configs": [],
        "m_base_val": {"mae": 0.0, "mape": 0.0},
        "wilcoxon": {"error": "n insuficiente para test"},
        "lc_results": [
            {
                "frac": 0.5,
                "n_train_days": 12,
                "n_train_samples": 100,
                "mae_rf": 1.0,
                "mape_rf": 72.0,
                "mape_base": 85.0,
            },
        ],
    }


class TestReportConclusions:
    def test_sparse_dataset_warning(self) -> None:
        lines = ev._report_conclusion_lines(_minimal_report_data())
        text = "\n".join(lines)
        assert "muy escaso" in text
        assert "0/2 folds" in text or "0/2" in text

    def test_no_false_6_of_6_claim(self) -> None:
        text = "\n".join(ev._report_conclusion_lines(_minimal_report_data()))
        assert "6/6 folds" not in text


class TestReportExp3:
    def test_empty_exp3_omission_line(self) -> None:
        lines = ev._report_exp3_lines({})
        assert any("grid search omitido" in ln for ln in lines)

    def test_full_exp3_lines(self) -> None:
        res = {
            "best_params": {"n_estimators": 100, "max_depth": 10, "min_samples_leaf": 2},
            "top_configs": [{"mape": 65.0}],
            "m_base_val": {"mape": 80.0},
        }
        text = "\n".join(ev._report_exp3_lines(res))
        assert "n_estimators" in text
        assert "65.0%" in text


class TestLearningCurveTrend:
    @pytest.mark.parametrize(
        ("current", "prev", "expected"),
        [
            (10.0, None, " "),
            (8.0, 10.0, "v"),
            (12.0, 10.0, "^"),
            (10.0, 10.0, "-"),
        ],
    )
    def test_trend_symbols(self, current: float, prev: float | None, expected: str) -> None:
        assert ev._learning_curve_trend(current, prev) == expected


class TestGenerateReport:
    def test_writes_file_with_empty_exp3(self, tmp_path: Path) -> None:
        out = tmp_path / "report.txt"
        report = ev.generate_report(_minimal_report_data(), output_path=str(out))
        assert "grid search omitido" in report
        assert out.read_text(encoding="utf-8") == report

    def test_main_exp3_merge_like_production(self) -> None:
        exp3: dict = {}
        best_params = exp3.get("best_params") or {}
        top_configs = exp3.get("top_configs") or []
        m_base_val = exp3.get("m_base_val") or {"mae": 0.0, "mape": 0.0}
        assert best_params == {}
        assert top_configs == []
        assert m_base_val["mape"] == 0.0


class TestRunExperiment3:
    def test_returns_empty_when_train_insufficient(self) -> None:
        df = pd.DataFrame(
            {
                "pid": ["p1"] * 5,
                "fecha": [f"2026-05-0{i}" for i in range(1, 6)],
                "y": [0, 1, 0, 0, 1],
                "weekday": [0, 1, 2, 3, 4],
                "month": [5] * 5,
                "day_of_month": list(range(1, 6)),
                "lag_7": [0.0] * 5,
                "lag_30": [0.0] * 5,
            }
        )
        result = ev.run_experiment_3(df)
        assert result == {}


@pytest.mark.integration
@pytest.mark.skipif(
    not os.getenv("SUPABASE_URL") or not os.getenv("SUPABASE_SERVICE_KEY"),
    reason="Requiere SUPABASE_URL y SUPABASE_SERVICE_KEY en el entorno",
)
def test_evaluate_loads_supabase_sample() -> None:
    """Smoke de Parte A: carga real sin ejecutar el pipeline completo."""
    ev._ensure_runtime_dependencies()
    daily = ev.fetch_daily_sales(days=7)
    orders = ev.fetch_completed_orders(days=7)
    assert isinstance(daily, list)
    assert isinstance(orders, list)
