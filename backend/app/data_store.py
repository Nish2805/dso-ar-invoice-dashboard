"""
In-memory cache of the joined fact + dimension data, read from local CSVs
(backend/data/raw/, downloaded once from ADLS — see plan Phase 0). Loaded once
at FastAPI startup and re-loaded on demand via POST /api/reload. No background
auto-refresh, and no Azure calls in this mode.
"""
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from app import columns as col
from app.config import settings


class DataStore:
    def __init__(self) -> None:
        self._df: pd.DataFrame | None = None
        self.loaded_at: datetime | None = None

    def load(self) -> None:
        data_dir = Path(settings.local_data_dir)

        fact = pd.read_csv(data_dir / col.FACT_FILE, low_memory=False)
        customers = pd.read_csv(data_dir / col.CUSTOMER_FILE, low_memory=False)
        business_units = pd.read_csv(data_dir / col.BUSINESS_UNIT_FILE)
        record_types = pd.read_csv(data_dir / col.RECORD_TYPE_FILE)
        invoice_sources = pd.read_csv(data_dir / col.INVOICE_SOURCE_FILE)

        # Dimension tables can have duplicate rows per join key (e.g. one row per
        # site/usage assignment) — dedupe on the key so the merge doesn't fan out
        # fact rows.
        customers = customers.drop_duplicates(subset=[col.CUSTOMER_ID])
        business_units = business_units.drop_duplicates(subset=[col.BUSINESS_UNIT_ID])
        record_types = record_types.drop_duplicates(subset=[col.RECORD_TYPE_ID])
        invoice_sources = invoice_sources.drop_duplicates(subset=[col.INVOICE_SOURCE_ID])

        merged = fact.merge(
            customers[[col.CUSTOMER_ID, col.CUSTOMER_ACCOUNT_NO, col.CUSTOMER_NAME]],
            left_on=col.FACT_CUSTOMER_ID,
            right_on=col.CUSTOMER_ID,
            how="left",
        )
        merged = merged.merge(
            business_units[[col.BUSINESS_UNIT_ID, col.ENTITY_NAME]],
            left_on=col.FACT_ORG_ID,
            right_on=col.BUSINESS_UNIT_ID,
            how="left",
        )
        merged = merged.merge(
            record_types[[col.RECORD_TYPE_ID, col.INVOICE_TYPE]],
            left_on=col.FACT_TRX_TYPE_ID,
            right_on=col.RECORD_TYPE_ID,
            how="left",
        )
        merged = merged.merge(
            invoice_sources[[col.INVOICE_SOURCE_ID, col.INVOICE_SOURCE]],
            left_on=col.FACT_SOURCE_ID,
            right_on=col.INVOICE_SOURCE_ID,
            how="left",
        )

        parsed_dates = pd.to_datetime(merged[col.TREND_DATE_COLUMN], errors="coerce")
        merged["_year"] = parsed_dates.dt.year
        merged["_month"] = parsed_dates.dt.month_name()
        merged["_month_num"] = parsed_dates.dt.month

        self._df = merged
        self.loaded_at = datetime.now(timezone.utc)

    def get_data(self) -> pd.DataFrame:
        if self._df is None:
            raise RuntimeError("Data not loaded yet. Call load() at startup first.")
        return self._df

    def reload(self) -> None:
        self.load()


data_store = DataStore()
