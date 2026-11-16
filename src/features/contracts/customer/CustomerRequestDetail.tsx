import { useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ChatOutlinedIcon from '@mui/icons-material/ChatOutlined';
import { PageBreadcrumbs } from '@/shared/ui/PageBreadcrumbs';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import type { ServiceRequest } from '../api/contractApi';
import { ContractLifecycleStepper } from '../shared/ContractLifecycleStepper';
import { RequestHeaderBar } from '../shared/RequestHeaderBar';
import { QuoteTermsSummary } from '../shared/QuoteTermsSummary';
import {
  formatFlightWindow,
  getEffectiveRequestStatus,
  resolveActiveStepIndex,
  resolveCurrentQuote,
} from '../shared/contractStage';
import { CustomerWaitingQuoteStep } from './steps/CustomerWaitingQuoteStep';
import { CustomerReviewQuoteStep } from './steps/CustomerReviewQuoteStep';
import { CustomerSignedContractStep } from './steps/CustomerSignedContractStep';
import { CustomerOccurrencesStep } from './steps/CustomerOccurrencesStep';

interface CustomerRequestDetailProps {
  request: ServiceRequest;
  isSyncing: boolean;
  onBackToList: () => void;
  onChanged: () => void;
  onError: (message: string) => void;
  onOpenInbox: (requestId: string) => void;
}

export function CustomerRequestDetail({
  request,
  isSyncing,
  onBackToList,
  onChanged,
  onError,
  onOpenInbox,
}: CustomerRequestDetailProps) {
  const { locale, t } = useLocale();
  const effectiveStatus = getEffectiveRequestStatus(request);
  const currentQuote = resolveCurrentQuote(request);
  const activeStep = resolveActiveStepIndex(effectiveStatus, 'CUSTOMER');
  const stageKey = `${request.id}:${effectiveStatus}`;
  const [viewedState, setViewedState] = useState<{ key: string; step: number } | null>(null);
  const viewedStep = viewedState?.key === stageKey ? viewedState.step : activeStep;
  const isViewingPastStep = viewedStep < activeStep;

  const renderCompletedBanner = () => (
    <Alert
      severity="info"
      sx={{ borderRadius: '8px', alignItems: 'center' }}
      action={
        <Button
          size="small"
          variant="outlined"
          startIcon={<ArrowBackRoundedIcon fontSize="small" />}
          onClick={() => setViewedState(null)}
          sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}
        >
          {locale === 'vi' ? 'Quay về bước hiện tại' : 'Back to current step'}
        </Button>
      }
    >
      {locale === 'vi'
        ? 'Đang xem lại thông tin của bước đã hoàn thành (chỉ đọc).'
        : 'Viewing a completed step (read-only).'}
    </Alert>
  );

  const renderStageBody = () => {
    if (viewedStep === 0) {
      if (effectiveStatus === 'OPEN') {
        return <CustomerWaitingQuoteStep request={request} onOpenInbox={onOpenInbox} />;
      }
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
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
          >
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {t('1. Request submitted')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {request.requestType === 'ONE_TIME'
                  ? request.requestedFrom
                  : `${request.requestedFrom} – ${request.requestedUntil}`}{' '}
                · {formatFlightWindow(request.windowStart, request.windowEnd, t)} ·{' '}
                {new Date(request.createdAt).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US', {
                  timeZone: request.timezone,
                })}
              </Typography>
            </Box>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ChatOutlinedIcon fontSize="small" />}
              onClick={() => onOpenInbox(request.id)}
              sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, flexShrink: 0 }}
            >
              Messages
            </Button>
          </Stack>
        </Box>
      );
    }

    if (viewedStep === 1) {
      if (effectiveStatus === 'QUOTED' && currentQuote) {
        return (
          <CustomerReviewQuoteStep
            request={request}
            quote={currentQuote}
            onChanged={onChanged}
            onError={onError}
            onOpenInbox={onOpenInbox}
          />
        );
      }
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
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {t('Current quote')}
              </Typography>
              <Chip
                size="small"
                color="success"
                label={t('Accepted · locked')}
                sx={{ borderRadius: '6px' }}
              />
            </Stack>
            {currentQuote ? (
              <QuoteTermsSummary request={request} quote={currentQuote} />
            ) : (
              <Typography variant="body2" color="text.secondary">
                {t('Commercial terms settled under active dispatch schedule.')}
              </Typography>
            )}
          </Stack>
        </Box>
      );
    }

    if (viewedStep === 2) {
      return <CustomerSignedContractStep request={request} onError={onError} />;
    }

    if (request.occurrences.length > 0) {
      return <CustomerOccurrencesStep request={request} onError={onError} />;
    }
    return <CustomerSignedContractStep request={request} onError={onError} />;
  };

  return (
    <Stack spacing={2.5}>
      <Stack
        direction="row"
        sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}
      >
        <PageBreadcrumbs
          items={[
            { label: t('Service requests'), onClick: onBackToList },
            { label: request.description },
          ]}
        />
        {isSyncing && (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <CircularProgress size={16} />
            <Typography variant="caption" color="text.secondary">
              {t('Syncing...')}
            </Typography>
          </Stack>
        )}
      </Stack>

      <RequestHeaderBar request={request} effectiveStatus={effectiveStatus} />
      <ContractLifecycleStepper
        status={effectiveStatus}
        role="CUSTOMER"
        selectedStep={viewedStep}
        onSelectStep={(stepIndex) =>
          setViewedState(stepIndex === activeStep ? null : { key: stageKey, step: stepIndex })
        }
      />
      {isViewingPastStep && renderCompletedBanner()}
      {renderStageBody()}
    </Stack>
  );
}
