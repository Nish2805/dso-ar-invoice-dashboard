import {
  UserDataFunctions,
  AudienceType,
  type RayfinContext,
} from '@microsoft/fabric-user-data-functions';
import sql from 'mssql';

const udf = new UserDataFunctions();

const SQL_SERVER =
  'rvfxac7d3cperdjteggvxqxiom-je7yb2zj6nfezaxxv7wrl24qdi.datawarehouse.fabric.microsoft.com';
const DATABASE = '6c56aa55-2b5a-4dd7-bbd5-9ba5a61dd1cd';

type SqlCtx = RayfinContext<Record<string, unknown>, AudienceType.Sql>;

export interface FilterInput {
  entity?: string;
  invoiceType?: string;
  trxClass?: string;
  year?: number;
  month?: number;
  // Chart-click-only filters — no dropdown in the filter bar.
  customerId?: string;
  invoiceSource?: string;
}

function buildWhereClause(filters: FilterInput | undefined): {
  clause: string;
  params: Record<string, unknown>;
} {
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  if (filters?.entity) {
    conditions.push('f.OrgID = @entity');
    params.entity = filters.entity;
  }
  if (filters?.invoiceType) {
    conditions.push('f.CustTrxTypeSeqID = @invoiceType');
    params.invoiceType = filters.invoiceType;
  }
  if (filters?.trxClass) {
    conditions.push('f.TrxClass = @trxClass');
    params.trxClass = filters.trxClass;
  }
  if (filters?.year) {
    conditions.push('YEAR(f.TrxDate) = @year');
    params.year = filters.year;
  }
  if (filters?.month) {
    conditions.push('MONTH(f.TrxDate) = @month');
    params.month = filters.month;
  }
  if (filters?.customerId) {
    conditions.push('f.BillToCustomerID = @customerId');
    params.customerId = filters.customerId;
  }
  if (filters?.invoiceSource) {
    conditions.push('f.BatchSourceSeqID = @invoiceSource');
    params.invoiceSource = filters.invoiceSource;
  }

  return {
    clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
}

const MAX_QUERY_ATTEMPTS = 3;

/**
 * A fresh SQL connection costs a full TCP + TLS + Azure AD handshake — often
 * slower than the query itself. Cache the pool at module scope so warm
 * function instances reuse it across calls (and across the multiple queries
 * a single function like computeKpis or keyInsights makes), instead of
 * reconnecting from zero every time. Reconnect only when the app-identity
 * token rotates or the pool has gone stale.
 */
let cachedPool: sql.ConnectionPool | null = null;
let cachedToken: string | null = null;

async function getPool(token: string): Promise<sql.ConnectionPool> {
  if (cachedPool && cachedToken === token && cachedPool.connected) {
    return cachedPool;
  }
  if (cachedPool) {
    try {
      await cachedPool.close();
    } catch {
      // Stale pool — ignore close errors and reconnect below.
    }
  }
  cachedToken = token;
  cachedPool = await new sql.ConnectionPool({
    server: SQL_SERVER,
    database: DATABASE,
    options: { encrypt: true, trustServerCertificate: false },
    authentication: {
      type: 'azure-active-directory-access-token',
      options: { token },
    },
  }).connect();
  return cachedPool;
}

async function runQueryOnce(
  ctx: SqlCtx,
  query: string,
  params: Record<string, unknown>
): Promise<Record<string, unknown>[]> {
  const pool = await getPool(ctx.Tokens.Sql);
  const request = pool.request();
  for (const [key, value] of Object.entries(params)) {
    request.input(key, value);
  }
  const result = await request.query(query);
  return result.recordset;
}

/**
 * Retries transient connection failures (cold starts, concurrency limits on
 * the Lakehouse SQL endpoint when many functions fire at once on page load).
 */
async function runQuery(
  ctx: SqlCtx,
  query: string,
  params: Record<string, unknown> = {}
): Promise<Record<string, unknown>[]> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_QUERY_ATTEMPTS; attempt++) {
    try {
      return await runQueryOnce(ctx, query, params);
    } catch (err) {
      lastError = err;
      cachedPool = null; // force a fresh connection on retry — the cached one may be dead
      if (attempt < MAX_QUERY_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
      }
    }
  }
  throw lastError;
}

