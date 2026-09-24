import { useState } from 'react'
import { useDashboard, useFilters, useInvoices } from './api/client'
import { BarChartCard } from './components/BarChartCard'
import { ConcentrationDonut } from './components/ConcentrationDonut'
import { EconomicsRow } from './components/EconomicsRow'
import { ExceptionsPanel } from './components/ExceptionsPanel'
import { FilterBar } from './components/FilterBar'
import { InvoiceTable } from './components/InvoiceTable'
import { KeyInsights } from './components/KeyInsights'
import { KpiTile } from './components/KpiTile'
import { RecentInvoices } from './components/RecentInvoices'
import { Sidebar } from './components/Sidebar'
import { CornerFacets } from './components/CornerFacets'
import { TrendChart } from './components/TrendChart'
import type { Filters } from './types/dashboard'
import { theme } from './theme'
import { formatCompactNumber } from './format'

function App() {
  const [filters, setFilters] = useState<Filters>({})
  const [page, setPage] = useState(1)

  const { data: filterOptions } = useFilters()
  const { data: dashboard, isLoading: dashboardLoading } = useDashboard(filters)
  const { data: invoices } = useInvoices(filters, page)

  function handleFiltersChange(next: Filters) {
    setFilters(next)
    setPage(1)
  }

  function toggleFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    const next = { ...filters }
    if (next[key] === value) {
      delete next[key]
    } else {
      next[key] = value
    }
    handleFiltersChange(next)
  }

  function scrollToTable() {
    document.getElementById('invoice-table')?.scrollIntoView({ behavior: 'smooth' })
  }

  const currency = dashboard?.currency ?? 'AED'

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{
        background: `radial-gradient(ellipse at top left, ${theme.pageVia} 0%, ${theme.pageFrom} 45%, ${theme.pageTo} 100%)`,
      }}
    >
      <CornerFacets />

      <div className="relative flex min-h-screen">
        <Sidebar />
        <main className="flex flex-1 flex-col gap-5 p-6">
          <div>
            <div className="flex items-baseline gap-3">
              <span
                className="font-display text-sm font-extrabold tracking-widest"
                style={{ color: theme.navy }}
              >
                D<span style={{ color: theme.teal }}>|</span>EZ
              </span>
              <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: theme.textPrimary }}>
                AR Invoice Analysis
              </h1>
            </div>
            <p className="text-xs" style={{ color: theme.muted }}>Dubai Silicon Oasis</p>
            <div className="mt-3 h-px w-full" style={{ background: theme.gridline }} />
          </div>

          <FilterBar options={filterOptions} filters={filters} onChange={handleFiltersChange} />

          {dashboardLoading || !dashboard ? (
            <div className="p-8 text-center text-sm" style={{ color: theme.textSecondary }}>
              Loading…
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                <KpiTile
                  label="Invoice Amount"
                  value={dashboard.kpis.invoice_amount_total}
                  glyph="$"
                  prefix={currency}
                  badge={
                    dashboard.kpis.yoy_growth_pct != null
                      ? {
                          text: `${dashboard.kpis.yoy_growth_pct >= 0 ? '+' : ''}${dashboard.kpis.yoy_growth_pct.toFixed(1)}% YoY`,
                          positive: dashboard.kpis.yoy_growth_pct >= 0,
                        }
                      : undefined
                  }
                />
                <KpiTile label="Invoices" value={dashboard.kpis.invoice_count} glyph="#" />
                <KpiTile
                  label="Avg Invoice Value"
                  value={dashboard.kpis.avg_invoice_value}
                  glyph="Ø"
                  prefix={currency}
                />
                <KpiTile
                  label="Largest Invoice"
                  value={dashboard.kpis.largest_invoice}
                  glyph="▲"
                  prefix={currency}
                />
                <KpiTile
                  label="Smallest Invoice"
                  value={dashboard.kpis.smallest_invoice}
                  glyph="▽"
                  prefix={currency}
                />
                <KpiTile
                  label="Credit Memos"
                  value={dashboard.exceptions.credit_memo_total}
                  glyph="↩"
                  prefix={currency}
                />
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <TrendChart
                  title="Invoice Amount Trend"
                  data={dashboard.monthly_trend}
                  currentYearLabel={dashboard.kpis.yoy_current_year}
                  previousYearLabel={dashboard.kpis.yoy_previous_year}
                  gradientId="amount-trend"
                  selectedMonth={filters.month}
                  onMonthClick={(m) => toggleFilter('month', m)}
                />
                <TrendChart
                  title="Invoice Volume Trend"
                  data={dashboard.invoice_volume_trend}
                  currentYearLabel={dashboard.kpis.yoy_current_year}
                  previousYearLabel={dashboard.kpis.yoy_previous_year}
                  gradientId="volume-trend"
                  selectedMonth={filters.month}
                  onMonthClick={(m) => toggleFilter('month', m)}
                />
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <BarChartCard
                  title="Invoice Type Contribution"
                  data={dashboard.invoice_type_contribution}
                  selectedLabel={filters.invoice_type}
                  onSelect={(label) => toggleFilter('invoice_type', label)}
                />
                <BarChartCard
                  title="Top 10 Customers"
                  data={dashboard.top_customers}
                  selectedLabel={filters.customer_name}
                  onSelect={(label) => toggleFilter('customer_name', label)}
                />
                <ConcentrationDonut data={dashboard.customer_concentration} />
              </div>

              <BarChartCard
                title="Invoice Source Analysis"
                data={dashboard.invoice_source_analysis}
                maxItems={12}
                selectedLabel={filters.invoice_source}
                onSelect={(label) => toggleFilter('invoice_source', label)}
              />

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
                <KeyInsights insights={dashboard.key_insights} />
                <ExceptionsPanel exceptions={dashboard.exceptions} currency={currency} />
                <EconomicsRow economics={dashboard.economics} currency={currency} />
                <RecentInvoices rows={dashboard.recent_invoices} onViewAll={scrollToTable} />
              </div>

              <InvoiceTable data={invoices} page={page} onPageChange={setPage} />

              <footer className="pb-2 text-center text-[11px]" style={{ color: theme.muted }}>
                Last Refresh: {new Date(dashboard.loaded_at).toLocaleString()} · Currency: {dashboard.currency}
                {dashboard.fiscal_year ? ` · FY${dashboard.fiscal_year}` : ''} · Total shown:{' '}
                {currency} {formatCompactNumber(dashboard.kpis.invoice_amount_total)}
              </footer>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
