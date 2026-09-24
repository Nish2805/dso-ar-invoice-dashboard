from pydantic import BaseModel


class FilterOptions(BaseModel):
    entities: list[str]
    invoice_types: list[str]
    trx_classes: list[str]
    years: list[int]
    months: list[str]


class ChartPoint(BaseModel):
    label: str
    value: float


class TrendPoint(BaseModel):
    label: str
    current: float
    previous: float


class Kpis(BaseModel):
    invoice_amount_total: float
    invoice_count: int
    avg_invoice_value: float
    largest_invoice: float
    smallest_invoice: float
    yoy_growth_pct: float | None = None
    yoy_current_year: int | None = None
    yoy_previous_year: int | None = None


class InvoiceEconomics(BaseModel):
    median_invoice_value: float
    invoices_per_customer: float
    amount_per_customer: float


class ConcentrationSlice(BaseModel):
    label: str
    value: float
    pct: float


class ExceptionStats(BaseModel):
    high_value_count: int
    high_value_threshold: float
    low_value_count: int
    low_value_threshold: float
    peak_swing_month: str | None
    peak_swing_pct: float | None
    credit_memo_total: float


class InvoiceRow(BaseModel):
    account_no: str | None = None
    customer_name: str | None = None
    invoice_no: str | None = None
    invoice_amount: float | None = None
    trx_class: str | None = None
    trx_date: str | None = None
    line_no: str | None = None
    line_type: str | None = None


class PaginatedInvoices(BaseModel):
    rows: list[InvoiceRow]
    total_rows: int
    total_amount: float
    page: int
    page_size: int


class DashboardResponse(BaseModel):
    kpis: Kpis
    invoice_type_contribution: list[ChartPoint]
    top_customers: list[ChartPoint]
    monthly_trend: list[TrendPoint]
    invoice_volume_trend: list[TrendPoint]
    invoice_source_analysis: list[ChartPoint]
    customer_concentration: list[ConcentrationSlice]
    economics: InvoiceEconomics
    key_insights: list[str]
    exceptions: ExceptionStats
    recent_invoices: list[InvoiceRow]
    loaded_at: str
    currency: str
    fiscal_year: int | None
