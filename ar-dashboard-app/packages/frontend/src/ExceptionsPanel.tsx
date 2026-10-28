import { useEffect, useState } from 'react';

import { getRayfinClient } from '@/lib/rayfin-client';
import { Z, formatCompact } from '@/theme';
import type { Filters } from './filters';

interface Exceptions {
  highValueCount: number;
  highValueThreshold: number;
  lowValueCount: number;
  lowValueThreshold: number;
  peakSwingMonth: string | null;
  peakSwingPct: number | null;
  creditMemoTotal: number;
}

export function ExceptionsPanel({ filters }: { filters: Filters }) {
  const [data, setData] = useState<Exceptions | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const client = await getRayfinClient();
        const result = await client.functions.invoiceExceptions.invoke({ filters });

        if (!cancelled) {
          setData({
            highValueCount: result.high_value_count ?? 0,
            highValueThreshold: result.high_value_threshold ?? 0,
            lowValueCount: result.low_value_count ?? 0,
            lowValueThreshold: result.low_value_threshold ?? 0,
            peakSwingMonth: result.peak_swing_month,
            peakSwingPct: result.peak_swing_pct,
            creditMemoTotal: result.credit_memo_total ?? 0,
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
    return <p style={{ color: '#b91c1c' }}>Failed to load exceptions: {error}</p>;
  }

  if (!data) {
    return <p>Loading invoice exceptions…</p>;
  }

  const rows = [
    {
      icon: '▲',
      color: Z.statusWarning,
      label: 'High-value invoices',
      detail: `${data.highValueCount} above AED ${formatCompact(data.highValueThreshold)} (top 1%)`,
    },
    {
      icon: '▼',
      color: Z.statusWarning,
      label: 'Unusually low-value invoices',
      detail: `${data.lowValueCount} below AED ${formatCompact(data.lowValueThreshold)} (bottom 1%)`,
    },
    ...(data.peakSwingMonth
      ? [
          {
            icon: '!',
            color: Z.statusWarning,
            label: `${data.peakSwingMonth} swing`,
            detail: `${data.peakSwingPct?.toFixed(0)}% deviation from its monthly average`,
          },
        ]
      : []),
    {
      icon: '✕',
      color: Z.statusCritical,
      label: 'Credit memo total',
      detail: `AED ${formatCompact(data.creditMemoTotal)}`,
    },
  ];

  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border p-5 backdrop-blur-xl shadow-sm"
      style={{ background: Z.glass, borderColor: Z.glassBorder }}
    >
      <h3 className="font-display text-sm font-semibold" style={{ color: Z.textPrimary }}>
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
              <span className="font-medium" style={{ color: Z.textPrimary }}>
                {r.label}
              </span>
              <br />
              <span style={{ color: Z.textSecondary }}>{r.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
