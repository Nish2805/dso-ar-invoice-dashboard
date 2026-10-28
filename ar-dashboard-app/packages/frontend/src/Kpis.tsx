import { useEffect, useState } from 'react';

import { StatCard } from '@/components/StatCard';
import { getRayfinClient } from '@/lib/rayfin-client';
import type { Filters } from './filters';

interface KpiValues {
  totalAmount: number;
  invoiceCount: number;
  avgInvoiceValue: number;
  largestInvoice: number;
  smallestInvoice: number;
  creditMemoTotal: number;
  yoyGrowthPct: number | null;
}

export function Kpis({ filters }: { filters: Filters }) {
  const [kpis, setKpis] = useState<KpiValues | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const client = await getRayfinClient();

        const kpiTotals = await client.functions.computeKpis.invoke({ filters });

        if (!cancelled) {
          setKpis({
            totalAmount: kpiTotals.total_amount ?? 0,
            invoiceCount: kpiTotals.invoice_count ?? 0,
            avgInvoiceValue: kpiTotals.avg_invoice_value ?? 0,
            largestInvoice: kpiTotals.largest_invoice ?? 0,
            smallestInvoice: kpiTotals.smallest_invoice ?? 0,
            creditMemoTotal: kpiTotals.credit_memo_total ?? 0,
            yoyGrowthPct: kpiTotals.yoy_growth_pct,
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
    return <p style={{ color: '#b91c1c' }}>Failed to load KPIs: {error}</p>;
  }

  if (!kpis) {
    return <p>Loading KPIs from the Lakehouse…</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      <StatCard
        label="Invoice Amount"
        value={kpis.totalAmount}
        glyph="$"
        prefix="AED"
        badge={
          kpis.yoyGrowthPct !== null
            ? {
                text: `${kpis.yoyGrowthPct >= 0 ? '+' : ''}${kpis.yoyGrowthPct.toFixed(1)}% YoY`,
                positive: kpis.yoyGrowthPct >= 0,
              }
            : undefined
        }
      />
      <StatCard label="Invoices" value={kpis.invoiceCount} glyph="#" />
      <StatCard
        label="Avg Invoice Value"
        value={kpis.avgInvoiceValue}
        glyph="Ø"
        prefix="AED"
      />
      <StatCard
        label="Largest Invoice"
        value={kpis.largestInvoice}
        glyph="▲"
        prefix="AED"
      />
      <StatCard
        label="Smallest Invoice"
        value={kpis.smallestInvoice}
        glyph="▽"
        prefix="AED"
      />
      <StatCard
        label="Credit Memos"
        value={kpis.creditMemoTotal}
        glyph="↩"
        prefix="AED"
      />
    </div>
  );
}
