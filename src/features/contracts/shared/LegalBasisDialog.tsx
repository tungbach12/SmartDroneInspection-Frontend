import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Typography,
  Box,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useLocale } from '@/shared/i18n/LocaleProvider';

interface LegalBasisDialogProps {
  open: boolean;
  onClose: () => void;
}

export function LegalBasisDialog({ open, onClose }: LegalBasisDialogProps) {
  const { t } = useLocale();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: '10px',
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: 'none',
          },
        },
      }}
    >
      <DialogTitle
        sx={{ pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <InfoOutlinedIcon sx={{ color: 'primary.main', fontSize: 20 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {t('Legal basis & mandatory conditions')}
          </Typography>
        </Stack>
        <IconButton size="small" onClick={onClose} aria-label="Close">
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ py: 2 }}>
        <Stack spacing={1.5}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: '8px',
              bgcolor: 'background.default',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
              {t('Commercial service contract')}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.6 }}>
              {t('(Articles 513–521 Civil Code 91/2015/QH13 & Articles 74–87 Commercial Law 36/2005/QH11): records survey asset scope, occurrence count (One-time / Recurring), VND/occurrence unit price, VAT, and report acceptance milestone prior to payment.')}
            </Typography>
          </Box>

          <Box
            sx={{
              p: 1.5,
              borderRadius: '8px',
              bgcolor: 'background.default',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
              {t('Flight permit & UAV category compliance')}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.6 }}>
              {t('(Articles 4, 21, 22 & 27 Decree 288/2025/ND-CP; Air Defense Law 49/2024/QH15): flight permit dossier must be submitted at least 07 working days in advance; each independent flight mission (including post-maintenance re-inspections) requires a valid Flight Permit and pilot with appropriate MTOW license rating (Class A for UAV < 2 kg; Class B for UAV ≥ 2 kg).')}
            </Typography>
          </Box>
        </Stack>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ px: 2.5, py: 1.5 }}>
        <Button
          variant="contained"
          color="primary"
          size="small"
          onClick={onClose}
          sx={{ borderRadius: '8px', fontWeight: 600, px: 2, boxShadow: 'none' }}
        >
          {t('Understood')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
