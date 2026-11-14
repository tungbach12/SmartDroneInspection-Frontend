import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { type ServiceRequest } from '../api/contractApi';
import { useDownloadSignedContract, useUploadSignedContract } from '../hooks/useContracts';

interface SignedContractPanelProps {
  request: ServiceRequest;
  manager: boolean;
  onChanged: () => void;
  onError: (message: string) => void;
}

export function SignedContractPanel({
  request,
  manager,
  onChanged,
  onError,
}: SignedContractPanelProps) {
  const { t } = useLocale();
  const upload = useUploadSignedContract(request.id);
  const download = useDownloadSignedContract();
  const [file, setFile] = useState<File | null>(null);
  const [legalDialogOpen, setLegalDialogOpen] = useState(false);

  const submit = async () => {
    if (!file) {
      onError('Choose the signed contract scan (PDF, JPEG, or PNG).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      onError('The signed contract scan must be 10 MB or smaller.');
      return;
    }
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
      onError('Choose a PDF, JPEG, or PNG signed contract scan.');
      return;
    }
    try {
      await upload.mutateAsync(file);
      setFile(null);
      onChanged();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unable to upload contract.';
      onError(msg);
    }
  };

  const downloadContract = async () => {
    try {
      const blob = await download.mutateAsync(request.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = request.contractFileName || 'signed-contract';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unable to download contract.';
      onError(msg);
    }
  };

  return (
    <Card variant="outlined" sx={{ borderRadius: '10px', borderColor: 'divider', boxShadow: 'none' }}>
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Stack
          direction="row"
          sx={{
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 1.5,
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
            {t('Paper contract evidence')}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            color="inherit"
            startIcon={<InfoOutlinedIcon fontSize="small" />}
            onClick={() => setLegalDialogOpen(true)}
            sx={{
              textTransform: 'none',
              fontSize: '0.75rem',
              fontWeight: 600,
              borderRadius: '6px',
              borderColor: 'divider',
              color: 'text.secondary',
              '&:hover': {
                borderColor: 'primary.main',
                color: 'primary.main',
              },
            }}
          >
            {t('Legal basis & terms')}
          </Button>
        </Stack>

        <Dialog
          open={legalDialogOpen}
          onClose={() => setLegalDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          slotProps={{
            paper: {
              sx: {
                borderRadius: '10px',
                bgcolor: 'background.paper',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
              },
            },
          }}
        >
          <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <InfoOutlinedIcon sx={{ color: 'primary.main', fontSize: 20 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {t('Legal basis & mandatory conditions')}
              </Typography>
            </Stack>
            <IconButton size="small" onClick={() => setLegalDialogOpen(false)} aria-label="Close">
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </DialogTitle>
          <Divider />
          <DialogContent sx={{ py: 2 }}>
            <Stack spacing={2}>
              <Box sx={{ p: 1.75, borderRadius: '8px', bgcolor: 'action.hover' }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
                  {t('Commercial service contract')}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.6 }}>
                  {t('(Articles 513–521 Civil Code 91/2015/QH13 & Articles 74–87 Commercial Law 36/2005/QH11): records survey asset scope, occurrence count (One-time / Recurring), VND/occurrence unit price, VAT, and report acceptance milestone prior to payment.')}
                </Typography>
              </Box>

              <Box sx={{ p: 1.75, borderRadius: '8px', bgcolor: 'action.hover' }}>
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
              onClick={() => setLegalDialogOpen(false)}
              sx={{ borderRadius: '6px', fontWeight: 600, px: 2 }}
            >
              {t('Understood')}
            </Button>
          </DialogActions>
        </Dialog>

        {request.contractFileName ? (
          <Paper
            variant="outlined"
            sx={{
              p: 2.5,
              borderRadius: '10px',
              bgcolor: 'success.50',
              borderColor: 'success.light',
            }}
          >
            <Stack spacing={2}>
              <Alert severity="success" sx={{ borderRadius: '8px' }}>
                {t('Signed scan recorded')}: {request.contractFileName} · {request.contractContentType} · {request.contractSizeBytes} bytes
              </Alert>
              <Box>
                <LoadingButton
                  variant="contained"
                  color="success"
                  startIcon={<FileDownloadOutlinedIcon />}
                  loading={download.isPending}
                  onClick={() => void downloadContract()}
                  sx={{ borderRadius: '8px', fontWeight: 700 }}
                >
                  {t('Download signed contract')}
                </LoadingButton>
              </Box>
            </Stack>
          </Paper>
        ) : manager && request.status === 'ACCEPTED' ? (
          <Box sx={{ p: 2.5, bgcolor: 'action.hover', borderRadius: '10px' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('Upload the scan after both parties sign the paper contract offline. No online signature or payment is collected here.')}
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
              <Button component="label" variant="outlined" startIcon={<CloudUploadOutlinedIcon />} sx={{ borderRadius: '8px' }}>
                {file?.name ?? t('Choose signed contract scan')}
                <input
                  hidden
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </Button>
              <LoadingButton
                variant="contained"
                color="primary"
                loading={upload.isPending}
                disabled={!file}
                onClick={() => void submit()}
                sx={{ borderRadius: '8px', fontWeight: 700 }}
              >
                {t('Upload signed scan')}
              </LoadingButton>
            </Stack>
          </Box>
        ) : (
          <Typography color="text.secondary">
            {t('Customer acceptance is required before the Manager can upload contract evidence.')}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
