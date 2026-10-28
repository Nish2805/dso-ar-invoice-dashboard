import { useEffect, useState } from 'react';

import { getRayfinClient } from '@/lib/rayfin-client';
import { Z } from '@/theme';
import type { Filters } from './filters';

export function KeyInsights({ filters }: { filters: Filters }) {
  const [insights, setInsights] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const client = await getRayfinClient();
        const result = await client.functions.keyInsights.invoke({ filters });
        if (!cancelled) setInsights(result);
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
    return <p style={{ color: '#b91c1c' }}>Failed to load insights: {error}</p>;
  }

  if (!insights) {
    return <p>Loading key insights…</p>;
  }

  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border p-5 backdrop-blur-xl shadow-sm"
      style={{ background: Z.glass, borderColor: Z.glassBorder }}
    >
      <h3 className="font-display text-sm font-semibold" style={{ color: Z.textPrimary }}>
        Key Insights
      </h3>
      <ul className="flex flex-col gap-2.5">
        {insights.length === 0 && (
          <li className="text-xs" style={{ color: Z.muted }}>
            No insights available for the current filters.
          </li>
        )}
        {insights.map((text, i) => (
          <li key={i} className="flex items-start gap-2 text-xs" style={{ color: Z.textSecondary }}>
            <span
              className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ background: Z.deltaGood }}
            >
              ✓
            </span>
            {text}
          </li>
        ))}
      </ul>
    </div>
  );
}
