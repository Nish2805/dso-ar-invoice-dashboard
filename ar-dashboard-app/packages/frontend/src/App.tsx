//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { useState } from 'react';

import { ConcentrationDonut } from './ConcentrationDonut';
import { EconomicsRow } from './EconomicsRow';
import { ExceptionsPanel } from './ExceptionsPanel';
import { EMPTY_FILTERS, type Filters } from './filters';
import { FilterBar } from './FilterBar';
import { InvoiceSourceChart } from './InvoiceSourceChart';
import { InvoiceTable } from './InvoiceTable';
import { InvoiceTypeChart } from './InvoiceTypeChart';
import { KeyInsights } from './KeyInsights';
import { Kpis } from './Kpis';
import { RecentInvoices } from './RecentInvoices';
import { TopCustomers } from './TopCustomers';
import { TrendCharts } from './TrendCharts';
import { Z } from './theme';

function App() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  const handleFiltersChange = (next: Filters) => {
    setFilters(next);
    setPage(1);
  };

  return (
    <div
      className="relative min-h-screen"
      style={{
        background: `radial-gradient(ellipse at top left, ${Z.pageVia} 0%, ${Z.pageFrom} 45%, ${Z.pageTo} 100%)`,
      }}
    >
      <main className="flex flex-1 flex-col gap-5 p-6">
        <div>
          <div className="flex items-baseline gap-3">
            <span
              className="font-display text-sm font-extrabold tracking-widest"
              style={{ color: Z.navy }}
            >
              D<span style={{ color: Z.teal }}>|</span>EZ
            </span>
            <h1
              className="font-display text-2xl font-bold tracking-tight"
              style={{ color: Z.textPrimary }}
            >
              AR Invoice Analysis
            </h1>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
              style={{ background: Z.sequentialSoft, color: Z.sequential }}
            >
              AI Powered Dashboard
            </span>
            <button
              className="print-hide ml-auto rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{ borderColor: Z.sequential, color: Z.sequential }}
              onClick={() => window.print()}
            >
              Download PDF Report
            </button>
          </div>
          <p className="text-xs" style={{ color: Z.muted }}>
            Dubai Silicon Oasis
          </p>
          <div className="mt-3 h-px w-full" style={{ background: Z.gridline }} />
        </div>

        <div className="print-hide">
          <FilterBar filters={filters} onChange={handleFiltersChange} />
        </div>

        <Kpis filters={filters} />

        <TrendCharts filters={filters} onFilterChange={handleFiltersChange} />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <InvoiceTypeChart filters={filters} onFilterChange={handleFiltersChange} />
          <TopCustomers filters={filters} onFilterChange={handleFiltersChange} />
          <ConcentrationDonut filters={filters} />
        </div>

        <InvoiceSourceChart filters={filters} onFilterChange={handleFiltersChange} />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
          <KeyInsights filters={filters} />
          <ExceptionsPanel filters={filters} />
          <EconomicsRow filters={filters} />
          <RecentInvoices filters={filters} />
        </div>

        <InvoiceTable filters={filters} page={page} onPageChange={setPage} />
      </main>
    </div>
  );
}

export default App;
