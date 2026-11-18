import { useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import type { ServiceRequest } from '../../api/contractApi';
import { useUploadSignedContract } from '../../hooks/useContracts';
import { extractContractErrorText, resolveCurrentQuote } from '../../shared/contractStage';
import { ContractFileBanner } from '../../shared/ContractFileBanner';
import { LegalBasisDialog } from '../../shared/LegalBasisDialog';
import { QuoteTermsSummary } from '../../shared/QuoteTermsSummary';

interface ManagerContractUploadStepProps {
  request: ServiceRequest;
  onChanged: () => void;
  onError: (message: string) => void;
}

export function ManagerContractUploadStep({
  request,
  onChanged,
  onError,
}: ManagerContractUploadStepProps) {
  const { t } = useLocale();
  const upload = useUploadSignedContract(request.id);
  const [file, setFile] = useState<File | null>(null);
  const [legalOpen, setLegalOpen] = useState(false);
  const currentQuote = resolveCurrentQuote(request);

  if (request.contractFileName) {
    return <ContractFileBanner request={request} onError={onError} />;
  }

  const submit = async () => {
    if (!file) {
      onError(t('Choose the signed contract scan (PDF, JPEG, or PNG).'));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      onError(t('The signed contract scan must be 10 MB or smaller.'));
      return;
    }
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
      onError(t('Choose a PDF, JPEG, or PNG signed contract scan.'));
      return;
    }
    try {
      await upload.mutateAsync(file);
      setFile(null);
      onChanged();
    } catch (error) {
      onError(extractContractErrorText(error, 'Unable to upload contract.'));
    }
  };

  return (
    <Box
      sx={{
        p: 2.5,
        borderRadius: '10px',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Stack spacing={2}>
        <Stack
          direction="row"
          sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
              {t('Paper contract')}
            </Typography>
          </Stack>
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

        {currentQuote && <QuoteTermsSummary request={request} quote={currentQuote} />}

        <Box
          sx={{
            p: 2,
            borderRadius: '8px',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.default',
          }}
        >
          <Stack spacing={1.5}>
            <Typography variant="body2" color="text.secondary">
              {t('Upload the scan after both parties sign offline.')} ({t('PDF, JPEG, or PNG · max 10 MB')})
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
              <Button
                component="label"
                variant="outlined"
                startIcon={<CloudUploadOutlinedIcon />}
                sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
              >
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
                sx={{ borderRadius: '8px', fontWeight: 700, textTransform: 'none', boxShadow: 'none' }}
              >
                {t('Upload signed scan')}
              </LoadingButton>
            </Stack>
          </Stack>
        </Box>
      </Stack>

      <LegalBasisDialog open={legalOpen} onClose={() => setLegalOpen(false)} />
    </Box>
  );
}
