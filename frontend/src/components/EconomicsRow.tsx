import type { InvoiceEconomics } from '../types/dashboard'
import { theme } from '../theme'
import { formatCompactNumber } from '../format'

interface Props {
  economics: InvoiceEconomics
  currency: string
}

export function EconomicsRow({ economics, currency }: Props) {
  const stats = [
    { label: 'Median Invoice Value', value: `${currency} ${formatCompactNumber(economics.median_invoice_value)}` },
    { label: 'Invoices per Customer', value: economics.invoices_per_customer.toFixed(1) },
    { label: 'Amount per Customer', value: `${currency} ${formatCompactNumber(economics.amount_per_customer)}` },
  ]

  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border p-5 backdrop-blur-xl shadow-sm"
      style={{ background: theme.glass, borderColor: theme.glassBorder }}
    >
      <h3 className="font-display text-sm font-semibold" style={{ color: theme.textPrimary }}>
        Invoice Economics
      </h3>
      <div className="grid grid-cols-1 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="flex items-baseline justify-between">
            <span className="text-xs" style={{ color: theme.muted }}>
              {s.label}
            </span>
            <span className="tabular-nums text-sm font-semibold" style={{ color: theme.textPrimary }}>
              {s.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
