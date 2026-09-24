// Client-side port of backend/app/aggregations.py — same logic, operating on an
// in-memory array instead of a pandas DataFrame. Used only by the offline demo
// build (localClient.ts) so the standalone HTML file needs no server at all.
import type { SampleRow } from '../sampleData'
import type {
  ChartPoint,
  ConcentrationSlice,
  ExceptionStats,
  Filters,
  InvoiceEconomics,
  InvoiceRow,
  Kpis,
  TrendPoint,
} from '../types/dashboard'

const MONTH_ORDER = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function monthName(dateStr: string): string {
  return MONTH_ORDER[Number(dateStr.slice(5, 7)) - 1]
}
function yearOf(dateStr: string): number {
  return Number(dateStr.slice(0, 4))
}
function monthNumOf(dateStr: string): number {
  return Number(dateStr.slice(5, 7))
}

export function filterRows(rows: SampleRow[], filters: Filters): SampleRow[] {
  return rows.filter((r) => {
    if (filters.entity && r.entity !== filters.entity) return false
    if (filters.invoice_type && r.invoiceType !== filters.invoice_type) return false
    if (filters.trx_class && r.trxClass !== filters.trx_class) return false
    if (filters.year && yearOf(r.trxDate) !== filters.year) return false
    if (filters.month && monthName(r.trxDate) !== filters.month) return false
    if (filters.customer_name && r.customerName !== filters.customer_name) return false
    if (filters.invoice_source && r.invoiceSource !== filters.invoice_source) return false
    return true
  })
}

