import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { IconButton, Tooltip } from '@mui/material';
import { useColorMode, useIsDarkMode } from '@/app/layouts/ColorModeContext';

export function ColorModeToggle() {
  const { toggle } = useColorMode();
  const isDark = useIsDarkMode();
  const nextMode = isDark ? 'light' : 'dark';

  return (
    <Tooltip title={`Use ${nextMode} mode`}>
      <IconButton color="inherit" onClick={toggle} aria-label={`Use ${nextMode} mode`}>
        {isDark ? <Brightness7Icon /> : <Brightness4Icon />}
      </IconButton>
    </Tooltip>
  );
}
