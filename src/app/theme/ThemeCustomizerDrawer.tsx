import { Box, Drawer, IconButton, Typography } from '@mui/material';
import CloseRounded from '@mui/icons-material/CloseRounded';
import PaletteOutlined from '@mui/icons-material/PaletteOutlined';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { ThemeCustomizationPanel } from './ThemeCustomizationPanel';

interface ThemeCustomizerDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function ThemeCustomizerDrawer({ open, onClose }: ThemeCustomizerDrawerProps) {
  const { locale } = useLocale();
  const isVi = locale === 'vi';

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        backdrop: {
          sx: {
            bgcolor: 'rgba(9, 9, 11, 0.24)',
          },
        },
        paper: {
          sx: {
            width: { xs: '100%', sm: 400 },
            maxWidth: '100vw',
            bgcolor: 'background.paper',
            borderLeft: '1px solid',
            borderColor: 'divider',
            boxShadow: 'none',
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: '8px',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.default',
              display: 'grid',
              placeItems: 'center',
              color: 'primary.main',
              flexShrink: 0,
            }}
          >
            <PaletteOutlined fontSize="small" />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
              {isVi ? 'Tùy chỉnh giao diện' : 'Customize theme'}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
              {isVi
                ? 'Chọn bảng màu mặc định hoặc ảnh nền cá nhân'
                : 'Select default, preset themes, or upload wallpaper'}
            </Typography>
          </Box>
        </Box>

        <IconButton
          onClick={onClose}
          size="small"
          aria-label={isVi ? 'Đóng tùy chỉnh giao diện' : 'Close theme customizer'}
          sx={{
            borderRadius: '8px',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <CloseRounded fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5 }}>
        <ThemeCustomizationPanel showColorModeToggle compact />
      </Box>
    </Drawer>
  );
}
