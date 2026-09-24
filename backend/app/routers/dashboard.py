from fastapi import APIRouter

from app import aggregations as agg
from app import columns as col
from app.data_store import data_store
from app.schemas import DashboardResponse, FilterOptions

router = APIRouter(prefix="/api", tags=["dashboard"])

CURRENCY = "AED"  # confirmed from FIN_BUSINESSUNIT_D.LEDGERCURRENCYCODE for the
# business units actually present in the fact data (DSO, Executive Chairman Office)


def _unique_sorted(df, column: str) -> list:
    if column not in df.columns:
        return []
    return sorted(df[column].dropna().unique().tolist())


@router.get("/filters", response_model=FilterOptions)
def get_filters() -> FilterOptions:
    df = data_store.get_data()
    return FilterOptions(
        entities=_unique_sorted(df, col.ENTITY_NAME),
        invoice_types=_unique_sorted(df, col.INVOICE_TYPE),
        trx_classes=_unique_sorted(df, col.TRX_CLASS),
        years=[int(y) for y in _unique_sorted(df, "_year")],
        months=agg.MONTH_ORDER,
    )


@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard(
    entity: str | None = None,
    invoice_type: str | None = None,
    trx_class: str | None = None,
    year: int | None = None,
    month: str | None = None,
    customer_name: str | None = None,
    invoice_source: str | None = None,
) -> DashboardResponse:
    df = data_store.get_data()
    filtered = agg.filter_dataframe(
        df, entity, invoice_type, trx_class, year, month, customer_name, invoice_source
    )

    kpis = agg.compute_kpis(filtered)
    concentration = agg.customer_concentration(filtered)
    fiscal_year = kpis.yoy_current_year

    return DashboardResponse(
        kpis=kpis,
        invoice_type_contribution=agg.invoice_type_contribution(filtered),
        top_customers=agg.top_customers(filtered),
        monthly_trend=agg.monthly_trend(filtered),
        invoice_volume_trend=agg.invoice_volume_trend(filtered),
        invoice_source_analysis=agg.invoice_source_analysis(filtered),
        customer_concentration=concentration,
        economics=agg.invoice_economics(filtered),
        key_insights=agg.key_insights(filtered, kpis, concentration),
        exceptions=agg.invoice_exceptions(filtered),
        recent_invoices=agg.recent_invoices(filtered),
        loaded_at=data_store.loaded_at.isoformat() if data_store.loaded_at else "",
        currency=CURRENCY,
        fiscal_year=fiscal_year,
    )


@router.post("/reload")
def reload_data() -> dict[str, str]:
    data_store.reload()
    return {"status": "reloaded"}
