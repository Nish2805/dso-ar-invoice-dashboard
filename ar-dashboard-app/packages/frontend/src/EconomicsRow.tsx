import { useEffect, useState } from 'react';

import { getRayfinClient } from '@/lib/rayfin-client';
import { Z, formatCompact } from '@/theme';
import type { Filters } from './filters';

interface EconomicsValues {
  medianInvoiceValue: number;
  invoicesPerCustomer: number;
  amountPerCustomer: number;
}

export function EconomicsRow({ filters }: { filters: Filters }) {
  const [values, setValues] = useState<EconomicsValues | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const client = await getRayfinClient();
        const result = await client.functions.invoiceEconomics.invoke({ filters });

        if (!cancelled) {
          setValues({
            medianInvoiceValue: result.median_invoice_value ?? 0,
            invoicesPerCustomer: result.invoices_per_customer ?? 0,
            amountPerCustomer: result.amount_per_customer ?? 0,
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
    return <p style={{ color: '#b91c1c' }}>Failed to load economics: {error}</p>;
  }

  if (!values) {
    return <p>Loading invoice economics…</p>;
  }

  const stats = [
    { label: 'Median Invoice Value', value: `AED ${formatCompact(values.medianInvoiceValue)}` },
    { label: 'Invoices per Customer', value: values.invoicesPerCustomer.toFixed(1) },
    { label: 'Amount per Customer', value: `AED ${formatCompact(values.amountPerCustomer)}` },
  ];

  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border p-5 backdrop-blur-xl shadow-sm"
      style={{ background: Z.glass, borderColor: Z.glassBorder }}
    >
      <h3 className="font-display text-sm font-semibold" style={{ color: Z.textPrimary }}>
        Invoice Economics
      </h3>
      <div className="grid grid-cols-1 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="flex items-baseline justify-between">
            <span className="text-xs" style={{ color: Z.muted }}>
              {s.label}
            </span>
            <span
              className="tabular-nums text-sm font-semibold"
              style={{ color: Z.textPrimary }}
            >
              {s.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
