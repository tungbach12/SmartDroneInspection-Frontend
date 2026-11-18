import { useState } from 'react';
import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import type { ServiceRequest } from '../../api/contractApi';
import { resolveCurrentQuote } from '../../shared/contractStage';
import { ContractFileBanner } from '../../shared/ContractFileBanner';
import { LegalBasisDialog } from '../../shared/LegalBasisDialog';
import { QuoteTermsSummary } from '../../shared/QuoteTermsSummary';

interface CustomerSignedContractStepProps {
  request: ServiceRequest;
  onError: (message: string) => void;
}

export function CustomerSignedContractStep({
  request,
  onError,
}: CustomerSignedContractStepProps) {
  const { t } = useLocale();
  const [legalOpen, setLegalOpen] = useState(false);
  const currentQuote = resolveCurrentQuote(request);

  if (request.contractFileName) {
    return (
      <Stack spacing={2}>
        <ContractFileBanner request={request} onError={onError} />
        {currentQuote && (
          <Box
            sx={{
              p: 2,
              borderRadius: '10px',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            <Stack
              direction="row"
              sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {t('Current terms')}
              </Typography>
              <Chip
                size="small"
                color="success"
                label={t('Accepted · locked')}
                sx={{ borderRadius: '6px' }}
              />
            </Stack>
            <QuoteTermsSummary request={request} quote={currentQuote} />
          </Box>
        )}
      </Stack>
    );
  }

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

        <Typography variant="body2" color="text.secondary">
          {t(
            'Both parties sign the paper contract offline. The Manager uploads the signed scan to unlock scheduling.',
          )}
        </Typography>
      </Stack>

      <LegalBasisDialog open={legalOpen} onClose={() => setLegalOpen(false)} />
    </Box>
  );
}
