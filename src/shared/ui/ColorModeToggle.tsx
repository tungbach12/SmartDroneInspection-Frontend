import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { IconButton, Tooltip, useTheme } from '@mui/material';
import { useColorMode } from '@/app/layouts/ColorModeContext';

export function ColorModeToggle() {
  const theme = useTheme();
  const { toggle } = useColorMode();
  const isDark = theme.palette.mode === 'dark';
  const nextMode = isDark ? 'light' : 'dark';

  return (
    <Tooltip title={`Use ${nextMode} mode`}>
      <IconButton color="inherit" onClick={toggle} aria-label={`Use ${nextMode} mode`}>
        {isDark ? <Brightness7Icon /> : <Brightness4Icon />}
      </IconButton>
    </Tooltip>
  );
}
