import { useEffect, useState } from 'react';

import { getRayfinClient } from '@/lib/rayfin-client';
import { Z, formatCompact } from '@/theme';
import type { Filters } from './filters';

interface InvoiceRow {
  customerName: string;
  trxNumber: string;
  trxDate: string | null;
  amount: number;
}

export function RecentInvoices({ filters }: { filters: Filters }) {
  const [rows, setRows] = useState<InvoiceRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const client = await getRayfinClient();
        const result = await client.functions.recentInvoices.invoke({ filters });

        if (!cancelled) {
          setRows(
            result.map((r) => ({
              customerName: r.customer_name ?? 'Unknown',
              trxNumber: r.trx_number,
              trxDate: r.trx_date,
              amount: r.amount ?? 0,
            }))
          );
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
    return <p style={{ color: '#b91c1c' }}>Failed to load recent invoices: {error}</p>;
  }

  if (!rows) {
    return <p>Loading recent invoices…</p>;
  }

  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border p-5 backdrop-blur-xl shadow-sm"
      style={{ background: Z.glass, borderColor: Z.glassBorder }}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold" style={{ color: Z.textPrimary }}>
          Recent Invoices
        </h3>
        <a
          href="#invoice-table"
          className="text-[11px] font-semibold"
          style={{ color: Z.sequential }}
        >
          View All ↓
        </a>
      </div>
      <ul className="flex flex-col divide-y" style={{ borderColor: Z.glassBorder }}>
        {rows.map((r, i) => (
          <li key={i} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
            <div className="flex min-w-0 flex-col">
              <span
                className="truncate text-xs font-semibold"
                style={{ color: Z.textPrimary }}
              >
                {r.customerName}
              </span>
              <span className="text-[11px]" style={{ color: Z.muted }}>
                {r.trxNumber} · {r.trxDate ? r.trxDate.slice(0, 10) : '—'}
              </span>
            </div>
            <span className="shrink-0 text-xs font-semibold" style={{ color: Z.textPrimary }}>
              {formatCompact(r.amount)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
