import { useEffect, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import { getRayfinClient } from '@/lib/rayfin-client';
import { Z, formatCompact } from '@/theme';
import type { Filters } from './filters';

interface Slice {
  label: string;
  value: number;
  pct: number;
}

const COLORS = [Z.sequential, Z.baseline];

export function ConcentrationDonut({ filters }: { filters: Filters }) {
  const [slices, setSlices] = useState<Slice[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const client = await getRayfinClient();
        const result = await client.functions.customerConcentration.invoke({ filters });
        if (!cancelled) setSlices(result);
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

  if (!slices) {
    return <p>Loading customer concentration…</p>;
  }

  const top10Pct = slices.find((s) => s.label === 'Top 10 Customers')?.pct ?? 0;

  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border p-5 backdrop-blur-xl shadow-sm"
      style={{ background: Z.glass, borderColor: Z.glassBorder }}
    >
      <h3 className="font-display text-sm font-semibold" style={{ color: Z.textPrimary }}>
        Customer Concentration
      </h3>
      <div className="relative" style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="label"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              stroke="none"
            >
              {slices.map((s, i) => (
                <Cell key={s.label} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, _name, item) => [
                `${formatCompact(Number(value))} (${item.payload.pct.toFixed(1)}%)`,
                item.payload.label,
              ]}
              contentStyle={{
                background: 'rgba(255,255,255,0.97)',
                border: `1px solid ${Z.glassBorder}`,
                borderRadius: 10,
                fontSize: 12,
                color: Z.textPrimary,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
          style={{ color: Z.textPrimary }}
        >
          <span className="font-display text-2xl font-bold">{top10Pct.toFixed(0)}%</span>
          <span className="text-[10px] uppercase tracking-wide" style={{ color: Z.muted }}>
            Top 10
          </span>
        </div>
      </div>
      <div className="flex justify-center gap-5 text-xs" style={{ color: Z.textSecondary }}>
        {slices.map((s, i) => (
          <span key={s.label} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: COLORS[i % COLORS.length] }}
            />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
