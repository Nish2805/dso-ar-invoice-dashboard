import { useEffect, useState } from 'react';

import { getRayfinClient } from '@/lib/rayfin-client';
import { Z } from '@/theme';
import { downloadCsv } from './csv';
import type { Filters } from './filters';

interface TableRow {
  accountNo: string;
  customerName: string;
  invoiceNo: string;
  invoiceAmount: number | null;
  trxClass: string;
  trxDate: string;
  lineNo: string;
  lineType: string;
}

interface InvoiceTableProps {
  filters: Filters;
  page: number;
  onPageChange: (page: number) => void;
}

const COLUMNS: { key: keyof TableRow; header: string }[] = [
  { key: 'accountNo', header: 'Account No.' },
  { key: 'customerName', header: 'Customer Name' },
  { key: 'invoiceNo', header: 'Invoice No' },
  { key: 'invoiceAmount', header: 'Invoice Amount' },
  { key: 'trxClass', header: 'Trx Class' },
  { key: 'trxDate', header: 'Trx Date' },
  { key: 'lineNo', header: 'Line #' },
  { key: 'lineType', header: 'Line Type' },
];

export function InvoiceTable({ filters, page, onPageChange }: InvoiceTableProps) {
  const [rows, setRows] = useState<TableRow[] | null>(null);
  const [totalRows, setTotalRows] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const client = await getRayfinClient();
      const result = await client.functions.exportInvoiceTable.invoke({ filters });

      downloadCsv(
        `invoice-details-${new Date().toISOString().slice(0, 10)}.csv`,
        ['Account No.', 'Customer Name', 'Invoice No', 'Invoice Amount', 'Trx Class', 'Trx Date', 'Line #', 'Line Type'],
        result.rows.map((r) => [
          r.account_no,
          r.customer_name,
          r.invoice_no,
          r.invoice_amount,
          r.trx_class,
          r.trx_date ? r.trx_date.slice(0, 10) : '',
          r.line_no,
          r.line_type,
        ])
      );

      if (result.truncated) {
        window.alert(
          'This export was capped at 50,000 rows. Narrow the filters to export the full set.'
        );
      }
    } catch (err) {
      window.alert(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const client = await getRayfinClient();
        const result = await client.functions.invoiceTable.invoke({
          filters: { ...filters, page },
        });

        if (!cancelled) {
          setRows(
            result.rows.map((r) => ({
              accountNo: r.account_no ?? '',
              customerName: r.customer_name ?? 'Unknown',
              invoiceNo: r.invoice_no,
              invoiceAmount: r.invoice_amount,
              trxClass: r.trx_class ?? '',
              trxDate: r.trx_date ? r.trx_date.slice(0, 10) : '',
              lineNo: r.line_no,
              lineType: r.line_type ?? '',
            }))
          );
          setTotalRows(result.total_rows);
          setPageSize(result.page_size);
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
  }, [filters, page]);

  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  if (error) {
    return <p style={{ color: '#b91c1c' }}>Failed to load invoice details: {error}</p>;
  }

  return (
    <div
      id="invoice-table"
      className="flex scroll-mt-4 flex-col gap-3 rounded-2xl border p-5 backdrop-blur-xl shadow-sm"
      style={{ background: Z.glass, borderColor: Z.glassBorder }}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold" style={{ color: Z.textPrimary }}>
          Invoice Details
        </h3>
        <p className="hidden text-[11px] italic print:block" style={{ color: Z.muted }}>
          Showing page {page} of {totalPages} — use Export CSV for the full set
        </p>
        <div className="print-hide flex items-center gap-2 text-xs" style={{ color: Z.textSecondary }}>
          <button
            className="rounded-lg border px-2.5 py-1 font-medium transition-colors disabled:opacity-50"
            style={{ borderColor: Z.sequential, color: Z.sequential }}
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
          <button
            className="rounded-lg border px-2.5 py-1 transition-colors disabled:opacity-30"
            style={{ borderColor: Z.glassBorder }}
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Prev
          </button>
          Page {page} of {totalPages}
          <button
            className="rounded-lg border px-2.5 py-1 transition-colors disabled:opacity-30"
            style={{ borderColor: Z.glassBorder }}
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-auto rounded-lg">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0" style={{ background: '#f4f6f6' }}>
            <tr>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  className="whitespace-nowrap border-b px-2 py-2 font-semibold"
                  style={{ borderColor: Z.glassBorder, color: Z.textSecondary }}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!rows ? (
              <tr>
                <td colSpan={COLUMNS.length} className="px-2 py-4 text-center" style={{ color: Z.muted }}>
                  Loading invoice details…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="px-2 py-4 text-center" style={{ color: Z.muted }}>
                  No invoices match the current filters.
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i} className="border-b last:border-0" style={{ borderColor: Z.glassBorder }}>
                  <td className="whitespace-nowrap px-2 py-1.5" style={{ color: Z.textPrimary }}>
                    {r.accountNo}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5" style={{ color: Z.textPrimary }}>
                    {r.customerName}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5" style={{ color: Z.textPrimary }}>
                    {r.invoiceNo}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5 tabular-nums" style={{ color: Z.textPrimary }}>
                    {r.invoiceAmount == null
                      ? ''
                      : r.invoiceAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5" style={{ color: Z.textPrimary }}>
                    {r.trxClass}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5" style={{ color: Z.textPrimary }}>
                    {r.trxDate}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5" style={{ color: Z.textPrimary }}>
                    {r.lineNo}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5" style={{ color: Z.textPrimary }}>
                    {r.lineType}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
