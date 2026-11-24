import { type ReactNode, useState } from 'react';
import { Avatar, Box, Button, ButtonBase, Chip, Stack, Typography } from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import { useAssetDocuments } from '@/features/assets/hooks/useAssetDocuments';
import { useAsset } from '@/features/assets/hooks/useAssets';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
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

function OverviewField({
  label,
  value,
  tabular = false,
  spanTwo = false,
}: {
  label: string;
  value: ReactNode;
  tabular?: boolean;
  spanTwo?: boolean;
}) {
  return (
    <Box
      sx={{
        minWidth: 0,
        gridColumn: spanTwo ? { xs: 'span 2', md: 'span 2' } : undefined,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          color: 'text.secondary',
          fontSize: '0.75rem',
          fontWeight: 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          lineHeight: 1.2,
          mb: 0.35,
        }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        component="div"
        sx={{
          color: 'text.primary',
          fontWeight: 600,
          fontSize: '0.84rem',
          lineHeight: 1.38,
          overflowWrap: 'anywhere',
          fontVariantNumeric: tabular ? 'tabular-nums' : undefined,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

function renderStakeholderValue(name: string, avatarUrl?: string | null): ReactNode {
  const trimmed = name.trim();
  if (!trimmed || trimmed === '—') {
    return '—';
  }
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
      <Avatar
        src={avatarUrl || undefined}
        alt={trimmed}
        sx={{ width: 22, height: 22, fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}
      >
        {trimmed.slice(0, 1).toUpperCase()}
      </Avatar>
      <Typography
        variant="body2"
        component="span"
        noWrap
        title={trimmed}
        sx={{
          color: 'text.primary',
          fontWeight: 600,
          fontSize: '0.84rem',
          lineHeight: 1.35,
        }}
      >
        {trimmed}
      </Typography>
    </Stack>
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
  const documentsQuery = useAssetDocuments(request.assetId);
  const assetDisplay = resolveAssetDisplay(request, assetQuery.data);
  const signedInUserName = useAuthStore((state) => state.userName);
  const signedInUserAvatarUrl = useAuthStore((state) => state.user?.avatarUrl);

  const imageDocs = (documentsQuery?.data ?? []).filter((doc) =>
    doc.contentType?.toLowerCase().startsWith('image/'),
  );
  const primaryImageDoc =
    imageDocs.find((doc) => doc.documentType === 'ASSET_PHOTO') ?? imageDocs[0] ?? null;

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
          px: 0.5,
          mx: -0.5,
          py: 0.15,
          my: -0.15,
          transition: 'color 150ms ease, background-color 150ms ease',
          '&:hover': {
            bgcolor: 'action.hover',
          },
          '&:hover .checkpoints-count-label': {
            color: 'primary.main',
            textDecoration: 'underline',
          },
        }}
      >
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <Typography
            component="span"
            className="checkpoints-count-label"
            sx={{
              fontWeight: 600,
              fontSize: '0.84rem',
              color: 'text.primary',
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1.35,
            }}
          >
            {checkpointsCountLabel}
          </Typography>
          <OpenInNewRoundedIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
        </Stack>
        <Typography
          component="span"
          variant="caption"
          color="text.secondary"
          noWrap
          sx={{ display: 'block', maxWidth: '100%', fontWeight: 500, lineHeight: 1.3 }}
        >
          {checkpointsPreview}
        </Typography>
      </ButtonBase>
    );

  const managerLabel =
    role === 'MANAGER'
      ? request.serviceManager?.fullName || signedInUserName || '—'
      : request.serviceManager?.fullName || t('Waiting for manager');
  const hasAssignedManager =
    role === 'MANAGER'
      ? Boolean(request.serviceManager?.fullName || signedInUserName)
      : Boolean(request.serviceManager?.fullName);
  const managerAvatarUrl =
    request.serviceManager?.avatarUrl ??
    (role === 'MANAGER' && !request.serviceManager?.fullName ? signedInUserAvatarUrl : undefined);
  const managerValue: ReactNode = hasAssignedManager ? (
    renderStakeholderValue(managerLabel, managerAvatarUrl)
  ) : (
    <Typography
      component="span"
      variant="body2"
      sx={{ fontWeight: 500, fontSize: '0.84rem', color: 'text.secondary', lineHeight: 1.35 }}
    >
      {managerLabel}
    </Typography>
  );

  const fields: Array<{ label: string; value: ReactNode; tabular?: boolean; spanTwo?: boolean }> =
    role === 'MANAGER'
      ? [
          { label: t('Customer'), value: renderStakeholderValue(request.ownerCustomerName || '—') },
          { label: t('Manager'), value: managerValue },
          { label: t('Inspection team'), value: dispatchLabel, tabular: true },
          { label: t('Schedule'), value: scheduleLabel, tabular: true },
          { label: t('Location'), value: assetDisplay.location || '—' },
          { label: t('Asset specs'), value: specsLabel, tabular: true },
          { label: t('Checkpoints'), value: checkpointsValue },
          ...(quotedPriceLabel
            ? [{ label: t('Quoted price'), value: quotedPriceLabel, tabular: true }]
            : []),
          ...(request.contractFileName
            ? [
                {
                  label: t('Signed contract'),
                  value: (
                    <Typography
                      variant="body2"
                      component="span"
                      noWrap
                      title={request.contractFileName}
                      sx={{
                        display: 'block',
                        fontWeight: 600,
                        fontSize: '0.84rem',
                        color: 'text.primary',
                        lineHeight: 1.38,
                      }}
                    >
                      {request.contractFileName}
                    </Typography>
                  ),
                  spanTwo: true,
                },
              ]
            : []),
        ]
      : [
          { label: t('Service manager'), value: managerValue },
          { label: t('Inspection team'), value: dispatchLabel, tabular: true },
          { label: t('Schedule'), value: scheduleLabel, tabular: true },
          {
            label: t('Quoted price'),
            value: quotedPriceLabel || t('Pending quote'),
            tabular: Boolean(quotedPriceLabel),
          },
          { label: t('Location'), value: assetDisplay.location || '—' },
          { label: t('Checkpoints'), value: checkpointsValue },
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
            py: 1.5,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Stack spacing={1.25}>
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5, minWidth: 0 }}
            >
              <ButtonBase
                type="button"
                onClick={() => setAssetDialogOpen(true)}
                aria-label={`${t('View full asset details')}: ${assetDisplay.name}`}
                sx={{
                  textAlign: 'left',
                  borderRadius: '8px',
                  px: 0.5,
                  mx: -0.5,
                  py: 0.25,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1.25,
                  maxWidth: '100%',
                  transition: 'color 150ms ease, background-color 150ms ease',
                  '&:hover': {
                    color: 'primary.main',
                    bgcolor: 'action.hover',
                  },
                  '&:hover .asset-title-text': {
                    color: 'primary.main',
                    textDecoration: 'underline',
                  },
                }}
              >
                {primaryImageDoc && (
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      flexShrink: 0,
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'action.hover',
                      overflow: 'hidden',
                    }}
                  >
                    <AuthenticatedImage
                      src={`/assets/${request.assetId}/documents/${primaryImageDoc.id}/content`}
                      alt={assetDisplay.name}
                      maxHeight={36}
                      sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  </Box>
                )}
                <Typography
                  component="span"
                  variant="subtitle2"
                  className="asset-title-text"
                  sx={{
                    fontWeight: 700,
                    color: 'text.primary',
                    fontSize: '0.95rem',
                    lineHeight: 1.35,
                  }}
                >
                  {assetDisplay.name}
                </Typography>
                <OpenInNewRoundedIcon sx={{ fontSize: 14, color: 'text.secondary', flexShrink: 0 }} />
              </ButtonBase>
              {assetDisplay.code && (
                <Chip
                  size="small"
                  variant="outlined"
                  label={assetDisplay.code}
                  sx={{
                    height: 22,
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    fontVariantNumeric: 'tabular-nums',
                    color: 'text.secondary',
                  }}
                />
              )}
            </Stack>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(2, minmax(0, 1fr))',
                  sm: 'repeat(2, minmax(0, 1fr))',
                  md: 'repeat(4, minmax(0, 1fr))',
                },
                gap: { xs: 1.25, md: 2 },
                pt: 1.15,
                borderTop: '1px solid',
                borderColor: 'divider',
              }}
            >
              {fields.map((field) => (
                <OverviewField
                  key={field.label}
                  label={field.label}
                  value={field.value}
                  tabular={Boolean(field.tabular)}
                  spanTwo={Boolean(field.spanTwo)}
                />
              ))}
            </Box>
          </Stack>
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
