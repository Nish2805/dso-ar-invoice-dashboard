import calendar
import math

import pandas as pd

from app import columns as col
from app.schemas import (
    ChartPoint,
    ConcentrationSlice,
    ExceptionStats,
    InvoiceEconomics,
    InvoiceRow,
    Kpis,
    TrendPoint,
)

MONTH_ORDER = list(calendar.month_name)[1:]  # ["January", ..., "December"]
_MONTH_INDEX = {name: i + 1 for i, name in enumerate(MONTH_ORDER)}


def filter_dataframe(
    df: pd.DataFrame,
    entity: str | None = None,
    invoice_type: str | None = None,
    trx_class: str | None = None,
    year: int | None = None,
    month: str | None = None,
    customer_name: str | None = None,
    invoice_source: str | None = None,
) -> pd.DataFrame:
    mask = pd.Series(True, index=df.index)

    def apply(column: str, value) -> None:
        nonlocal mask
        if value is not None and column in df.columns:
            mask &= df[column] == value

    apply(col.ENTITY_NAME, entity)
    apply(col.INVOICE_TYPE, invoice_type)
    apply(col.TRX_CLASS, trx_class)
    apply("_year", year)
    apply("_month", month)
    apply(col.CUSTOMER_NAME, customer_name)
    apply(col.INVOICE_SOURCE, invoice_source)

    return df[mask]


def _group_sum(df: pd.DataFrame, group_col: str, top_n: int | None = None) -> list[ChartPoint]:
    if group_col not in df.columns or col.INVOICE_AMOUNT not in df.columns:
        return []
    grouped = (
        df.groupby(group_col)[col.INVOICE_AMOUNT]
        .sum()
        .sort_values(ascending=False)
        .dropna()
    )
    if top_n is not None:
        grouped = grouped.head(top_n)
    return [ChartPoint(label=str(label), value=float(value)) for label, value in grouped.items()]


def _invoice_totals(df: pd.DataFrame) -> pd.Series:
    """One row per invoice, summed across its lines (so TAX/LINE splits net out)."""
    if col.INVOICE_NO not in df.columns or col.INVOICE_AMOUNT not in df.columns:
        return pd.Series(dtype=float)
    return df.groupby(col.INVOICE_NO)[col.INVOICE_AMOUNT].sum()


def _latest_two_years(df: pd.DataFrame) -> tuple[int | None, int | None]:
    """Most recent year present and the year before it, or (year, None) / (None, None)."""
    if "_year" not in df.columns:
        return None, None
    years = sorted(y for y in df["_year"].dropna().unique())
    if not years:
        return None, None
    latest = int(years[-1])
    previous = latest - 1 if (latest - 1) in years else None
    return latest, previous


def compute_kpis(df: pd.DataFrame) -> Kpis:
    if col.INVOICE_AMOUNT not in df.columns:
        return Kpis(
            invoice_amount_total=0.0,
            invoice_count=0,
            avg_invoice_value=0.0,
            largest_invoice=0.0,
            smallest_invoice=0.0,
        )

    total = float(df[col.INVOICE_AMOUNT].sum())
    invoice_totals = _invoice_totals(df)
    count = int(invoice_totals.shape[0]) if not invoice_totals.empty else 0

    latest_year, previous_year = _latest_two_years(df)
    yoy_growth_pct = None
    if latest_year is not None and previous_year is not None:
        months_in_latest = set(df.loc[df["_year"] == latest_year, "_month_num"].dropna().unique())
        current_slice = df.loc[df["_year"] == latest_year]
        previous_slice = df.loc[(df["_year"] == previous_year) & (df["_month_num"].isin(months_in_latest))]
        current_total = current_slice[col.INVOICE_AMOUNT].sum()
        previous_total = previous_slice[col.INVOICE_AMOUNT].sum()
        current_invoice_count = current_slice[col.INVOICE_NO].nunique() if col.INVOICE_NO in df.columns else 0
        previous_invoice_count = previous_slice[col.INVOICE_NO].nunique() if col.INVOICE_NO in df.columns else 0

        # Guard against comparing against a prior period with barely any data (e.g.
        # an incomplete migration) — that produces a huge, misleading swing rather
        # than a real YoY trend. Require the prior period to have a meaningful
        # fraction of the current period's invoice volume before trusting it.
        comparable = previous_invoice_count >= max(30, current_invoice_count * 0.2)
        if previous_total and comparable:
            yoy_growth_pct = float((current_total - previous_total) / abs(previous_total) * 100)
        else:
            previous_year = None

    return Kpis(
        invoice_amount_total=total,
        invoice_count=count,
        avg_invoice_value=float(total / count) if count else 0.0,
        largest_invoice=float(invoice_totals.max()) if not invoice_totals.empty else 0.0,
        smallest_invoice=float(invoice_totals.min()) if not invoice_totals.empty else 0.0,
        yoy_growth_pct=yoy_growth_pct,
        yoy_current_year=latest_year,
        yoy_previous_year=previous_year,
    )


