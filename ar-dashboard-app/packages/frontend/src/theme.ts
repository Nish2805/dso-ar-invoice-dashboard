export const Z = {
  pageFrom: '#f9f9f7',
  pageVia: '#f4f6f6',
  pageTo: '#eef2f1',
  glass: '#ffffff',
  glassBorder: '#e1e0d9',
  glassHover: '#f4f6f6',
  textPrimary: '#0b0b0b',
  textSecondary: '#52514e',
  muted: '#898781',
  gridline: '#e1e0d9',
  baseline: '#c3c2b7',
  sequential: '#2a78d6',
  sequentialSoft: 'rgba(42,120,214,0.12)',
  accentViolet: '#4a3aa7',
  comparisonMuted: '#9a9a92',
  statusWarning: '#fab219',
  statusCritical: '#d03b3b',
  deltaGood: '#006300',
  navy: '#0c2b3a',
  navyDeep: '#081c26',
  teal: '#12707a',
  gradientPrimary: 'linear-gradient(135deg, #2a78d6 0%, #12707a 100%)',
  gradientGlow:
    'radial-gradient(circle, rgba(42,120,214,0.12) 0%, rgba(18,112,122,0.0) 70%)',
} as const;

const compactFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 2,
});

export function formatCompact(value: number): string {
  return compactFormatter.format(value);
}
