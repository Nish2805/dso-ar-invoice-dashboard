from fastapi import APIRouter

from app import aggregations as agg
from app import columns as col
from app.data_store import data_store
from app.schemas import PaginatedInvoices

router = APIRouter(prefix="/api", tags=["invoices"])


@router.get("/invoices", response_model=PaginatedInvoices)
def get_invoices(
    entity: str | None = None,
    invoice_type: str | None = None,
    trx_class: str | None = None,
    year: int | None = None,
    month: str | None = None,
    customer_name: str | None = None,
    invoice_source: str | None = None,
    page: int = 1,
    page_size: int = 50,
) -> PaginatedInvoices:
    df = data_store.get_data()
    filtered = agg.filter_dataframe(
        df, entity, invoice_type, trx_class, year, month, customer_name, invoice_source
    )

    total_amount = (
        float(filtered[col.INVOICE_AMOUNT].sum()) if col.INVOICE_AMOUNT in filtered.columns else 0.0
    )
    total_rows = len(filtered)

    start = (page - 1) * page_size
    end = start + page_size
    page_df = filtered.iloc[start:end]

    return PaginatedInvoices(
        rows=[agg.row_to_invoice_row(row) for _, row in page_df.iterrows()],
        total_rows=total_rows,
        total_amount=total_amount,
        page=page,
        page_size=page_size,
    )
