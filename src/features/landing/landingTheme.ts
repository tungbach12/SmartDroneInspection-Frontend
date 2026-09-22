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
  paper: '#f7faf8',
  surface: '#ffffff',
  text: '#15242c',
  muted: '#60717b',
  inverse: '#f4faf7',
  teal: '#12a795',
  tealDark: '#087d71',
  amber: '#b87500',
  red: '#b94343',
  line: 'rgba(21, 36, 44, 0.12)',
  lightLine: 'rgba(255, 255, 255, 0.16)',
  hero: '#f7faf8',
  heroText: '#15242c',
  heroMuted: '#60717b',
  heroLine: 'rgba(21, 36, 44, 0.14)',
  heroOverlay: 'rgba(247, 250, 248, 0.84)',
  heroCaption: 'rgba(21, 36, 44, 0.58)',
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
