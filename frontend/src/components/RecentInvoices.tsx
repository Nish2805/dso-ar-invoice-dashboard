import type { InvoiceRow } from '../types/dashboard'
import { theme } from '../theme'

interface Props {
  rows: InvoiceRow[]
  onViewAll: () => void
}

export function RecentInvoices({ rows, onViewAll }: Props) {
  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border p-5 backdrop-blur-xl shadow-sm"
      style={{ background: theme.glass, borderColor: theme.glassBorder }}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold" style={{ color: theme.textPrimary }}>
          Recent Invoices
        </h3>
        <button
          className="text-[11px] font-medium"
          style={{ color: theme.sequential }}
          onClick={onViewAll}
        >
          View All ↓
        </button>
      </div>
      <ul className="flex flex-col divide-y" style={{ borderColor: theme.gridline }}>
        {rows.map((row, i) => (
          <li
            key={`${row.invoice_no}-${i}`}
            className="flex items-center justify-between gap-3 py-2 text-xs"
            style={{ borderColor: theme.gridline }}
          >
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium" style={{ color: theme.textPrimary }}>
                {row.customer_name ?? '—'}
              </div>
              <div style={{ color: theme.muted }}>
                {row.invoice_no} · {row.trx_date}
              </div>
            </div>
            <span className="tabular-nums shrink-0 font-semibold" style={{ color: theme.textSecondary }}>
              {row.invoice_amount != null ? row.invoice_amount.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
