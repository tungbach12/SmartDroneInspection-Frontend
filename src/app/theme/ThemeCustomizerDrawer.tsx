import { Box, Dialog, IconButton, Typography } from '@mui/material';
import CloseRounded from '@mui/icons-material/CloseRounded';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { GlassIconBadge, GlassPaletteIcon } from '@/shared/ui/GradientGlassIcons';
import { ThemeCustomizationPanel } from './ThemeCustomizationPanel';

interface ThemeCustomizerDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function ThemeCustomizerDrawer({ open, onClose }: ThemeCustomizerDrawerProps) {
  const { locale } = useLocale();
  const isVi = locale === 'vi';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="theme-customizer-dialog-title"
      slotProps={{
        backdrop: {
          sx: {
            bgcolor: 'rgba(9, 9, 11, 0.28)',
          },
        },
        paper: {
          sx: {
            width: '100%',
            maxWidth: 740,
            maxHeight: '88dvh',
            borderRadius: '10px',
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.16)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          },
        },
      }}
    >
      <Box
        sx={{
          px: 3,
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
          <GlassIconBadge size={36} borderRadius="10px" tone="indigo">
            <GlassPaletteIcon size={18} />
          </GlassIconBadge>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              id="theme-customizer-dialog-title"
              variant="subtitle1"
              sx={{ fontWeight: 700, lineHeight: 1.3 }}
            >
              {isVi ? 'Tùy chỉnh giao diện & Con trỏ chuột' : 'Customize Theme & Cursor'}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
              {isVi
                ? 'Chọn chủ đề, ảnh nền cá nhân, kiểu con trỏ chuột và màu sắc theo ý thích'
                : 'Personalize color themes, wallpapers, mouse cursor design, and cursor color'}
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

      <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 2, sm: 3 } }}>
        <ThemeCustomizationPanel showColorModeToggle />
      </Box>
    </Dialog>
  );
}
