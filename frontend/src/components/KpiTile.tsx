import { theme } from '../theme'
import { useCountUp } from '../useCountUp'
import { formatCompactNumber } from '../format'

interface Props {
  label: string
  value: number
  glyph: string
  prefix?: string
  badge?: { text: string; positive: boolean }
}

export function KpiTile({ label, value, glyph, prefix, badge }: Props) {
  const animated = useCountUp(value)

  return (
    <div
      className="relative flex items-center gap-3 overflow-hidden rounded-2xl border p-4 backdrop-blur-xl shadow-sm"
      style={{ background: theme.glass, borderColor: theme.glassBorder }}
    >
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full blur-2xl"
        style={{ background: theme.gradientGlow }}
      />
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-bold text-white"
        style={{ background: theme.gradientPrimary, boxShadow: '0 0 16px rgba(57,135,229,0.4)' }}
      >
        {glyph}
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-[11px] font-medium uppercase tracking-wide" style={{ color: theme.muted }}>
          {label}
        </span>
        <span className="flex items-baseline gap-1.5">
          <span className="tabular-nums font-display text-xl font-bold" style={{ color: theme.textPrimary }}>
            {prefix ? `${prefix} ` : ''}
            {formatCompactNumber(animated)}
          </span>
          {badge && (
            <span
              className="text-[10px] font-semibold"
              style={{ color: badge.positive ? theme.deltaGood : theme.statusCritical }}
            >
              {badge.text}
            </span>
          )}
        </span>
      </div>
    </div>
  )
}
