export const layoutTokens = {
  pageGutter: { xs: 2, sm: 3, lg: 4 },
  sectionGap: { xs: 4, md: 6 },
  cardGap: 1.5,
  controlRadius: 1.5,
  cardRadius: 2.5,
  pillRadius: 999,
} as const;

export const statusTokens = {
  success: { light: '#13795b', dark: '#73d7b0' },
  warning: { light: '#9a5b00', dark: '#f2c56f' },
  error: { light: '#b33b3b', dark: '#f08b86' },
  info: { light: '#1d5fa7', dark: '#8fc2ff' },
} as const;
