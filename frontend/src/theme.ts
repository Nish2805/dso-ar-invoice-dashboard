// DIEZ corporate light theme — white content surface, dark navy/teal sidebar and
// accents (echoing the DIEZ template's faceted corner graphic), blue as the primary
// data hue. Light-mode steps from the dataviz skill's validated default palette.
export const theme = {
  // Page background
  pageFrom: '#f9f9f7',
  pageVia: '#f4f6f6',
  pageTo: '#eef2f1',

  // Card surface (light — "glass" name kept for prop/API compatibility with
  // existing components, now means "card surface" rather than dark glassmorphism)
  glass: '#ffffff',
  glassBorder: '#e1e0d9',
  glassHover: '#f4f6f6',

  // Text
  textPrimary: '#0b0b0b',
  textSecondary: '#52514e',
  muted: '#898781',

  // Chart chrome
  gridline: '#e1e0d9',
  baseline: '#c3c2b7',

  // Data hues — validated light-mode steps from the dataviz skill's default palette
  sequential: '#2a78d6', // blue — primary series
  sequentialSoft: 'rgba(42,120,214,0.12)',
  accentViolet: '#4a3aa7', // violet — gradient partner (chrome only, never data)
  comparisonMuted: '#9a9a92', // neutral gray for "previous period" reference series

  // Reserved status palette (dataviz skill) — never reused as a series color
  statusWarning: '#fab219',
  statusCritical: '#d03b3b',
  deltaGood: '#006300',

  // Brand chrome (sidebar, header wordmark, decorative facets) — dark navy/teal
  navy: '#0c2b3a',
  navyDeep: '#081c26',
  teal: '#12707a',

  // Decorative gradients (chrome only, never data)
  gradientPrimary: 'linear-gradient(135deg, #2a78d6 0%, #12707a 100%)',
  gradientGlow: 'radial-gradient(circle, rgba(42,120,214,0.12) 0%, rgba(18,112,122,0.0) 70%)',
} as const