interface KpiTotals {
  total_amount: number;
  invoice_count: number;
  avg_invoice_value: number;
  largest_invoice: number;
  smallest_invoice: number;
  credit_memo_total: number;
  yoy_growth_pct: number | null;
  yoy_current_year: number | null;
  yoy_previous_year: number | null;
}

udf.func(
  'computeKpis',
  async (
    filters: FilterInput,
    ctx: RayfinContext<Record<string, unknown>, AudienceType.Sql>
  ): Promise<KpiTotals> => {
    const { clause, params } = buildWhereClause(filters);
    const [rows, yearRows] = await Promise.all([
      runQuery(
        ctx,
        `
        WITH per_invoice AS (
            SELECT TrxNumber, TrxClass, SUM(Line_ExtendedAmount) AS invoice_total
            FROM EDW.FIN_AR_INVOICE_LINE_F f
            ${clause}
            GROUP BY TrxNumber, TrxClass
        )
        SELECT
            SUM(invoice_total) AS total_amount,
            COUNT(*) AS invoice_count,
            AVG(invoice_total) AS avg_invoice_value,
            MAX(invoice_total) AS largest_invoice,
            MIN(invoice_total) AS smallest_invoice,
            SUM(CASE WHEN TrxClass = 'CM' THEN invoice_total ELSE 0 END) AS credit_memo_total
        FROM per_invoice
        `,
        params
      ),
      runQuery(
        ctx,
        `
        SELECT YEAR(TrxDate) AS yr, SUM(Line_ExtendedAmount) AS total
        FROM EDW.FIN_AR_INVOICE_LINE_F f
        ${clause}
        GROUP BY YEAR(TrxDate)
        ORDER BY yr DESC
        `,
        params
      ),
    ]);
    const typedYearRows = yearRows as unknown as { yr: number; total: number }[];

    let yoyGrowthPct: number | null = null;
    let yoyCurrentYear: number | null = null;
    let yoyPreviousYear: number | null = null;
    if (typedYearRows.length >= 2) {
      const [curr, prev] = typedYearRows;
      yoyCurrentYear = curr.yr;
      yoyPreviousYear = prev.yr;
      if (prev.total) {
        yoyGrowthPct = ((curr.total - prev.total) / Math.abs(prev.total)) * 100;
      }
    }

    return {
      ...(rows[0] as unknown as Omit<
        KpiTotals,
        'yoy_growth_pct' | 'yoy_current_year' | 'yoy_previous_year'
      >),
      yoy_growth_pct: yoyGrowthPct,
      yoy_current_year: yoyCurrentYear,
      yoy_previous_year: yoyPreviousYear,
    };
  },
  []
);

interface TopCustomerRow {
  customer_id: string;
  customer_name: string;
  total_amount: number;
}

udf.func(
  'topCustomers',
  async (
    filters: FilterInput,
    ctx: RayfinContext<Record<string, unknown>, AudienceType.Sql>
  ): Promise<TopCustomerRow[]> => {
    const { clause, params } = buildWhereClause(filters);
    const rows = await runQuery(
      ctx,
      `
      SELECT TOP 10 f.BillToCustomerID AS customer_id, c.PartyName AS customer_name,
             SUM(f.Line_ExtendedAmount) AS total_amount
      FROM EDW.FIN_AR_INVOICE_LINE_F f
      LEFT JOIN EDW.FIN_CUSTOMER_D c ON f.BillToCustomerID = c.CustAccountID
      ${clause}
      GROUP BY f.BillToCustomerID, c.PartyName
      ORDER BY total_amount DESC
      `,
      params
    );
    return rows as unknown as TopCustomerRow[];
  },
  []
);

interface ConcentrationSlice {
  label: string;
  value: number;
  pct: number;
}

