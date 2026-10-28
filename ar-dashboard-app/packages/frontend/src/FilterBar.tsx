import { useEffect, useState } from 'react';

import { getRayfinClient } from '@/lib/rayfin-client';
import { Z } from '@/theme';
import { EMPTY_FILTERS, hasActiveFilters, type Filters } from './filters';

interface Option {
  value: string;
  label: string;
}

interface FilterBarProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

const MONTH_OPTIONS: Option[] = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
].map((name, i) => ({ value: String(i + 1), label: name }));

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs" style={{ color: Z.textSecondary }}>
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border px-3 py-2 text-sm"
        style={{ background: Z.glass, borderColor: Z.glassBorder, color: Z.textPrimary }}
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FilterBar({ filters, onChange }: FilterBarProps) {
  const [entities, setEntities] = useState<Option[]>([]);
  const [invoiceTypes, setInvoiceTypes] = useState<Option[]>([]);
  const [trxClasses, setTrxClasses] = useState<Option[]>([]);
  const [years, setYears] = useState<Option[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const client = await getRayfinClient();

        const [businessUnits, recordTypes, classRows, filterOptions] = await Promise.all([
          client.connectors.lh_diez_crm.BusinessUnit.findMany(['buID', 'buName']),
          client.connectors.lh_diez_crm.RecordType.findMany(['custTrxTypeSeqID', 'name']),
          client.connectors.lh_diez_crm.InvoiceLine.groupBy(['trxClass'])
            .aggregate({ count: { count: 'lineExtendedAmount' } })
            .execute(),
          client.functions.getFilterOptions.invoke(),
        ]);

        if (cancelled) return;

        setEntities(
          businessUnits
            .filter((b) => b.buID)
            .map((b) => ({ value: b.buID, label: b.buName ?? b.buID }))
        );
        setInvoiceTypes(
          recordTypes
            .filter((r) => r.custTrxTypeSeqID)
            .map((r) => ({ value: r.custTrxTypeSeqID, label: r.name ?? r.custTrxTypeSeqID }))
        );
        setTrxClasses(
          classRows
            .filter((r) => r.fields.trxClass)
            .map((r) => ({
              value: r.fields.trxClass as string,
              label: r.fields.trxClass as string,
            }))
        );
        setYears(filterOptions.years.map((y) => ({ value: String(y), label: String(y) })));
      } catch {
        // Dropdown population failure is non-fatal — filters just show fewer options.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const update = (patch: Partial<Filters>) => {
    const next = { ...filters, ...patch };
    for (const key of Object.keys(next) as (keyof Filters)[]) {
      if (next[key] === undefined || next[key] === ('' as never)) {
        delete next[key];
      }
    }
    onChange(next);
  };

  return (
    <div
      className="flex flex-wrap items-end gap-4 rounded-2xl border p-5 backdrop-blur-xl shadow-sm"
      style={{ background: Z.glass, borderColor: Z.glassBorder }}
    >
      <Select
        label="Entity"
        value={filters.entity ?? ''}
        options={entities}
        onChange={(v) => update({ entity: v || undefined })}
      />
      <Select
        label="Invoice Type"
        value={filters.invoiceType ?? ''}
        options={invoiceTypes}
        onChange={(v) => update({ invoiceType: v || undefined })}
      />
      <Select
        label="Transaction Class"
        value={filters.trxClass ?? ''}
        options={trxClasses}
        onChange={(v) => update({ trxClass: v || undefined })}
      />
      <Select
        label="Year"
        value={filters.year !== undefined ? String(filters.year) : ''}
        options={years}
        onChange={(v) => update({ year: v ? Number(v) : undefined })}
      />
      <Select
        label="Month"
        value={filters.month !== undefined ? String(filters.month) : ''}
        options={MONTH_OPTIONS}
        onChange={(v) => update({ month: v ? Number(v) : undefined })}
      />
      {hasActiveFilters(filters) && (
        <button
          onClick={() => onChange(EMPTY_FILTERS)}
          className="rounded-full px-3 py-1.5 text-xs font-semibold"
          style={{ background: Z.sequentialSoft, color: Z.sequential }}
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}