function groupSum(rows: SampleRow[], keyFn: (r: SampleRow) => string, topN?: number): ChartPoint[] {
  const totals = new Map<string, number>()
  for (const r of rows) {
    totals.set(keyFn(r), (totals.get(keyFn(r)) ?? 0) + r.invoiceAmount)
  }
  let points = [...totals.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
  if (topN != null) points = points.slice(0, topN)
  return points
}

function invoiceTotals(rows: SampleRow[]): Map<string, number> {
  const totals = new Map<string, number>()
  for (const r of rows) {
    totals.set(r.invoiceNo, (totals.get(r.invoiceNo) ?? 0) + r.invoiceAmount)
  }
  return totals
}

function latestTwoYears(rows: SampleRow[]): [number | null, number | null] {
  const years = [...new Set(rows.map((r) => yearOf(r.trxDate)))].sort((a, b) => a - b)
  if (years.length === 0) return [null, null]
  const latest = years[years.length - 1]
  const previous = years.includes(latest - 1) ? latest - 1 : null
  return [latest, previous]
}

export function computeKpis(rows: SampleRow[]): Kpis {
  if (rows.length === 0) {
    return {
      invoice_amount_total: 0, invoice_count: 0, avg_invoice_value: 0,
      largest_invoice: 0, smallest_invoice: 0, yoy_growth_pct: null,
      yoy_current_year: null, yoy_previous_year: null,
    }
  }
  const total = rows.reduce((s, r) => s + r.invoiceAmount, 0)
  const totals = invoiceTotals(rows)
  const values = [...totals.values()]
  const count = totals.size

  let [latestYear, previousYear] = latestTwoYears(rows)
  let yoyGrowthPct: number | null = null

  if (latestYear != null && previousYear != null) {
    const monthsInLatest = new Set(
      rows.filter((r) => yearOf(r.trxDate) === latestYear).map((r) => monthNumOf(r.trxDate))
    )
    const currentSlice = rows.filter((r) => yearOf(r.trxDate) === latestYear)
    const previousSlice = rows.filter(
      (r) => yearOf(r.trxDate) === previousYear && monthsInLatest.has(monthNumOf(r.trxDate))
    )
    const currentTotal = currentSlice.reduce((s, r) => s + r.invoiceAmount, 0)
    const previousTotal = previousSlice.reduce((s, r) => s + r.invoiceAmount, 0)
    const currentCount = new Set(currentSlice.map((r) => r.invoiceNo)).size
    const previousCount = new Set(previousSlice.map((r) => r.invoiceNo)).size

    const comparable = previousCount >= Math.max(30, currentCount * 0.2)
    if (previousTotal && comparable) {
      yoyGrowthPct = ((currentTotal - previousTotal) / Math.abs(previousTotal)) * 100
    } else {
      previousYear = null
    }
  }

  return {
    invoice_amount_total: total,
    invoice_count: count,
    avg_invoice_value: count ? total / count : 0,
    largest_invoice: values.length ? Math.max(...values) : 0,
    smallest_invoice: values.length ? Math.min(...values) : 0,
    yoy_growth_pct: yoyGrowthPct,
    yoy_current_year: latestYear,
    yoy_previous_year: previousYear,
  }
}

export const invoiceTypeContribution = (rows: SampleRow[]) => groupSum(rows, (r) => r.invoiceType)
export const topCustomers = (rows: SampleRow[], n = 10) => groupSum(rows, (r) => r.customerName, n)
export const invoiceSourceAnalysis = (rows: SampleRow[]) => groupSum(rows, (r) => r.invoiceSource)

function yoyMonthlySeries(rows: SampleRow[], valueFn: (rows: SampleRow[]) => Map<string, number>): TrendPoint[] {
  const [latestYear, previousYear] = latestTwoYears(rows)
  const current = latestYear != null ? valueFn(rows.filter((r) => yearOf(r.trxDate) === latestYear)) : new Map()
  const previous = previousYear != null ? valueFn(rows.filter((r) => yearOf(r.trxDate) === previousYear)) : new Map()
  return MONTH_ORDER.map((month) => ({
    label: month,
    current: current.get(month) ?? 0,
    previous: previous.get(month) ?? 0,
  }))
}

export function monthlyTrend(rows: SampleRow[]): TrendPoint[] {
  return yoyMonthlySeries(rows, (sub) => {
    const m = new Map<string, number>()
    for (const r of sub) m.set(monthName(r.trxDate), (m.get(monthName(r.trxDate)) ?? 0) + r.invoiceAmount)
    return m
  })
}

export function invoiceVolumeTrend(rows: SampleRow[]): TrendPoint[] {
  return yoyMonthlySeries(rows, (sub) => {
    const byMonth = new Map<string, Set<string>>()
    for (const r of sub) {
      const key = monthName(r.trxDate)
      if (!byMonth.has(key)) byMonth.set(key, new Set())
      byMonth.get(key)!.add(r.invoiceNo)
    }
    const m = new Map<string, number>()
    for (const [k, v] of byMonth) m.set(k, v.size)
    return m
  })
}

export function customerConcentration(rows: SampleRow[], topN = 10): ConcentrationSlice[] {
  const byCustomer = new Map<string, number>()
  for (const r of rows) byCustomer.set(r.customerName, (byCustomer.get(r.customerName) ?? 0) + r.invoiceAmount)
  const total = [...byCustomer.values()].reduce((a, b) => a + b, 0)
  if (!total) return []
  const topTotal = [...byCustomer.values()].sort((a, b) => b - a).slice(0, topN).reduce((a, b) => a + b, 0)
  const restTotal = total - topTotal
  return [
    { label: `Top ${topN} Customers`, value: topTotal, pct: (topTotal / total) * 100 },
    { label: 'Other Customers', value: restTotal, pct: (restTotal / total) * 100 },
  ]
}

export function invoiceEconomics(rows: SampleRow[]): InvoiceEconomics {
  const totals = [...invoiceTotals(rows).values()].sort((a, b) => a - b)
  const nCustomers = new Set(rows.map((r) => r.customerName)).size
  const nInvoices = totals.length
  const totalAmount = totals.reduce((a, b) => a + b, 0)
  const median = totals.length
    ? totals.length % 2 === 1
      ? totals[(totals.length - 1) / 2]
      : (totals[totals.length / 2 - 1] + totals[totals.length / 2]) / 2
    : 0
  return {
    median_invoice_value: median,
    invoices_per_customer: nCustomers ? nInvoices / nCustomers : 0,
    amount_per_customer: nCustomers ? totalAmount / nCustomers : 0,
  }
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0
  const pos = (sorted.length - 1) * q
  const base = Math.floor(pos)
  const rest = pos - base
  return sorted[base + 1] !== undefined ? sorted[base] + rest * (sorted[base + 1] - sorted[base]) : sorted[base]
}

export function invoiceExceptions(rows: SampleRow[]): ExceptionStats {
  const totals = [...invoiceTotals(rows).values()]
  const positive = totals.filter((v) => v > 0).sort((a, b) => a - b)

  const highThreshold = quantile(positive, 0.99)
  const lowThreshold = quantile(positive, 0.01)
  const highCount = positive.filter((v) => v > highThreshold).length
  const lowCount = positive.filter((v) => v > 0 && v < lowThreshold).length

  let peakMonth: string | null = null
  let peakPct: number | null = null
  const [latestYear] = latestTwoYears(rows)
  if (latestYear != null) {
    const monthly = new Map<string, number>()
    for (const r of rows.filter((r) => yearOf(r.trxDate) === latestYear)) {
      monthly.set(monthName(r.trxDate), (monthly.get(monthName(r.trxDate)) ?? 0) + r.invoiceAmount)
    }
    const values = [...monthly.values()]
    const mean = values.reduce((a, b) => a + b, 0) / (values.length || 1)
    if (values.length && mean) {
      let maxSwing = -Infinity
      for (const [month, v] of monthly) {
        const swing = Math.abs(((v - mean) / Math.abs(mean)) * 100)
        if (swing > maxSwing) {
          maxSwing = swing
          peakMonth = month
        }
      }
      peakPct = maxSwing
    }
  }

  const creditMemoTotal = rows.filter((r) => r.trxClass === 'CM').reduce((s, r) => s + r.invoiceAmount, 0)

  return {
    high_value_count: highCount,
    high_value_threshold: highThreshold,
    low_value_count: lowCount,
    low_value_threshold: lowThreshold,
    peak_swing_month: peakMonth,
    peak_swing_pct: peakPct,
    credit_memo_total: creditMemoTotal,
  }
}

export function keyInsights(rows: SampleRow[], kpis: Kpis, concentration: ConcentrationSlice[]): string[] {
  const insights: string[] = []

  if (kpis.yoy_growth_pct != null) {
    const direction = kpis.yoy_growth_pct >= 0 ? 'increased' : 'decreased'
    insights.push(
      `Invoice value ${direction} ${Math.abs(kpis.yoy_growth_pct).toFixed(1)}% year-over-year ` +
        `(${kpis.yoy_previous_year} → ${kpis.yoy_current_year}).`
    )
  }

  const [latestYear] = latestTwoYears(rows)
  if (latestYear != null) {
    const monthly = new Map<string, number>()
    for (const r of rows.filter((r) => yearOf(r.trxDate) === latestYear)) {
      monthly.set(monthName(r.trxDate), (monthly.get(monthName(r.trxDate)) ?? 0) + r.invoiceAmount)
    }
    const entries = [...monthly.entries()]
    if (entries.length) {
      const mean = entries.reduce((s, [, v]) => s + v, 0) / entries.length
      if (mean) {
        const [peakMonth, peakValue] = entries.reduce((a, b) => (b[1] > a[1] ? b : a))
        const pctAboveAvg = ((peakValue - mean) / Math.abs(mean)) * 100
        insights.push(`${peakMonth} ${latestYear} generated the highest invoice value, ${pctAboveAvg.toFixed(0)}% above the monthly average.`)
      }
    }
  }

  if (concentration.length) {
    const top = concentration[0]
    insights.push(`${top.label} represent ${top.pct.toFixed(0)}% of total billing.`)
  }

  const types = invoiceTypeContribution(rows)
  if (types.length) {
    const leader = types[0]
    const share = kpis.invoice_amount_total ? (leader.value / kpis.invoice_amount_total) * 100 : 0
    insights.push(`"${leader.label}" is the largest invoice type, contributing ${share.toFixed(0)}% of total value.`)
  }

  return insights
}

function toInvoiceRow(r: SampleRow): InvoiceRow {
  return {
    account_no: r.accountNo,
    customer_name: r.customerName,
    invoice_no: r.invoiceNo,
    invoice_amount: r.lineType === 'TAX' ? null : r.invoiceAmount,
    trx_class: r.trxClass,
    trx_date: r.trxDate,
    line_no: r.lineNo,
    line_type: r.lineType,
  }
}

export function recentInvoices(rows: SampleRow[], n = 5): InvoiceRow[] {
  return [...rows]
    .sort((a, b) => (a.trxDate < b.trxDate ? 1 : -1))
    .slice(0, n)
    .map(toInvoiceRow)
}

export function paginateInvoices(rows: SampleRow[], page: number, pageSize: number) {
  const totalAmount = rows.reduce((s, r) => s + r.invoiceAmount, 0)
  const start = (page - 1) * pageSize
  const pageRows = rows.slice(start, start + pageSize).map(toInvoiceRow)
  return { rows: pageRows, total_rows: rows.length, total_amount: totalAmount, page, page_size: pageSize }
}