udf.func(
  'customerConcentration',
  async (
    filters: FilterInput,
    ctx: RayfinContext<Record<string, unknown>, AudienceType.Sql>
  ): Promise<ConcentrationSlice[]> => {
    const { clause, params } = buildWhereClause(filters);
    const rows = await runQuery(
      ctx,
      `
      WITH per_customer AS (
          SELECT BillToCustomerID, SUM(Line_ExtendedAmount) AS cust_total
          FROM EDW.FIN_AR_INVOICE_LINE_F f
          ${clause}
          GROUP BY BillToCustomerID
      ),
      ranked AS (
          SELECT cust_total, ROW_NUMBER() OVER (ORDER BY cust_total DESC) AS rn FROM per_customer
      )
      SELECT
          SUM(CASE WHEN rn <= 10 THEN cust_total ELSE 0 END) AS top10_total,
          SUM(CASE WHEN rn > 10 THEN cust_total ELSE 0 END) AS other_total
      FROM ranked
      `,
      params
    );
    const row = rows[0] as { top10_total: number | null; other_total: number | null };
    const top10 = row.top10_total ?? 0;
    const other = row.other_total ?? 0;
    const total = top10 + other;
    return [
      { label: 'Top 10 Customers', value: top10, pct: total ? (top10 / total) * 100 : 0 },
      { label: 'Other Customers', value: other, pct: total ? (other / total) * 100 : 0 },
    ];
  },
  []
);

interface EconomicsResult {
  median_invoice_value: number;
  invoices_per_customer: number;
  amount_per_customer: number;
}

udf.func(
  'invoiceEconomics',
  async (
    filters: FilterInput,
    ctx: RayfinContext<Record<string, unknown>, AudienceType.Sql>
  ): Promise<EconomicsResult> => {
    const { clause, params } = buildWhereClause(filters);
    const rows = (await runQuery(
      ctx,
      `
      SELECT TrxNumber, BillToCustomerID, SUM(Line_ExtendedAmount) AS invoice_total
      FROM EDW.FIN_AR_INVOICE_LINE_F f
      ${clause}
      GROUP BY TrxNumber, BillToCustomerID
      `,
      params
    )) as { TrxNumber: string; BillToCustomerID: string; invoice_total: number }[];

    if (rows.length === 0) {
      return { median_invoice_value: 0, invoices_per_customer: 0, amount_per_customer: 0 };
    }

    const totals = rows.map((r) => r.invoice_total ?? 0).sort((a, b) => a - b);
    const mid = Math.floor(totals.length / 2);
    const median = totals.length % 2 === 0 ? (totals[mid - 1] + totals[mid]) / 2 : totals[mid];

    const customerCount = new Set(rows.map((r) => r.BillToCustomerID)).size;
    const totalAmount = totals.reduce((sum, n) => sum + n, 0);

    return {
      median_invoice_value: median,
      invoices_per_customer: customerCount ? rows.length / customerCount : 0,
      amount_per_customer: customerCount ? totalAmount / customerCount : 0,
    };
  },
  []
);

