export const paletteTokens = {
  ink: '#253746',
  harbor: '#17364A',
  harborLight: '#234C62',
  steel: '#E7EEF1',
  paper: '#F7F9FA',
  white: '#FFFFFF',
  teal: '#5750F1',
  tealSoft: '#EEF2FF',
  amber: '#A96012',
  // Enterprise dark reference (Linear / GitHub Primer / Stripe dark slate hierarchy):
  // Deep carbon canvas (#0B0F17) with elevated slate cards (#111827) and crisp #F1F5F9 text.
  darkCanvas: '#0B0F17',
  darkSurface: '#111827',
  darkRaised: '#1E293B',
  darkText: '#F1F5F9',
  darkMuted: '#94A3B8',
} as const;

export const layoutTokens = {
  pageGutter: { xs: 2, sm: 3, lg: 4 },
  contentMaxWidth: 1440,
  sectionGap: { xs: 3, md: 4 },
  cardGap: { xs: 1.25, md: 1.75 },
  controlRadius: 1.25,
  cardRadius: 2,
  pillRadius: 999,
  shellRailWidth: 272,
  shellHeaderHeight: 72,
} as const;

export const statusTokens = {
  success: { light: '#176B52', dark: '#7BD3AE' },
  warning: { light: '#8C520B', dark: '#F0C16F' },
  error: { light: '#A8323B', dark: '#F08C8B' },
  info: { light: '#225F85', dark: '#8BC7ED' },
} as const;
