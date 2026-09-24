import type { FilterOptions, Filters } from '../types/dashboard'
import { theme } from '../theme'

interface Props {
  options: FilterOptions | undefined
  filters: Filters
  onChange: (next: Filters) => void
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  return (
    <label className="flex flex-col gap-1.5 text-xs" style={{ color: theme.muted }}>
      {label}
      <select
        className="rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[#3987e5]"
        style={{
          background: '#fcfcfb',
          borderColor: theme.glassBorder,
          color: theme.textPrimary,
        }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" style={{ background: '#ffffff' }}>
          All
        </option>
        {options.map((opt) => (
          <option key={opt} value={opt} style={{ background: '#ffffff' }}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  )
}

const FILTER_LABELS: Record<keyof Filters, string> = {
  entity: 'Entity',
  invoice_type: 'Invoice Type',
  trx_class: 'Transaction Class',
  year: 'Year',
  month: 'Month',
  customer_name: 'Customer',
  invoice_source: 'Source',
}

export function FilterBar({ options, filters, onChange }: Props) {
  const activeEntries = (Object.keys(filters) as (keyof Filters)[]).filter(
    (key) => filters[key] !== undefined && filters[key] !== ''
  )

  function clearOne(key: keyof Filters) {
    const next = { ...filters }
    delete next[key]
    onChange(next)
  }

  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border px-5 py-4 backdrop-blur-xl shadow-sm"
      style={{ background: theme.glass, borderColor: theme.glassBorder }}
    >
      <div className="flex flex-wrap gap-5">
        <Select
          label="Entity"
          value={filters.entity ?? ''}
          options={options?.entities ?? []}
          onChange={(v) => onChange({ ...filters, entity: v || undefined })}
        />
        <Select
          label="Invoice Type"
          value={filters.invoice_type ?? ''}
          options={options?.invoice_types ?? []}
          onChange={(v) => onChange({ ...filters, invoice_type: v || undefined })}
        />
        <Select
          label="Transaction Class"
          value={filters.trx_class ?? ''}
          options={options?.trx_classes ?? []}
          onChange={(v) => onChange({ ...filters, trx_class: v || undefined })}
        />
        <Select
          label="Year"
          value={filters.year?.toString() ?? ''}
          options={(options?.years ?? []).map(String)}
          onChange={(v) => onChange({ ...filters, year: v ? Number(v) : undefined })}
        />
        <Select
          label="Month"
          value={filters.month ?? ''}
          options={options?.months ?? []}
          onChange={(v) => onChange({ ...filters, month: v || undefined })}
        />
      </div>

      {activeEntries.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t pt-3" style={{ borderColor: theme.gridline }}>
          <span className="text-[11px]" style={{ color: theme.muted }}>
            Active filters:
          </span>
          {activeEntries.map((key) => (
            <button
              key={key}
              onClick={() => clearOne(key)}
              className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium"
              style={{ background: theme.sequentialSoft, color: theme.sequential }}
            >
              {FILTER_LABELS[key]}: {String(filters[key])}
              <span aria-hidden>✕</span>
            </button>
          ))}
          <button
            onClick={() => onChange({})}
            className="text-[11px] font-medium underline decoration-dotted"
            style={{ color: theme.textSecondary }}
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  )
}
