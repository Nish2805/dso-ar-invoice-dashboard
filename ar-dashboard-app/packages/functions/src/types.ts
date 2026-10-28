/**
 * Function schema types for RayfinClient.
 *
 * AUTO-GENERATED — do not edit manually.
 * Re-generated automatically when function source files change.
 *
 * If this file is not updating automatically, run:
 *   rayfin dev functions apply
 *
 * The schema is a closed object type: only the function names listed
 * below are accepted by RayfinClient.functions.<name>.invoke(...).
 * Adding, renaming, or changing the signature of a udf.func() call
 * regenerates this file and surfaces type errors at every consumer.
 *
 * IMPORTANT: This file must NOT import any Node.js packages — it is
 * resolved by the frontend app's TypeScript compiler.
 */

export type AppFunctionsSchema = {
  computeKpis: {
    input: { filters: { entity?: undefined | string; invoiceType?: undefined | string; trxClass?: undefined | string; year?: undefined | number; month?: undefined | number; customerId?: undefined | string; invoiceSource?: undefined | string } };
    output: { total_amount: number; invoice_count: number; avg_invoice_value: number; largest_invoice: number; smallest_invoice: number; credit_memo_total: number; yoy_growth_pct: null | number; yoy_current_year: null | number; yoy_previous_year: null | number };
  };
  topCustomers: {
    input: { filters: { entity?: undefined | string; invoiceType?: undefined | string; trxClass?: undefined | string; year?: undefined | number; month?: undefined | number; customerId?: undefined | string; invoiceSource?: undefined | string } };
    output: { customer_id: string; customer_name: string; total_amount: number }[];
  };
  customerConcentration: {
    input: { filters: { entity?: undefined | string; invoiceType?: undefined | string; trxClass?: undefined | string; year?: undefined | number; month?: undefined | number; customerId?: undefined | string; invoiceSource?: undefined | string } };
    output: { label: string; value: number; pct: number }[];
  };
  invoiceEconomics: {
    input: { filters: { entity?: undefined | string; invoiceType?: undefined | string; trxClass?: undefined | string; year?: undefined | number; month?: undefined | number; customerId?: undefined | string; invoiceSource?: undefined | string } };
    output: { median_invoice_value: number; invoices_per_customer: number; amount_per_customer: number };
  };
  invoiceExceptions: {
    input: { filters: { entity?: undefined | string; invoiceType?: undefined | string; trxClass?: undefined | string; year?: undefined | number; month?: undefined | number; customerId?: undefined | string; invoiceSource?: undefined | string } };
    output: { high_value_count: number; high_value_threshold: number; low_value_count: number; low_value_threshold: number; peak_swing_month: null | string; peak_swing_pct: null | number; credit_memo_total: number };
  };
  getFilterOptions: {
    input: Record<string, never>;
    output: { years: number[] };
  };
  monthlyTrend: {
    input: { filters: { entity?: undefined | string; invoiceType?: undefined | string; trxClass?: undefined | string; year?: undefined | number; month?: undefined | number; customerId?: undefined | string; invoiceSource?: undefined | string } };
    output: { currentYear: number; previousYear: number; current: { month: number; amount: number; volume: number }[]; previous: { month: number; amount: number; volume: number }[] };
  };
  keyInsights: {
    input: { filters: { entity?: undefined | string; invoiceType?: undefined | string; trxClass?: undefined | string; year?: undefined | number; month?: undefined | number; customerId?: undefined | string; invoiceSource?: undefined | string } };
    output: string[];
  };
  recentInvoices: {
    input: { filters: { entity?: undefined | string; invoiceType?: undefined | string; trxClass?: undefined | string; year?: undefined | number; month?: undefined | number; customerId?: undefined | string; invoiceSource?: undefined | string } };
    output: { customer_name: string; trx_number: string; trx_date: null | string; amount: number }[];
  };
  invoiceTypeContribution: {
    input: { filters: { entity?: undefined | string; invoiceType?: undefined | string; trxClass?: undefined | string; year?: undefined | number; month?: undefined | number; customerId?: undefined | string; invoiceSource?: undefined | string } };
    output: { id: string; label: string; value: number }[];
  };
  invoiceSourceAnalysis: {
    input: { filters: { entity?: undefined | string; invoiceType?: undefined | string; trxClass?: undefined | string; year?: undefined | number; month?: undefined | number; customerId?: undefined | string; invoiceSource?: undefined | string } };
    output: { id: string; label: string; value: number }[];
  };
  invoiceTable: {
    input: { filters: { entity?: undefined | string; invoiceType?: undefined | string; trxClass?: undefined | string; year?: undefined | number; month?: undefined | number; customerId?: undefined | string; invoiceSource?: undefined | string } & { page?: undefined | number } };
    output: { rows: { account_no: null | string; customer_name: null | string; invoice_no: string; invoice_amount: null | number; trx_class: null | string; trx_date: null | string; line_no: string; line_type: null | string }[]; total_rows: number; page_size: number };
  };
  exportInvoiceTable: {
    input: { filters: { entity?: undefined | string; invoiceType?: undefined | string; trxClass?: undefined | string; year?: undefined | number; month?: undefined | number; customerId?: undefined | string; invoiceSource?: undefined | string } };
    output: { rows: { account_no: null | string; customer_name: null | string; invoice_no: string; invoice_amount: null | number; trx_class: null | string; trx_date: null | string; line_no: string; line_type: null | string }[]; truncated: boolean };
  };
};
