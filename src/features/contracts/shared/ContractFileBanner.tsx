import { useState } from 'react';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import type { ServiceRequest } from '../api/contractApi';
import { useDownloadSignedContract } from '../hooks/useContracts';
import { extractContractErrorText } from './contractStage';
import { LegalBasisDialog } from './LegalBasisDialog';

interface ContractFileBannerProps {
  request: ServiceRequest;
  onError: (message: string) => void;
}

export function ContractFileBanner({ request, onError }: ContractFileBannerProps) {
  const { t } = useLocale();
  const download = useDownloadSignedContract();
  const [legalOpen, setLegalOpen] = useState(false);

  if (!request.contractFileName) return null;

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
      onError(extractContractErrorText(error, 'Unable to download contract.'));
    }
  };

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: '10px',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Stack spacing={1.5}>
        <Stack
          direction="row"
          sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}
        >
          <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
            {t('Paper contract evidence')}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            color="inherit"
            startIcon={<InfoOutlinedIcon fontSize="small" />}
            onClick={() => setLegalOpen(true)}
            sx={{
              textTransform: 'none',
              fontSize: '0.75rem',
              fontWeight: 600,
              borderRadius: '6px',
              borderColor: 'divider',
              color: 'text.secondary',
            }}
          >
            {t('Legal basis & terms')}
          </Button>
        </Stack>

        <Alert severity="success" sx={{ borderRadius: '8px' }}>
          {t('Signed scan recorded')}: {request.contractFileName} · {request.contractContentType} ·{' '}
          {request.contractSizeBytes} bytes
        </Alert>

        <Box>
          <LoadingButton
            variant="contained"
            color="success"
            size="small"
            startIcon={<FileDownloadOutlinedIcon />}
            loading={download.isPending}
            onClick={() => void downloadContract()}
            sx={{ borderRadius: '8px', fontWeight: 700, textTransform: 'none', boxShadow: 'none' }}
          >
            {t('Download signed contract')}
          </LoadingButton>
        </Box>
      </Stack>

      <LegalBasisDialog open={legalOpen} onClose={() => setLegalOpen(false)} />
    </Box>
  );
}