def invoice_type_contribution(df: pd.DataFrame) -> list[ChartPoint]:
    return _group_sum(df, col.INVOICE_TYPE)


def top_customers(df: pd.DataFrame, top_n: int = 10) -> list[ChartPoint]:
    return _group_sum(df, col.CUSTOMER_NAME, top_n=top_n)


def invoice_source_analysis(df: pd.DataFrame) -> list[ChartPoint]:
    return _group_sum(df, col.INVOICE_SOURCE)


def _yoy_monthly_series(df: pd.DataFrame, value_fn) -> tuple[list[TrendPoint], int | None, int | None]:
    latest_year, previous_year = _latest_two_years(df)
    current = value_fn(df[df["_year"] == latest_year]) if latest_year is not None else {}
    previous = value_fn(df[df["_year"] == previous_year]) if previous_year is not None else {}
    points = [
        TrendPoint(
            label=month,
            current=float(current.get(month, 0.0)),
            previous=float(previous.get(month, 0.0)),
        )
        for month in MONTH_ORDER
    ]
    return points, latest_year, previous_year


def monthly_trend(df: pd.DataFrame) -> list[TrendPoint]:
    def amounts_by_month(sub: pd.DataFrame) -> dict:
        if col.INVOICE_AMOUNT not in sub.columns or "_month" not in sub.columns:
            return {}
        return sub.groupby("_month")[col.INVOICE_AMOUNT].sum().to_dict()

    points, _, _ = _yoy_monthly_series(df, amounts_by_month)
    return points


def invoice_volume_trend(df: pd.DataFrame) -> list[TrendPoint]:
    def counts_by_month(sub: pd.DataFrame) -> dict:
        if col.INVOICE_NO not in sub.columns or "_month" not in sub.columns:
            return {}
        return sub.groupby("_month")[col.INVOICE_NO].nunique().to_dict()

    points, _, _ = _yoy_monthly_series(df, counts_by_month)
    return points


def customer_concentration(df: pd.DataFrame, top_n: int = 10) -> list[ConcentrationSlice]:
    if col.CUSTOMER_NAME not in df.columns or col.INVOICE_AMOUNT not in df.columns:
        return []
    by_customer = df.groupby(col.CUSTOMER_NAME)[col.INVOICE_AMOUNT].sum()
    total = by_customer.sum()
    if not total:
        return []
    top_total = by_customer.sort_values(ascending=False).head(top_n).sum()
    rest_total = total - top_total
    return [
        ConcentrationSlice(label=f"Top {top_n} Customers", value=float(top_total), pct=float(top_total / total * 100)),
        ConcentrationSlice(label="Other Customers", value=float(rest_total), pct=float(rest_total / total * 100)),
    ]


def invoice_economics(df: pd.DataFrame) -> InvoiceEconomics:
    invoice_totals = _invoice_totals(df)
    n_customers = df[col.CUSTOMER_NAME].nunique() if col.CUSTOMER_NAME in df.columns else 0
    n_invoices = invoice_totals.shape[0]
    total_amount = float(invoice_totals.sum()) if not invoice_totals.empty else 0.0

    return InvoiceEconomics(
        median_invoice_value=float(invoice_totals.median()) if not invoice_totals.empty else 0.0,
        invoices_per_customer=float(n_invoices / n_customers) if n_customers else 0.0,
        amount_per_customer=float(total_amount / n_customers) if n_customers else 0.0,
    )


