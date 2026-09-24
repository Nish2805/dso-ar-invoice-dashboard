import type { ExceptionStats } from '../types/dashboard'
import { theme } from '../theme'
import { formatCompactNumber } from '../format'

interface Props {
  exceptions: ExceptionStats
  currency: string
}

export function ExceptionsPanel({ exceptions, currency }: Props) {
  const rows = [
    {
      icon: '▲',
      color: theme.statusWarning,
      label: 'High-value invoices',
      detail: `${exceptions.high_value_count} above ${currency} ${formatCompactNumber(exceptions.high_value_threshold)} (top 1%)`,
    },
    {
      icon: '▼',
      color: theme.statusWarning,
      label: 'Unusually low-value invoices',
      detail: `${exceptions.low_value_count} below ${currency} ${formatCompactNumber(exceptions.low_value_threshold)} (bottom 1%)`,
    },
    ...(exceptions.peak_swing_month
      ? [
          {
            icon: '!',
            color: theme.statusWarning,
            label: `${exceptions.peak_swing_month} swing`,
            detail: `${exceptions.peak_swing_pct?.toFixed(0)}% deviation from its monthly average`,
          },
        ]
      : []),
    {
      icon: '✕',
      color: theme.statusCritical,
      label: 'Credit memo total',
      detail: `${currency} ${formatCompactNumber(exceptions.credit_memo_total)}`,
    },
  ]

  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border p-5 backdrop-blur-xl shadow-sm"
      style={{ background: theme.glass, borderColor: theme.glassBorder }}
    >
      <h3 className="font-display text-sm font-semibold" style={{ color: theme.textPrimary }}>
        Invoice Exceptions
      </h3>
      <ul className="flex flex-col gap-3">
        {rows.map((r) => (
          <li key={r.label} className="flex items-start gap-2.5 text-xs">
            <span
              className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
              style={{ background: `${r.color}26`, color: r.color }}
            >
              {r.icon}
            </span>
            <span>
              <span className="font-medium" style={{ color: theme.textPrimary }}>
                {r.label}
              </span>
              <br />
              <span style={{ color: theme.textSecondary }}>{r.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
