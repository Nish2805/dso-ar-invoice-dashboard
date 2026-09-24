import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { ConcentrationSlice } from '../types/dashboard'
import { theme } from '../theme'
import { formatCompactNumber } from '../format'

interface Props {
  data: ConcentrationSlice[]
}

const COLORS = [theme.sequential, theme.comparisonMuted]

export function ConcentrationDonut({ data }: Props) {
  return (
    <div
      className="flex h-full flex-col gap-3 rounded-2xl border p-5 backdrop-blur-xl shadow-sm"
      style={{ background: theme.glass, borderColor: theme.glassBorder }}
    >
      <h3 className="font-display text-sm font-semibold" style={{ color: theme.textPrimary }}>
        Customer Concentration
      </h3>
      <div className="min-h-[200px] flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius="55%"
              outerRadius="80%"
              paddingAngle={2}
              stroke="none"
            >
              {data.map((entry, i) => (
                <Cell key={entry.label} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, _name, item) => [
                `${formatCompactNumber(Number(value))} (${(item.payload as ConcentrationSlice).pct.toFixed(1)}%)`,
                (item.payload as ConcentrationSlice).label,
              ]}
              contentStyle={{
                background: 'rgba(255,255,255,0.97)',
                border: `1px solid ${theme.glassBorder}`,
                borderRadius: 10,
                fontSize: 12,
                color: theme.textPrimary,
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => <span style={{ color: theme.textSecondary, fontSize: 12 }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
