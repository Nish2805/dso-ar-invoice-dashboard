import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { getRayfinClient } from '@/lib/rayfin-client';
import { Z, formatCompact } from '@/theme';
import type { Filters } from './filters';

interface SourceRow {
  id: string;
  label: string;
  value: number;
}

interface InvoiceSourceChartProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
}

export function InvoiceSourceChart({ filters, onFilterChange }: InvoiceSourceChartProps) {
  const [rows, setRows] = useState<SourceRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const client = await getRayfinClient();
        const result = await client.functions.invoiceSourceAnalysis.invoke({ filters });

        if (!cancelled) setRows(result.slice(0, 12));
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
    return <p style={{ color: '#b91c1c' }}>Failed to load: {error}</p>;
  }

  if (!rows) {
    return <p>Loading invoice sources from the Lakehouse…</p>;
  }

  const height = Math.max(rows.length * 34, 120);
  const gradientId = 'bar-gradient-invoice-source';

  const handleClick = (row: SourceRow) => {
    onFilterChange({
      ...filters,
      invoiceSource: filters.invoiceSource === row.id ? undefined : row.id,
    });
  };

  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border p-5 backdrop-blur-xl shadow-sm"
      style={{ background: Z.glass, borderColor: Z.glassBorder }}
    >
      <h3 className="font-display text-sm font-semibold" style={{ color: Z.textPrimary }}>
        Invoice Source Analysis
      </h3>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 28 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={Z.accentViolet} />
                <stop offset="100%" stopColor={Z.sequential} />
              </linearGradient>
            </defs>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="label"
              width={140}
              tick={{ fontSize: 11, fill: Z.textSecondary }}
              tickFormatter={(e: string) => (e.length > 18 ? `${e.slice(0, 17)}…` : e)}
              axisLine={{ stroke: Z.gridline }}
              tickLine={false}
              interval={0}
            />
            <Tooltip
              cursor={{ fill: Z.sequentialSoft }}
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
            <Bar
              dataKey="value"
              radius={[0, 6, 6, 0]}
              barSize={14}
              cursor="pointer"
              onClick={(data) => handleClick((data as { payload: SourceRow }).payload)}
            >
              {rows.map((r) => (
                <Cell
                  key={r.label}
                  fill={`url(#${gradientId})`}
                  fillOpacity={
                    !filters.invoiceSource || filters.invoiceSource === r.id ? 1 : 0.3
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
