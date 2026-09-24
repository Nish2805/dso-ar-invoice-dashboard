const compact = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 2,
})

export function formatCompactNumber(value: number): string {
  return compact.format(value)
}
