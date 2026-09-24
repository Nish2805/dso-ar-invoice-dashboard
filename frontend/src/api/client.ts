import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import type {
  DashboardResponse,
  Filters,
  FilterOptions,
  PaginatedInvoices,
} from '../types/dashboard'

const client = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || '/api' })

export function useFilters() {
  return useQuery({
    queryKey: ['filters'],
    queryFn: async () => (await client.get<FilterOptions>('/filters')).data,
  })
}

export function useDashboard(filters: Filters) {
  return useQuery({
    queryKey: ['dashboard', filters],
    queryFn: async () =>
      (await client.get<DashboardResponse>('/dashboard', { params: filters })).data,
    placeholderData: (prev) => prev,
  })
}

export function useInvoices(filters: Filters, page: number, pageSize = 50) {
  return useQuery({
    queryKey: ['invoices', filters, page, pageSize],
    queryFn: async () =>
      (
        await client.get<PaginatedInvoices>('/invoices', {
          params: { ...filters, page, page_size: pageSize },
        })
      ).data,
    placeholderData: (prev) => prev,
  })
}