interface ExceptionStats {
  high_value_count: number;
  high_value_threshold: number;
  low_value_count: number;
  low_value_threshold: number;
  peak_swing_month: string | null;
  peak_swing_pct: number | null;
  credit_memo_total: number;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function quantile(sortedAsc: number[], q: number): number {
  if (sortedAsc.length === 0) return 0;
  const pos = (sortedAsc.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return sortedAsc[base + 1] !== undefined
    ? sortedAsc[base] + rest * (sortedAsc[base + 1] - sortedAsc[base])
    : sortedAsc[base];
}

udf.func(
  'invoiceExceptions',
  async (
    filters: FilterInput,
    ctx: RayfinContext<Record<string, unknown>, AudienceType.Sql>
  ): Promise<ExceptionStats> => {
    const { clause, params } = buildWhereClause(filters);
    const rows = (await runQuery(
      ctx,
      `
      SELECT TrxNumber, TrxClass, TrxDate, SUM(Line_ExtendedAmount) AS invoice_total
      FROM EDW.FIN_AR_INVOICE_LINE_F f
      ${clause}
      GROUP BY TrxNumber, TrxClass, TrxDate
      `,
      params
    )) as { TrxNumber: string; TrxClass: string | null; TrxDate: string | null; invoice_total: number }[];

    if (rows.length === 0) {
      return {
        high_value_count: 0,
        high_value_threshold: 0,
        low_value_count: 0,
        low_value_threshold: 0,
        peak_swing_month: null,
        peak_swing_pct: null,
        credit_memo_total: 0,
      };
    }

    const positive = rows
      .map((r) => r.invoice_total ?? 0)
      .filter((n) => n > 0)
      .sort((a, b) => a - b);

    const p99 = quantile(positive, 0.99);
    const p01 = quantile(positive, 0.01);
    const highCount = positive.filter((n) => n > p99).length;
    const lowCount = positive.filter((n) => n > 0 && n < p01).length;

    const creditMemoTotal = rows
      .filter((r) => r.TrxClass === 'CM')
      .reduce((sum, r) => sum + (r.invoice_total ?? 0), 0);

    const monthTotals = new Map<string, number>();
    for (const r of rows) {
      if (!r.TrxDate) continue;
      const d = new Date(r.TrxDate);
      const month = MONTH_NAMES[d.getUTCMonth()];
      monthTotals.set(month, (monthTotals.get(month) ?? 0) + (r.invoice_total ?? 0));
    }

    let peakMonth: string | null = null;
    let peakPct: number | null = null;
    if (monthTotals.size > 0) {
      const values = Array.from(monthTotals.values());
      const avg = values.reduce((sum, n) => sum + n, 0) / values.length;
      if (avg) {
        let maxSwing = -Infinity;
        for (const [month, total] of monthTotals) {
          const swing = (Math.abs(total - avg) / Math.abs(avg)) * 100;
          if (swing > maxSwing) {
            maxSwing = swing;
            peakMonth = month;
          }
        }
        peakPct = maxSwing;
      }
    }

    return {
      high_value_count: highCount,
      high_value_threshold: p99,
      low_value_count: lowCount,
      low_value_threshold: p01,
      peak_swing_month: peakMonth,
      peak_swing_pct: peakPct,
      credit_memo_total: creditMemoTotal,
    };
  },
  []
);

interface FilterOptionsResult {
  years: number[];
}

udf.func(
  'getFilterOptions',
  async (
    ctx: RayfinContext<Record<string, unknown>, AudienceType.Sql>
  ): Promise<FilterOptionsResult> => {
    const rows = (await runQuery(
      ctx,
      `
      SELECT DISTINCT YEAR(TrxDate) AS yr
      FROM EDW.FIN_AR_INVOICE_LINE_F
      WHERE TrxDate IS NOT NULL
      ORDER BY yr DESC
      `
    )) as { yr: number }[];
    return { years: rows.map((r) => r.yr) };
  },
  []
);

interface TrendPoint {
  month: number;
  amount: number;
  volume: number;
}

interface MonthlyTrendResult {
  currentYear: number;
  previousYear: number;
  current: TrendPoint[];
  previous: TrendPoint[];
}

udf.func(
  'monthlyTrend',
  async (
    filters: FilterInput,
    ctx: RayfinContext<Record<string, unknown>, AudienceType.Sql>
  ): Promise<MonthlyTrendResult> => {
    // Trend always plots full years, so the Year filter picks WHICH year to
    // show (vs. the year before it) instead of narrowing rows via WHERE —
    // and Month doesn't apply to a 12-month chart at all.
    const { clause, params } = buildWhereClause({
      entity: filters?.entity,
      invoiceType: filters?.invoiceType,
      trxClass: filters?.trxClass,
    });
    const rows = (await runQuery(
      ctx,
      `
      WITH base AS (
          SELECT YEAR(TrxDate) AS yr, MONTH(TrxDate) AS mo, TrxNumber,
                 SUM(Line_ExtendedAmount) AS invoice_total
          FROM EDW.FIN_AR_INVOICE_LINE_F f
          ${clause}
          GROUP BY YEAR(TrxDate), MONTH(TrxDate), TrxNumber
      )
      SELECT yr, mo, SUM(invoice_total) AS amount, COUNT(*) AS volume
      FROM base
      GROUP BY yr, mo
      ORDER BY yr, mo
      `,
      params
    )) as { yr: number; mo: number; amount: number; volume: number }[];

    const years = Array.from(new Set(rows.map((r) => r.yr))).sort((a, b) => b - a);
    const currentYear = filters?.year ?? years[0] ?? new Date().getFullYear();
    const previousYear = currentYear - 1;

    const toSeries = (year: number): TrendPoint[] =>
      Array.from({ length: 12 }, (_, i) => {
        const match = rows.find((r) => r.yr === year && r.mo === i + 1);
        return { month: i + 1, amount: match?.amount ?? 0, volume: match?.volume ?? 0 };
      });

    return {
      currentYear,
      previousYear,
      current: toSeries(currentYear),
      previous: toSeries(previousYear),
    };
  },
  []
);

udf.func(
  'keyInsights',
  async (
    filters: FilterInput,
    ctx: RayfinContext<Record<string, unknown>, AudienceType.Sql>
  ): Promise<string[]> => {
    const { clause, params } = buildWhereClause(filters);
    const insights: string[] = [];

    const [yearRowsRaw, monthRowsRaw, concRowsRaw, typeRowsRaw] = await Promise.all([
      runQuery(
        ctx,
        `
        SELECT YEAR(TrxDate) AS yr, SUM(Line_ExtendedAmount) AS total
        FROM EDW.FIN_AR_INVOICE_LINE_F f
        ${clause}
        GROUP BY YEAR(TrxDate)
        ORDER BY yr DESC
        `,
        params
      ),
      runQuery(
        ctx,
        `
        SELECT YEAR(TrxDate) AS yr, MONTH(TrxDate) AS mo, SUM(Line_ExtendedAmount) AS total
        FROM EDW.FIN_AR_INVOICE_LINE_F f
        ${clause}
        GROUP BY YEAR(TrxDate), MONTH(TrxDate)
        `,
        params
      ),
      runQuery(
        ctx,
        `
        WITH per_customer AS (
            SELECT BillToCustomerID, SUM(Line_ExtendedAmount) AS cust_total
            FROM EDW.FIN_AR_INVOICE_LINE_F f ${clause} GROUP BY BillToCustomerID
        ),
        ranked AS (
            SELECT cust_total, ROW_NUMBER() OVER (ORDER BY cust_total DESC) AS rn FROM per_customer
        )
        SELECT
            SUM(CASE WHEN rn <= 10 THEN cust_total ELSE 0 END) AS top10,
            SUM(cust_total) AS total
        FROM ranked
        `,
        params
      ),
      runQuery(
        ctx,
        `
        SELECT r.Name AS name, SUM(f.Line_ExtendedAmount) AS total
        FROM EDW.FIN_AR_INVOICE_LINE_F f
        LEFT JOIN EDW.FIN_RECORDTYPE_D r ON f.CustTrxTypeSeqID = r.CustTrxTypeSeqID
        ${clause}
        GROUP BY r.Name
        ORDER BY total DESC
        `,
        params
      ),
    ]);

    const yearRows = yearRowsRaw as unknown as { yr: number; total: number }[];
    const monthRows = monthRowsRaw as unknown as { yr: number; mo: number; total: number }[];
    const concRows = concRowsRaw as unknown as { top10: number | null; total: number | null }[];
    const typeRows = typeRowsRaw as unknown as { name: string | null; total: number }[];

    if (yearRows.length >= 2) {
      const [curr, prev] = yearRows;
      if (prev.total) {
        const pct = ((curr.total - prev.total) / Math.abs(prev.total)) * 100;
        const direction = pct >= 0 ? 'increased' : 'decreased';
        insights.push(
          `Invoice value ${direction} ${Math.abs(pct).toFixed(1)}% year-over-year (${prev.yr} → ${curr.yr}).`
        );
      }
    }

    if (monthRows.length > 0) {
      const avg = monthRows.reduce((s, r) => s + r.total, 0) / monthRows.length;
      const peak = monthRows.reduce((a, b) => (b.total > a.total ? b : a));
      if (avg) {
        const pctAbove = ((peak.total - avg) / Math.abs(avg)) * 100;
        insights.push(
          `${MONTH_NAMES[peak.mo - 1]} ${peak.yr} generated the highest invoice value, ${pctAbove.toFixed(0)}% above the monthly average.`
        );
      }
    }

    const conc = concRows[0];
    if (conc?.total) {
      const pct = ((conc.top10 ?? 0) / conc.total) * 100;
      insights.push(`Top 10 Customers represent ${pct.toFixed(0)}% of total billing.`);
    }

    if (typeRows.length > 0) {
      const grandTotal = typeRows.reduce((s, r) => s + r.total, 0);
      const top = typeRows[0];
      if (grandTotal) {
        const pct = (top.total / grandTotal) * 100;
        insights.push(
          `"${top.name ?? 'Unknown'}" is the largest invoice type, contributing ${pct.toFixed(0)}% of total value.`
        );
      }
    }

    return insights;
  },
  []
);

interface RecentInvoiceRow {
  customer_name: string;
  trx_number: string;
  trx_date: string | null;
  amount: number;
}

udf.func(
  'recentInvoices',
  async (
    filters: FilterInput,
    ctx: RayfinContext<Record<string, unknown>, AudienceType.Sql>
  ): Promise<RecentInvoiceRow[]> => {
    const { clause, params } = buildWhereClause(filters);
    const rows = await runQuery(
      ctx,
      `
      SELECT TOP 5 c.PartyName AS customer_name, f.TrxNumber AS trx_number,
             MAX(f.TrxDate) AS trx_date, SUM(f.Line_ExtendedAmount) AS amount
      FROM EDW.FIN_AR_INVOICE_LINE_F f
      LEFT JOIN EDW.FIN_CUSTOMER_D c ON f.BillToCustomerID = c.CustAccountID
      ${clause}
      GROUP BY c.PartyName, f.TrxNumber
      ORDER BY MAX(f.TrxDate) DESC
      `,
      params
    );
    return rows as unknown as RecentInvoiceRow[];
  },
  []
);

interface CategoryRow {
  id: string;
  label: string;
  value: number;
}

udf.func(
  'invoiceTypeContribution',
  async (
    filters: FilterInput,
    ctx: RayfinContext<Record<string, unknown>, AudienceType.Sql>
  ): Promise<CategoryRow[]> => {
    const { clause, params } = buildWhereClause(filters);
    const rows = (await runQuery(
      ctx,
      `
      SELECT f.CustTrxTypeSeqID AS id, r.Name AS label, SUM(f.Line_ExtendedAmount) AS value
      FROM EDW.FIN_AR_INVOICE_LINE_F f
      LEFT JOIN EDW.FIN_RECORDTYPE_D r ON f.CustTrxTypeSeqID = r.CustTrxTypeSeqID
      ${clause}
      GROUP BY f.CustTrxTypeSeqID, r.Name
      ORDER BY value DESC
      `,
      params
    )) as { id: string | null; label: string | null; value: number }[];
    return rows.map((r) => ({ id: r.id ?? '', label: r.label ?? 'Unknown', value: r.value ?? 0 }));
  },
  []
);

udf.func(
  'invoiceSourceAnalysis',
  async (
    filters: FilterInput,
    ctx: RayfinContext<Record<string, unknown>, AudienceType.Sql>
  ): Promise<CategoryRow[]> => {
    const { clause, params } = buildWhereClause(filters);
    const rows = (await runQuery(
      ctx,
      `
      SELECT f.BatchSourceSeqID AS id, s.Name AS label, SUM(f.Line_ExtendedAmount) AS value
      FROM EDW.FIN_AR_INVOICE_LINE_F f
      LEFT JOIN EDW.FIN_AR_INVOICE_SOURCE_D s ON f.BatchSourceSeqID = s.BatchSourceSeqID
      ${clause}
      GROUP BY f.BatchSourceSeqID, s.Name
      ORDER BY value DESC
      `,
      params
    )) as { id: string | null; label: string | null; value: number }[];
    return rows.map((r) => ({ id: r.id ?? '', label: r.label ?? 'Unknown', value: r.value ?? 0 }));
  },
  []
);

interface InvoiceTableRow {
  account_no: string | null;
  customer_name: string | null;
  invoice_no: string;
  invoice_amount: number | null;
  trx_class: string | null;
  trx_date: string | null;
  line_no: string;
  line_type: string | null;
}

interface InvoiceTableResult {
  rows: InvoiceTableRow[];
  total_rows: number;
  page_size: number;
}

const INVOICE_TABLE_PAGE_SIZE = 25;

udf.func(
  'invoiceTable',
  async (
    filters: FilterInput & { page?: number },
    ctx: RayfinContext<Record<string, unknown>, AudienceType.Sql>
  ): Promise<InvoiceTableResult> => {
    const page = Math.max(1, filters?.page ?? 1);
    const offset = (page - 1) * INVOICE_TABLE_PAGE_SIZE;
    const { clause, params } = buildWhereClause(filters);

    const countRows = (await runQuery(
      ctx,
      `SELECT COUNT(*) AS total FROM EDW.FIN_AR_INVOICE_LINE_F f ${clause}`,
      params
    )) as { total: number }[];
    const totalRows = countRows[0]?.total ?? 0;

    const rows = await runQuery(
      ctx,
      `
      SELECT c.AccountNumber AS account_no, c.PartyName AS customer_name,
             f.TrxNumber AS invoice_no, f.Line_ExtendedAmount AS invoice_amount,
             f.TrxClass AS trx_class, f.TrxDate AS trx_date,
             f.Line_CustomerTrxLineID AS line_no, f.Line_LineType AS line_type
      FROM EDW.FIN_AR_INVOICE_LINE_F f
      LEFT JOIN EDW.FIN_CUSTOMER_D c ON f.BillToCustomerID = c.CustAccountID
      ${clause}
      ORDER BY f.TrxDate DESC, f.TrxNumber, f.Line_CustomerTrxLineID
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
      `,
      { ...params, offset, pageSize: INVOICE_TABLE_PAGE_SIZE }
    );

    return {
      rows: rows as unknown as InvoiceTableRow[],
      total_rows: totalRows,
      page_size: INVOICE_TABLE_PAGE_SIZE,
    };
  },
  []
);

const EXPORT_ROW_LIMIT = 50000;

udf.func(
  'exportInvoiceTable',
  async (
    filters: FilterInput,
    ctx: RayfinContext<Record<string, unknown>, AudienceType.Sql>
  ): Promise<{ rows: InvoiceTableRow[]; truncated: boolean }> => {
    const { clause, params } = buildWhereClause(filters);
    const rows = await runQuery(
      ctx,
      `
      SELECT TOP ${EXPORT_ROW_LIMIT + 1} c.AccountNumber AS account_no, c.PartyName AS customer_name,
             f.TrxNumber AS invoice_no, f.Line_ExtendedAmount AS invoice_amount,
             f.TrxClass AS trx_class, f.TrxDate AS trx_date,
             f.Line_CustomerTrxLineID AS line_no, f.Line_LineType AS line_type
      FROM EDW.FIN_AR_INVOICE_LINE_F f
      LEFT JOIN EDW.FIN_CUSTOMER_D c ON f.BillToCustomerID = c.CustAccountID
      ${clause}
      ORDER BY f.TrxDate DESC, f.TrxNumber, f.Line_CustomerTrxLineID
      `,
      params
    );
    const truncated = rows.length > EXPORT_ROW_LIMIT;
    return {
      rows: (truncated ? rows.slice(0, EXPORT_ROW_LIMIT) : rows) as unknown as InvoiceTableRow[],
      truncated,
    };
  },
  []
);
