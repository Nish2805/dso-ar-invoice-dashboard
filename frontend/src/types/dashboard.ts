export interface FilterOptions {
  entities: string[]
  invoice_types: string[]
  trx_classes: string[]
  years: number[]
  months: string[]
}

export interface Filters {
  entity?: string
  invoice_type?: string
  trx_class?: string
  year?: number
  month?: string
  customer_name?: string
  invoice_source?: string
}

export interface ChartPoint {
  label: string
  value: number
}

export interface TrendPoint {
  label: string
  current: number
  previous: number
}

export interface Kpis {
  invoice_amount_total: number
  invoice_count: number
  avg_invoice_value: number
  largest_invoice: number
  smallest_invoice: number
  yoy_growth_pct: number | null
  yoy_current_year: number | null
  yoy_previous_year: number | null
}

export interface InvoiceEconomics {
  median_invoice_value: number
  invoices_per_customer: number
  amount_per_customer: number
}

export interface ConcentrationSlice {
  label: string
  value: number
  pct: number
}

export interface ExceptionStats {
  high_value_count: number
  high_value_threshold: number
  low_value_count: number
  low_value_threshold: number
  peak_swing_month: string | null
  peak_swing_pct: number | null
  credit_memo_total: number
}

export interface InvoiceRow {
  account_no: string | null
  customer_name: string | null
  invoice_no: string | null
  invoice_amount: number | null
  trx_class: string | null
  trx_date: string | null
  line_no: string | null
  line_type: string | null
}

export interface PaginatedInvoices {
  rows: InvoiceRow[]
  total_rows: number
  total_amount: number
  page: number
  page_size: number
}

export interface DashboardResponse {
  kpis: Kpis
  invoice_type_contribution: ChartPoint[]
  top_customers: ChartPoint[]
  monthly_trend: TrendPoint[]
  invoice_volume_trend: TrendPoint[]
  invoice_source_analysis: ChartPoint[]
  customer_concentration: ConcentrationSlice[]
  economics: InvoiceEconomics
  key_insights: string[]
  exceptions: ExceptionStats
  recent_invoices: InvoiceRow[]
  loaded_at: string
  currency: string
  fiscal_year: number | null
}
