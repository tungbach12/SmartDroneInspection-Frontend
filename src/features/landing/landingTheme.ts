import { useTheme } from '@mui/material/styles';
import type { PaletteMode } from '@mui/material';

export interface LandingColors {
  ink: string;
  panel: string;
  panelRaised: string;
  paper: string;
  surface: string;
  text: string;
  muted: string;
  inverse: string;
  teal: string;
  tealDark: string;
  amber: string;
  red: string;
  line: string;
  lightLine: string;
  hero: string;
  heroText: string;
  heroMuted: string;
  heroLine: string;
  heroOverlay: string;
  heroCaption: string;
}

const lightColors: LandingColors = {
  ink: '#101a22',
  panel: '#172631',
  panelRaised: '#203642',
  paper: '#f2f9fd',
  surface: '#ffffff',
  text: '#173a52',
  muted: '#5a7a8e',
  inverse: '#f0f8fd',
  teal: '#3fb6d8',
  tealDark: '#2293b4',
  amber: '#d69a3a',
  red: '#c05050',
  line: 'rgba(23, 68, 92, 0.10)',
  lightLine: 'rgba(255, 255, 255, 0.16)',
  hero: '#eaf5fb',
  heroText: '#173a52',
  heroMuted: '#5a7a8e',
  heroLine: 'rgba(23, 68, 92, 0.12)',
  heroOverlay: 'rgba(234, 245, 251, 0.84)',
  heroCaption: 'rgba(23, 58, 82, 0.58)',
};

const darkColors: LandingColors = {
  ink: '#071014',
  panel: '#0e1b22',
  panelRaised: '#152a33',
  paper: '#101c22',
  surface: '#17252c',
  text: '#e8f1ef',
  muted: '#a4b3b5',
  inverse: '#effaf6',
  teal: '#45d8c4',
  tealDark: '#68e4d2',
  amber: '#f3bf6a',
  red: '#ef8b83',
  line: 'rgba(230, 244, 240, 0.14)',
  lightLine: 'rgba(255, 255, 255, 0.16)',
  hero: '#071014',
  heroText: '#effaf6',
  heroMuted: 'rgba(239, 250, 246, 0.72)',
  heroLine: 'rgba(255, 255, 255, 0.16)',
  heroOverlay: 'rgba(7, 16, 20, 0.78)',
  heroCaption: 'rgba(239, 250, 246, 0.58)',
};

export function getLandingColors(mode: PaletteMode): LandingColors {
  return mode === 'dark' ? darkColors : lightColors;
}

export function useLandingColors(): LandingColors {
  const theme = useTheme();
  return getLandingColors(theme.palette.mode);
}
