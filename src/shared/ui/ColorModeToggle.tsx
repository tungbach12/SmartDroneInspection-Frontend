import { IconButton, Tooltip } from '@mui/material';
import { useColorMode, useIsDarkMode } from '@/app/layouts/ColorModeContext';
import { GlassMoonIcon, GlassSunIcon } from './GradientGlassIcons';

export function ColorModeToggle() {
  const { toggle } = useColorMode();
  const isDark = useIsDarkMode();
  const nextMode = isDark ? 'light' : 'dark';

  return (
    <Tooltip title={`Use ${nextMode} mode`}>
      <IconButton color="inherit" onClick={toggle} aria-label={`Use ${nextMode} mode`}>
        {isDark ? <GlassSunIcon size={18} /> : <GlassMoonIcon size={18} />}
      </IconButton>
    </Tooltip>
  );
}
