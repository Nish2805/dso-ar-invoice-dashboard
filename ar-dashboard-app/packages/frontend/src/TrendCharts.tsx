import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { getRayfinClient } from '@/lib/rayfin-client';
import { Z, formatCompact } from '@/theme';
import type { Filters } from './filters';

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

interface ChartPoint {
  month: string;
  monthNumber: number;
  current: number;
  previous: number;
}

interface TrendState {
  currentYear: number;
  previousYear: number;
  amount: ChartPoint[];
  volume: ChartPoint[];
}

function TrendCard({
  title,
  data,
  currentYear,
  previousYear,
  selectedMonth,
  onMonthClick,
}: {
  title: string;
  data: ChartPoint[];
  currentYear: number;
  previousYear: number;
  selectedMonth?: number;
  onMonthClick: (month: number) => void;
}) {
  const gradientId = `trend-gradient-${title.replace(/\s+/g, '-')}`;
  const dimmed = selectedMonth !== undefined;

  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border p-5 backdrop-blur-xl shadow-sm"
      style={{ background: Z.glass, borderColor: Z.glassBorder }}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold" style={{ color: Z.textPrimary }}>
          {title}
        </h3>
        <div className="flex items-center gap-3 text-[11px]" style={{ color: Z.textSecondary }}>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: Z.comparisonMuted }} />
            {previousYear}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: Z.sequential }} />
            {currentYear}
          </span>
        </div>
      </div>
      <div style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ left: -16, right: 8, top: 8 }}
            style={{ cursor: 'pointer' }}
            onClick={(state) => {
              const point = data.find((d) => d.month === state?.activeLabel);
              if (point) onMonthClick(point.monthNumber);
            }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={Z.sequential} stopOpacity={0.35} />
                <stop offset="100%" stopColor={Z.sequential} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={Z.gridline} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: Z.textSecondary }}
              axisLine={{ stroke: Z.gridline }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: Z.textSecondary }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => formatCompact(v)}
              width={48}
            />
            <Tooltip
              formatter={(value) => formatCompact(Number(value))}
              contentStyle={{
                background: 'rgba(255,255,255,0.97)',
                border: `1px solid ${Z.glassBorder}`,
                borderRadius: 10,
                fontSize: 12,
                color: Z.textPrimary,
              }}
              labelStyle={{ color: Z.textSecondary }}
            />
            <Line
              type="monotone"
              dataKey="previous"
              stroke={Z.comparisonMuted}
              strokeWidth={1.5}
              strokeDasharray="4 3"
              strokeOpacity={dimmed ? 0.35 : 1}
              dot={false}
              name={String(previousYear)}
            />
            <Area
              type="monotone"
              dataKey="current"
              stroke={Z.sequential}
              strokeWidth={2}
              strokeOpacity={dimmed ? 0.35 : 1}
              fillOpacity={dimmed ? 0.35 : 1}
              fill={`url(#${gradientId})`}
              dot={(props: { cx?: number; cy?: number; payload?: ChartPoint }) => {
                const { cx, cy, payload } = props;
                if (cx === undefined || cy === undefined || !payload) {
                  return <circle cx={0} cy={0} r={0} />;
                }
                const isSelected = selectedMonth === payload.monthNumber;
                return (
                  <circle
                    key={payload.monthNumber}
                    cx={cx}
                    cy={cy}
                    r={isSelected ? 6 : 3}
                    fill={Z.sequential}
                    fillOpacity={isSelected ? 1 : dimmed ? 0.35 : 1}
                    stroke={isSelected ? Z.navy : 'none'}
                    strokeWidth={isSelected ? 2 : 0}
                  />
                );
              }}
              name={String(currentYear)}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface TrendChartsProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
}

export function TrendCharts({ filters, onFilterChange }: TrendChartsProps) {
  const [trend, setTrend] = useState<TrendState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const client = await getRayfinClient();
        const result = await client.functions.monthlyTrend.invoke({ filters });

        if (!cancelled) {
          setTrend({
            currentYear: result.currentYear,
            previousYear: result.previousYear,
            amount: result.current.map((p, i) => ({
              month: MONTH_LABELS[i],
              monthNumber: i + 1,
              current: p.amount,
              previous: result.previous[i]?.amount ?? 0,
            })),
            volume: result.current.map((p, i) => ({
              month: MONTH_LABELS[i],
              monthNumber: i + 1,
              current: p.volume,
              previous: result.previous[i]?.volume ?? 0,
            })),
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filters]);

  if (error) {
    return <p style={{ color: '#b91c1c' }}>Failed to load trends: {error}</p>;
  }

  if (!trend) {
    return <p>Loading trend charts…</p>;
  }

  const handleMonthClick = (month: number) => {
    onFilterChange({ ...filters, month: filters.month === month ? undefined : month });
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <TrendCard
        title="Invoice Amount Trend"
        data={trend.amount}
        currentYear={trend.currentYear}
        previousYear={trend.previousYear}
        selectedMonth={filters.month}
        onMonthClick={handleMonthClick}
      />
      <TrendCard
        title="Invoice Volume Trend"
        data={trend.volume}
        currentYear={trend.currentYear}
        previousYear={trend.previousYear}
        selectedMonth={filters.month}
        onMonthClick={handleMonthClick}
      />
    </div>
  );
}
