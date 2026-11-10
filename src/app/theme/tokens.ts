export const fontStack =
  'Inter, "Inter Fallback", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

export const paletteTokens = {
  ink: '#18181B',
  harbor: '#18181B',
  harborLight: '#52525B',
  steel: '#E8E8E8',
  paper: '#F4F4F5',
  insetSurface: '#FCFCFD',
  white: '#FFFFFF',
  teal: '#3758F9',
  tealDark: '#2237EE',
  tealLight: '#06B6D4',
  tealSoft: '#EFF3FF',
  textSecondary: '#52525B',
  textTertiary: '#71717A',
  amber: '#CA8A04',
  darkCanvas: '#09090B',
  darkInset: '#111827',
  darkSurface: '#18181B',
  darkRaised: '#27272A',
  darkText: '#F4F4F5',
  darkMuted: '#A1A1AA',
} as const;

export const layoutTokens = {
  pageGutter: { xs: 2, sm: 3, lg: 4 },
  contentMaxWidth: 1440,
  sectionGap: { xs: 3, md: 4 },
  cardGap: { xs: 1.25, md: 1.75 },
  controlRadius: 1,
  cardRadius: 1.5,
  pillRadius: 999,
  shellRailWidth: 270,
  shellHeaderHeight: 73,
} as const;

export const statusTokens = {
  success: { light: '#16A34A', dark: '#22C55E' },
  warning: { light: '#CA8A04', dark: '#EAB308' },
  error: { light: '#DC2626', dark: '#EF4444' },
  info: { light: '#0284C7', dark: '#38BDF8' },
} as const;
