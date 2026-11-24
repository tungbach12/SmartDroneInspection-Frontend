import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useLocale } from '@/shared/i18n/LocaleProvider';

interface CheckpointsOverviewDialogProps {
  open: boolean;
  onClose: () => void;
  items: string[];
  source: 'REQUEST' | 'ASSET_SUGGESTED';
}

/**
 * Clean numbered checklist modal so long structural checkpoint descriptions remain readable without
 * bloating the compact 4-column request Overview card.
 */
export function CheckpointsOverviewDialog({
  open,
  onClose,
  items,
  source,
}: CheckpointsOverviewDialogProps) {
  const { t } = useLocale();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="checkpoints-overview-dialog-title"
      slotProps={{
        paper: {
          sx: {
            borderRadius: '10px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      <DialogTitle
        id="checkpoints-overview-dialog-title"
        sx={{
          px: { xs: 2, sm: 3 },
          py: 1.75,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {t('Inspection Checkpoints')}
              </Typography>
              <Chip
                size="small"
                variant="outlined"
                label={items.length}
                sx={{ borderRadius: '6px', fontWeight: 700 }}
              />
              <Chip
                size="small"
                color={source === 'REQUEST' ? 'primary' : 'default'}
                variant="outlined"
                label={
                  source === 'REQUEST'
                    ? t('Configured for this request')
                    : t('Asset suggested')
                }
                sx={{ borderRadius: '6px', fontWeight: 600 }}
              />
            </Stack>
          </Box>
          <IconButton aria-label={t('Close')} onClick={onClose} size="small">
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers sx={{ px: { xs: 2, sm: 3 }, py: 2, bgcolor: 'background.paper' }}>
        {items.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t('No checkpoints configured for this request.')}
          </Typography>
        ) : (
          <Box
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            {items.map((item, index) => (
              <Stack
                key={`${item}-${index}`}
                direction="row"
                spacing={1.5}
                sx={{
                  px: 1.75,
                  py: 1.25,
                  alignItems: 'flex-start',
                  borderBottom: index === items.length - 1 ? 0 : '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', minWidth: 22 }}
                >
                  {index + 1}.
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500, overflowWrap: 'anywhere' }}>
                  {item}
                </Typography>
              </Stack>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', fontWeight: 600 }}>
          {t('Close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
