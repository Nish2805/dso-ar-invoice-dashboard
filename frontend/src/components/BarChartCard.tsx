import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ChartPoint } from '../types/dashboard'
import { theme } from '../theme'
import { formatCompactNumber } from '../format'

interface Props {
  title: string
  data: ChartPoint[]
  maxItems?: number
  selectedLabel?: string
  onSelect?: (label: string) => void
}

export function BarChartCard({ title, data, maxItems = 10, selectedLabel, onSelect }: Props) {
  const rows = data.slice(0, maxItems)
  const height = Math.max(rows.length * 34, 120)
  const gradientId = `bar-gradient-${title.replace(/\s+/g, '-')}`
  const hasSelection = Boolean(selectedLabel)

  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border p-5 backdrop-blur-xl shadow-sm"
      style={{ background: theme.glass, borderColor: theme.glassBorder }}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold" style={{ color: theme.textPrimary }}>
          {title}
        </h3>
        {hasSelection && (
          <button
            className="text-[11px] font-medium underline decoration-dotted"
            style={{ color: theme.sequential }}
            onClick={() => onSelect?.(selectedLabel!)}
          >
            Clear
          </button>
        )}
      </div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 28 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={theme.accentViolet} />
                <stop offset="100%" stopColor={theme.sequential} />
              </linearGradient>
            </defs>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="label"
              width={140}
              tick={{ fontSize: 11, fill: theme.textSecondary }}
              tickFormatter={(label: string) => (label.length > 18 ? `${label.slice(0, 17)}…` : label)}
              axisLine={{ stroke: theme.gridline }}
              tickLine={false}
              interval={0}
            />
            <Tooltip
              cursor={{ fill: theme.sequentialSoft }}
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
            <Bar
              dataKey="value"
              radius={[0, 6, 6, 0]}
              barSize={14}
              onClick={(point) => onSelect?.(String((point as unknown as ChartPoint).label))}
              style={{ cursor: onSelect ? 'pointer' : 'default' }}
            >
              {rows.map((row) => (
                <Cell
                  key={row.label}
                  fill={`url(#${gradientId})`}
                  fillOpacity={!hasSelection || row.label === selectedLabel ? 1 : 0.3}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
