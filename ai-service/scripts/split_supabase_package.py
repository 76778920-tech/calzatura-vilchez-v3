"""Retired one-off: split supabase_client.py into services/supabase/ (see git history)."""

from __future__ import annotations

MODULE_HTTP = "http.py"
MODULE_CATALOG = "catalog.py"
MODULE_IRE_MODEL = "ire_model.py"
MODULE_CAMPAIGNS = "campaigns.py"
SPLIT_MODULES = (MODULE_HTTP, MODULE_CATALOG, MODULE_IRE_MODEL, MODULE_CAMPAIGNS)


def main() -> None:
    raise SystemExit(
        "Retired migration script. Modules: " + ", ".join(SPLIT_MODULES),
    )


if __name__ == "__main__":
    main()