def invoice_exceptions(df: pd.DataFrame) -> ExceptionStats:
    invoice_totals = _invoice_totals(df)
    positive = invoice_totals[invoice_totals > 0]

    high_threshold = float(positive.quantile(0.99)) if not positive.empty else 0.0
    low_threshold = float(positive.quantile(0.01)) if not positive.empty else 0.0
    high_count = int((positive > high_threshold).sum()) if not positive.empty else 0
    low_count = int(((positive > 0) & (positive < low_threshold)).sum()) if not positive.empty else 0

    peak_month, peak_pct = None, None
    latest_year, _ = _latest_two_years(df)
    if latest_year is not None and col.INVOICE_AMOUNT in df.columns:
        monthly = df.loc[df["_year"] == latest_year].groupby("_month")[col.INVOICE_AMOUNT].sum()
        if not monthly.empty and monthly.mean():
            swing = ((monthly - monthly.mean()) / abs(monthly.mean()) * 100).abs()
            peak_month = str(swing.idxmax())
            peak_pct = float(swing.max())

    credit_memo_total = 0.0
    if col.TRX_CLASS in df.columns and col.INVOICE_AMOUNT in df.columns:
        credit_memo_total = float(df.loc[df[col.TRX_CLASS] == "CM", col.INVOICE_AMOUNT].sum())

    return ExceptionStats(
        high_value_count=high_count,
        high_value_threshold=high_threshold,
        low_value_count=low_count,
        low_value_threshold=low_threshold,
        peak_swing_month=peak_month,
        peak_swing_pct=peak_pct,
        credit_memo_total=credit_memo_total,
    )


def key_insights(df: pd.DataFrame, kpis: Kpis, concentration: list[ConcentrationSlice]) -> list[str]:
    insights: list[str] = []

    if kpis.yoy_growth_pct is not None:
        direction = "increased" if kpis.yoy_growth_pct >= 0 else "decreased"
        insights.append(
            f"Invoice value {direction} {abs(kpis.yoy_growth_pct):.1f}% year-over-year "
            f"({kpis.yoy_previous_year} → {kpis.yoy_current_year})."
        )

    latest_year, _ = _latest_two_years(df)
    if latest_year is not None and col.INVOICE_AMOUNT in df.columns:
        monthly = df.loc[df["_year"] == latest_year].groupby("_month")[col.INVOICE_AMOUNT].sum()
        if not monthly.empty and monthly.mean():
            peak_month = monthly.idxmax()
            pct_above_avg = (monthly.max() - monthly.mean()) / abs(monthly.mean()) * 100
            insights.append(
                f"{peak_month} {latest_year} generated the highest invoice value, "
                f"{pct_above_avg:.0f}% above the monthly average."
            )

    if concentration:
        top_slice = concentration[0]
        insights.append(f"{top_slice.label} represent {top_slice.pct:.0f}% of total billing.")

    top_types = invoice_type_contribution(df)
    if top_types:
        leader = top_types[0]
        share = (leader.value / kpis.invoice_amount_total * 100) if kpis.invoice_amount_total else 0.0
        insights.append(f'"{leader.label}" is the largest invoice type, contributing {share:.0f}% of total value.')

    return insights


ROW_FIELD_MAP = {
    "account_no": col.CUSTOMER_ACCOUNT_NO,
    "customer_name": col.CUSTOMER_NAME,
    "invoice_no": col.INVOICE_NO,
    "invoice_amount": col.INVOICE_AMOUNT,
    "trx_class": col.TRX_CLASS,
    "trx_date": col.TRX_DATE,
    "line_no": col.LINE_NO,
    "line_type": col.LINE_TYPE,
}
ROW_STRING_FIELDS = {"account_no", "line_no"}


def row_to_invoice_row(row: pd.Series) -> InvoiceRow:
    values = {}
    for field, source_col in ROW_FIELD_MAP.items():
        value = row.get(source_col)
        if value is None or (isinstance(value, float) and math.isnan(value)):
            values[field] = None
        elif field in ROW_STRING_FIELDS:
            values[field] = str(int(value)) if isinstance(value, float) else str(value)
        else:
            values[field] = value
    return InvoiceRow(**values)


def recent_invoices(df: pd.DataFrame, n: int = 5) -> list[InvoiceRow]:
    if col.TRX_DATE not in df.columns:
        return []
    ordered = df.sort_values(col.TRX_DATE, ascending=False).head(n)
    return [row_to_invoice_row(row) for _, row in ordered.iterrows()]
