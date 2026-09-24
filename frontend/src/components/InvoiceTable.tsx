import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import type { InvoiceRow, PaginatedInvoices } from '../types/dashboard'
import { theme } from '../theme'
import { formatCompactNumber } from '../format'

const columnHelper = createColumnHelper<InvoiceRow>()

const columns = [
  columnHelper.accessor('account_no', { header: 'Account No.' }),
  columnHelper.accessor('customer_name', { header: 'Customer Name' }),
  columnHelper.accessor('invoice_no', { header: 'Invoice No' }),
  columnHelper.accessor('invoice_amount', {
    header: 'Invoice Amount',
    cell: (info) => {
      const v = info.getValue()
      return v == null ? '' : v.toLocaleString('en-US', { minimumFractionDigits: 2 })
    },
  }),
  columnHelper.accessor('trx_class', { header: 'Trx Class' }),
  columnHelper.accessor('trx_date', { header: 'Trx Date' }),
  columnHelper.accessor('line_no', { header: 'Line #' }),
  columnHelper.accessor('line_type', { header: 'Line Type' }),
]

interface Props {
  data: PaginatedInvoices | undefined
  page: number
  onPageChange: (page: number) => void
}

export function InvoiceTable({ data, page, onPageChange }: Props) {
  const table = useReactTable({
    data: data?.rows ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const totalPages = data ? Math.max(1, Math.ceil(data.total_rows / data.page_size)) : 1
  const headBg = '#f4f6f6'

  return (
    <div
      id="invoice-table"
      className="flex scroll-mt-4 flex-col gap-3 rounded-2xl border p-5 backdrop-blur-xl shadow-sm"
      style={{ background: theme.glass, borderColor: theme.glassBorder }}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold" style={{ color: theme.textPrimary }}>
          Invoice Details
        </h3>
        <div className="flex items-center gap-2 text-xs" style={{ color: theme.textSecondary }}>
          <button
            className="rounded-lg border px-2.5 py-1 transition-colors disabled:opacity-30"
            style={{ borderColor: theme.glassBorder }}
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Prev
          </button>
          Page {page} of {totalPages}
          <button
            className="rounded-lg border px-2.5 py-1 transition-colors disabled:opacity-30"
            style={{ borderColor: theme.glassBorder }}
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-auto rounded-lg">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0" style={{ background: headBg }}>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="whitespace-nowrap border-b px-2 py-2 font-semibold"
                    style={{ borderColor: theme.glassBorder, color: theme.textSecondary }}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-b transition-colors hover:bg-black/[0.03]"
                style={{ borderColor: theme.gridline }}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="whitespace-nowrap px-2 py-1.5 tabular-nums"
                    style={{ color: theme.textSecondary }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot style={{ background: headBg }}>
            <tr>
              <td
                colSpan={3}
                className="border-t-2 px-2 py-2 font-semibold"
                style={{ borderColor: theme.baseline, color: theme.textPrimary }}
              >
                Total
              </td>
              <td
                className="border-t-2 px-2 py-2 font-semibold tabular-nums"
                style={{ borderColor: theme.baseline, color: theme.textPrimary }}
              >
                {data ? formatCompactNumber(data.total_amount) : ''}
              </td>
              <td className="border-t-2" colSpan={4} style={{ borderColor: theme.baseline }} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
