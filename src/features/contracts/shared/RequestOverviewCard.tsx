import { type ReactNode, useState } from 'react';
import { Box, Button, ButtonBase, Stack, Typography } from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import { useAsset } from '@/features/assets/hooks/useAssets';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import type { ServiceRequest } from '../api/contractApi';
import { AssetOverviewDialog } from './AssetOverviewDialog';
import { CheckpointsOverviewDialog } from './CheckpointsOverviewDialog';
import { RequestHeaderBar } from './RequestHeaderBar';
import {
  type ContractRole,
  formatQuotedPriceSummary,
  formatRequestScheduleSummary,
  getEffectiveRequestStatus,
  resolveAssetDisplay,
  summarizeDispatchProgress,
} from './contractStage';

interface FallbackDrone {
  id: string;
  model?: string | null;
  serialNumber?: string | null;
}

interface RequestOverviewCardProps {
  request: ServiceRequest;
  role: ContractRole;
  effectiveStatus?: ServiceRequest['status'];
  fallbackDrones?: FallbackDrone[] | undefined;
}

function OverviewField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        variant="caption"
        sx={{ display: 'block', color: 'text.secondary', fontWeight: 500, fontSize: '0.75rem' }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        component="div"
        sx={{ fontWeight: 600, mt: 0.25, overflowWrap: 'anywhere', lineHeight: 1.4 }}
      >
        {value}
      </Typography>
    </Box>
  );
}

/**
 * Unified request header and collapsible role-aware overview sitting above the 4-step lifecycle
 * body so status, type, and key asset/team context stay together in one compact card.
 */
