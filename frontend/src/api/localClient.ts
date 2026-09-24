// Drop-in replacement for api/client.ts's hooks, backed by the embedded sample
// dataset and client-side aggregations instead of network calls. Used only by
// the offline demo build (DemoApp.tsx) — same hook names/shapes as the real app,
// so every existing UI component works unchanged.
import { useQuery } from '@tanstack/react-query'
import { SAMPLE_ROWS } from '../sampleData'
import type { DashboardResponse, Filters, FilterOptions, PaginatedInvoices } from '../types/dashboard'
import * as agg from './localAggregations'

const LOADED_AT = new Date().toISOString()
const CURRENCY = 'AED'

export function useFilters() {
  return useQuery({
    queryKey: ['local-filters'],
    queryFn: async (): Promise<FilterOptions> => {
      const entities = [...new Set(SAMPLE_ROWS.map((r) => r.entity))].sort()
      const invoiceTypes = [...new Set(SAMPLE_ROWS.map((r) => r.invoiceType))].sort()
      const trxClasses = [...new Set(SAMPLE_ROWS.map((r) => r.trxClass))].sort()
      const years = [...new Set(SAMPLE_ROWS.map((r) => Number(r.trxDate.slice(0, 4))))].sort()
      const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
      ]
      return { entities, invoice_types: invoiceTypes, trx_classes: trxClasses, years, months }
    },
  })
}

export function useDashboard(filters: Filters) {
  return useQuery({
    queryKey: ['local-dashboard', filters],
    queryFn: async (): Promise<DashboardResponse> => {
      const filtered = agg.filterRows(SAMPLE_ROWS, filters)
      const kpis = agg.computeKpis(filtered)
      const concentration = agg.customerConcentration(filtered)
      return {
        kpis,
        invoice_type_contribution: agg.invoiceTypeContribution(filtered),
        top_customers: agg.topCustomers(filtered),
        monthly_trend: agg.monthlyTrend(filtered),
        invoice_volume_trend: agg.invoiceVolumeTrend(filtered),
        invoice_source_analysis: agg.invoiceSourceAnalysis(filtered),
        customer_concentration: concentration,
        economics: agg.invoiceEconomics(filtered),
        key_insights: agg.keyInsights(filtered, kpis, concentration),
        exceptions: agg.invoiceExceptions(filtered),
        recent_invoices: agg.recentInvoices(filtered),
        loaded_at: LOADED_AT,
        currency: CURRENCY,
        fiscal_year: kpis.yoy_current_year,
      }
    },
    placeholderData: (prev) => prev,
  })
}

export function useInvoices(filters: Filters, page: number, pageSize = 50) {
  return useQuery({
    queryKey: ['local-invoices', filters, page, pageSize],
    queryFn: async (): Promise<PaginatedInvoices> => {
      const filtered = agg.filterRows(SAMPLE_ROWS, filters)
      return agg.paginateInvoices(filtered, page, pageSize)
    },
    placeholderData: (prev) => prev,
  })
}
