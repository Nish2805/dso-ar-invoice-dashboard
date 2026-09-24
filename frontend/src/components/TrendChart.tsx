import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TrendPoint } from '../types/dashboard'
import { theme } from '../theme'
import { formatCompactNumber } from '../format'

interface Props {
  title: string
  data: TrendPoint[]
  currentYearLabel: number | null
  previousYearLabel: number | null
  gradientId: string
  selectedMonth?: string
  onMonthClick?: (month: string) => void
}

export function TrendChart({
  title,
  data,
  currentYearLabel,
  previousYearLabel,
  gradientId,
  selectedMonth,
  onMonthClick,
}: Props) {
  // Trailing zero months usually mean "no data yet" (a partial current year),
  // not "activity actually dropped to zero" — stop the current-year line there
  // instead of drawing a misleading flat-zero tail. Leading/interior zeros are
  // left as real values.
  const lastRealIdx = (() => {
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i].current !== 0) return i
    }
    return data.length - 1
  })()
  const points = data.map((d, i) => ({
    ...d,
    short: d.label.slice(0, 3),
    current: i <= lastRealIdx ? d.current : null,
  }))
  const hasPrevious = previousYearLabel !== null

  return (
    <div
      className="flex h-full flex-col gap-3 rounded-2xl border p-5 backdrop-blur-xl shadow-sm"
      style={{ background: theme.glass, borderColor: theme.glassBorder }}
    >
      <h3 className="font-display text-sm font-semibold" style={{ color: theme.textPrimary }}>
        {title}
      </h3>
      <div className="min-h-[200px] flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={points}
            margin={{ top: 8, right: 8 }}
            onClick={(e) => {
              const label = e?.activeLabel as string | undefined
              const full = points.find((p) => p.short === label)?.label
              if (full && onMonthClick) onMonthClick(full)
            }}
            style={{ cursor: onMonthClick ? 'pointer' : 'default' }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={theme.sequential} stopOpacity={0.5} />
                <stop offset="100%" stopColor={theme.sequential} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={theme.gridline} />
            <XAxis
              dataKey="short"
              tick={{ fontSize: 11, fill: theme.textSecondary }}
              axisLine={{ stroke: theme.baseline }}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip
              formatter={(value) => formatCompactNumber(Number(value))}
              contentStyle={{
                background: 'rgba(255,255,255,0.97)',
                border: `1px solid ${theme.glassBorder}`,
                borderRadius: 10,
                fontSize: 12,
                color: theme.textPrimary,
              }}
              labelStyle={{ color: theme.textSecondary }}
            />
            {hasPrevious && (
              <Legend
                verticalAlign="top"
                height={24}
                wrapperStyle={{ fontSize: 11, color: theme.textSecondary }}
              />
            )}
            {hasPrevious && (
              <Area
                type="monotone"
                dataKey="previous"
                name={`${previousYearLabel}`}
                stroke={theme.comparisonMuted}
                strokeWidth={1.5}
                strokeDasharray="4 3"
                fill="none"
                dot={false}
                activeDot={false}
              />
            )}
            <Area
              type="monotone"
              dataKey="current"
              name={currentYearLabel ? `${currentYearLabel}` : 'Value'}
              stroke={theme.sequential}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={(props: { cx?: number; cy?: number; payload?: { label: string } }) => {
                const { cx, cy, payload } = props
                const isSelected = payload && selectedMonth === payload.label
                return (
                  <circle
                    key={`dot-${payload?.label}`}
                    cx={cx}
                    cy={cy}
                    r={isSelected ? 5 : 3}
                    fill={theme.sequential}
                    stroke={isSelected ? '#fff' : 'none'}
                    strokeWidth={2}
                  />
                )
              }}
              activeDot={{ r: 5, fill: theme.sequential, stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
