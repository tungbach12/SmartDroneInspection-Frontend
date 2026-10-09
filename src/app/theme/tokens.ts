export const paletteTokens = {
  ink: '#253746',
  harbor: '#17364A',
  harborLight: '#234C62',
  steel: '#E7EEF1',
  paper: '#F7F9FA',
  white: '#FFFFFF',
  teal: '#087E8B',
  tealSoft: '#D9EFF0',
  amber: '#A96012',
  // Lytic dark reference: cool slate canvas with near-black chrome and panels.
  darkCanvas: '#111827',
  darkSurface: '#030712',
  darkRaised: '#1F2937',
  darkText: '#CDCDD0',
  darkMuted: '#9CA3AF',
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
