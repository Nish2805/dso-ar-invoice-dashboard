export interface Filters {
  entity?: string;
  invoiceType?: string;
  trxClass?: string;
  year?: number;
  month?: number;
  // Chart-click-only filters — no dropdown in the filter bar.
  customerId?: string;
  invoiceSource?: string;
}

export const EMPTY_FILTERS: Filters = {};

export function hasActiveFilters(filters: Filters): boolean {
  return Object.values(filters).some((v) => v !== undefined);
}