export function RequestOverviewCard({
  request,
  role,
  effectiveStatus,
  fallbackDrones,
}: RequestOverviewCardProps) {
  const { locale, t, formatDate } = useLocale();
  const [expanded, setExpanded] = useState(true);
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [checkpointsDialogOpen, setCheckpointsDialogOpen] = useState(false);
  const assetQuery = useAsset(request.assetId);
  const assetDisplay = resolveAssetDisplay(request, assetQuery.data);
  const signedInUserName = useAuthStore((state) => state.userName);

  const resolvedStatus = effectiveStatus ?? getEffectiveRequestStatus(request);
  const scheduleLabel = formatRequestScheduleSummary(request, formatDate, locale, t);
  const dispatchLabel = summarizeDispatchProgress(request, locale, t, fallbackDrones);
  const quotedPriceLabel = formatQuotedPriceSummary(request, locale);

  const specParts: string[] = [];
  if (assetDisplay.heightMeters != null) {
    specParts.push(`${assetDisplay.heightMeters} m`);
  }
  if (assetDisplay.footprintAreaSquareMeters != null) {
    specParts.push(
      `${assetDisplay.footprintAreaSquareMeters.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US')} m²`,
    );
  }
  const specsLabel = specParts.length > 0 ? specParts.join(' · ') : '—';
  const checkpointCount = assetDisplay.checkpointLabels.length;
  const checkpointsCountLabel =
    checkpointCount === 1
      ? `1 ${t('checkpoint')}`
      : `${checkpointCount} ${t('checkpoints')}`;
  const checkpointsPreview =
    assetDisplay.checkpointsSource === 'ASSET_SUGGESTED'
      ? t('Asset suggested')
      : assetDisplay.checkpointLabels[0] ?? '';
  const checkpointsValue: ReactNode =
    checkpointCount === 0 ? (
      '—'
    ) : (
      <ButtonBase
        type="button"
        onClick={() => setCheckpointsDialogOpen(true)}
        aria-label={`${t('View checkpoints')}: ${checkpointsCountLabel}`}
        sx={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          textAlign: 'left',
          maxWidth: '100%',
          borderRadius: '6px',
          p: 0.25,
          m: -0.25,
          color: 'primary.main',
          '&:hover': {
            textDecoration: 'underline',
            bgcolor: 'action.hover',
          },
        }}
      >
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <span>{checkpointsCountLabel}</span>
          <OpenInNewRoundedIcon sx={{ fontSize: 13 }} />
        </Stack>
        <Typography
          component="span"
          variant="caption"
          color="text.secondary"
          noWrap
          sx={{ display: 'block', maxWidth: '100%', fontWeight: 500 }}
        >
          {checkpointsPreview}
        </Typography>
      </ButtonBase>
    );

  const managerLabel =
    role === 'MANAGER'
      ? request.serviceManager?.fullName || signedInUserName || '—'
      : request.serviceManager?.fullName || t('Waiting for manager');

  const assetValue: ReactNode = (
    <ButtonBase
      type="button"
      onClick={() => setAssetDialogOpen(true)}
      aria-label={`${t('View full asset details')}: ${assetDisplay.name}`}
      sx={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        textAlign: 'left',
        borderRadius: '6px',
        p: 0.25,
        m: -0.25,
        color: 'primary.main',
        '&:hover': {
          textDecoration: 'underline',
          bgcolor: 'action.hover',
        },
      }}
    >
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <span>{assetDisplay.name}</span>
        <OpenInNewRoundedIcon sx={{ fontSize: 13 }} />
      </Stack>
      {assetDisplay.code && (
        <Typography component="span" variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          {assetDisplay.code}
        </Typography>
      )}
    </ButtonBase>
  );

  const fields: Array<{ label: string; value: ReactNode }> =
    role === 'MANAGER'
      ? [
          { label: t('Asset'), value: assetValue },
          { label: t('Customer'), value: request.ownerCustomerName || '—' },
          { label: t('Manager'), value: managerLabel },
          { label: t('Location'), value: assetDisplay.location || '—' },
          { label: t('Asset specs'), value: specsLabel },
          { label: t('Checkpoints'), value: checkpointsValue },
          { label: t('Schedule'), value: scheduleLabel },
          { label: t('Inspection team'), value: dispatchLabel },
          ...(quotedPriceLabel ? [{ label: t('Quoted price'), value: quotedPriceLabel }] : []),
          ...(request.contractFileName
            ? [{ label: t('Signed contract'), value: request.contractFileName }]
            : []),
        ]
      : [
          { label: t('Asset'), value: assetValue },
          { label: t('Location'), value: assetDisplay.location || '—' },
          { label: t('Checkpoints'), value: checkpointsValue },
          { label: t('Service manager'), value: managerLabel },
          { label: t('Schedule'), value: scheduleLabel },
          { label: t('Quoted price'), value: quotedPriceLabel || t('Pending quote') },
          { label: t('Inspection team'), value: dispatchLabel },
        ];

  return (
    <RequestHeaderBar
      request={request}
      effectiveStatus={resolvedStatus}
      headerAction={
        <Button
          size="small"
          variant="text"
          onClick={() => setExpanded((value) => !value)}
          endIcon={
            <ExpandMoreRoundedIcon
              fontSize="small"
              sx={{
                transform: expanded ? 'rotate(180deg)' : 'none',
                transition: 'transform 150ms ease',
              }}
            />
          }
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          {t('Overview')}
        </Button>
      }
    >
      {expanded && (
        <Box
          sx={{
            px: { xs: 2, sm: 2.5 },
            py: 1.75,
            borderTop: '1px solid',
            borderColor: 'divider',
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, minmax(0, 1fr))',
              sm: 'repeat(3, minmax(0, 1fr))',
              md: 'repeat(4, minmax(0, 1fr))',
            },
            gap: 1.5,
          }}
        >
          {fields.map((field) => (
            <OverviewField key={field.label} label={field.label} value={field.value} />
          ))}
        </Box>
      )}
      <AssetOverviewDialog
        open={assetDialogOpen}
        onClose={() => setAssetDialogOpen(false)}
        assetId={request.assetId}
        asset={assetQuery.data}
        fallbackName={assetDisplay.name}
        fallbackCode={assetDisplay.code}
        fallbackLocation={assetDisplay.location}
      />
      <CheckpointsOverviewDialog
        open={checkpointsDialogOpen}
        onClose={() => setCheckpointsDialogOpen(false)}
        items={assetDisplay.checkpointLabels}
        source={assetDisplay.checkpointsSource}
      />
    </RequestHeaderBar>
  );
}
