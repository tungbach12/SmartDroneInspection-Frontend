import { type ReactNode, useState } from 'react';
import { Avatar, Box, Button, ButtonBase, Chip, Paper, Stack, Typography } from '@mui/material';
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { useAssetDocuments } from '@/features/assets/hooks/useAssetDocuments';
import { useAsset } from '@/features/assets/hooks/useAssets';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { StatusChip } from '@/shared/ui/StatusChip';
import type { ServiceRequest } from '../api/contractApi';
import { AssetOverviewDialog } from './AssetOverviewDialog';
import { CheckpointsOverviewDialog } from './CheckpointsOverviewDialog';
import {
  type ContractRole,
  formatRequestScheduleSummary,
  getEffectiveRequestStatus,
  getStatusLabel,
  resolveAssetDisplay,
  statusTone,
} from './contractStage';

interface RequestOverviewCardProps {
  request: ServiceRequest;
  role: ContractRole;
  effectiveStatus?: ServiceRequest['status'];
}

function OverviewField({
  label,
  value,
  tabular = false,
}: {
  label: string;
  value: ReactNode;
  tabular?: boolean;
}) {
  return (
    <Box sx={{ minWidth: 0 }}>
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
          mb: 0.25,
        }}
      >
        {label}
      </Typography>
      {typeof value === 'string' ? (
        <Typography
          variant="body2"
          noWrap
          title={value}
          sx={{
            color: 'text.primary',
            fontWeight: 600,
            fontSize: '0.84rem',
            lineHeight: 1.35,
            fontVariantNumeric: tabular ? 'tabular-nums' : undefined,
          }}
        >
          {value}
        </Typography>
      ) : (
        <Box
          sx={{
            color: 'text.primary',
            fontWeight: 600,
            fontSize: '0.84rem',
            lineHeight: 1.35,
            minWidth: 0,
            fontVariantNumeric: tabular ? 'tabular-nums' : undefined,
          }}
        >
          {value}
        </Box>
      )}
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
}: RequestOverviewCardProps) {
  const { locale, t, formatDate } = useLocale();
  const [expanded, setExpanded] = useState(false);
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
  const compactLocation = assetDisplay.location
    ? assetDisplay.location.replace(/^Pinned Location\s*\(([^)]+)\)$/i, '$1')
    : '—';
  const activeOccurrences = (request.occurrences ?? []).filter((occ) => occ.status !== 'CANCELLED');
  const assignedOccurrences = activeOccurrences.filter(
    (occ) => occ.status === 'ASSIGNED' || Boolean(occ.inspectorId) || Boolean(occ.droneId),
  );
  const recurringProgressLabel =
    request.requestType === 'RECURRING' && activeOccurrences.length > 1
      ? locale === 'vi'
        ? `${assignedOccurrences.length}/${activeOccurrences.length} đợt đã gán`
        : `${assignedOccurrences.length}/${activeOccurrences.length} ${t('occurrences assigned')}`
      : null;

  const checkpointCount = assetDisplay.checkpointLabels.length;
  const checkpointsCountLabel =
    checkpointCount === 1
      ? `1 ${t('checkpoint')}`
      : `${checkpointCount} ${t('checkpoints')}`;
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
          alignItems: 'center',
          justifyContent: 'flex-start',
          maxWidth: '100%',
          textAlign: 'left',
          borderRadius: '6px',
          px: 0.5,
          mx: -0.5,
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
        <Typography
          component="span"
          className="checkpoints-count-label"
          noWrap
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

  const scheduledCount =
    request.requestType === 'RECURRING'
      ? request.occurrenceCount ?? request.occurrences.length
      : 0;

  const summaryFields: Array<{ label: string; value: ReactNode; tabular?: boolean }> =
    role === 'MANAGER'
      ? [
          { label: t('Customer'), value: renderStakeholderValue(request.ownerCustomerName || '—') },
          { label: t('Manager'), value: managerValue },
          { label: t('Checkpoints'), value: checkpointsValue },
          { label: t('Requested window'), value: scheduleLabel, tabular: true },
        ]
      : [
          { label: t('Service manager'), value: managerValue },
          { label: t('Location'), value: compactLocation },
          { label: t('Checkpoints'), value: checkpointsValue },
          { label: t('Requested window'), value: scheduleLabel, tabular: true },
        ];

  const detailFields: Array<{ label: string; value: ReactNode; tabular?: boolean }> =
    recurringProgressLabel
      ? [{ label: t('Occurrences'), value: recurringProgressLabel, tabular: true }]
      : [];

  const hasOverviewPanel = detailFields.length > 0;

  return (
    <>
      <Paper
        elevation={0}
        sx={{
          px: { xs: 1.75, sm: 2.25 },
          py: { xs: 1.25, sm: 1.5 },
          borderRadius: '10px',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          boxShadow: 'none',
        }}
      >
        <Stack spacing={1.25}>
          <Stack
            direction="row"
            spacing={1.5}
            sx={{
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              rowGap: 0.75,
              gap: 1.5,
            }}
          >
            <Stack
              direction="row"
              spacing={1.25}
              sx={{
                alignItems: 'center',
                flexWrap: 'wrap',
                rowGap: 0.5,
                minWidth: 0,
                flex: 1,
              }}
            >
              <ButtonBase
                type="button"
                onClick={() => setAssetDialogOpen(true)}
                aria-label={`${t('View full asset details')}: ${assetDisplay.name}`}
                title={t('View full asset details')}
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
              </ButtonBase>
              <StatusChip
                status={resolvedStatus}
                label={getStatusLabel(resolvedStatus, t)}
                tone={statusTone(resolvedStatus)}
              />
              <Chip
                size="small"
                variant="outlined"
                label={request.requestType === 'ONE_TIME' ? t('One-time') : t('Recurring')}
                sx={{ height: 22, fontSize: '0.75rem', fontWeight: 600 }}
              />
              {scheduledCount > 0 && (
                <Chip
                  size="small"
                  variant="outlined"
                  label={`${scheduledCount} ${t('occurrences')}`}
                  sx={{ height: 22, fontSize: '0.75rem', fontWeight: 600 }}
                />
              )}
            </Stack>

            {hasOverviewPanel && (
              <Button
                size="small"
                variant="text"
                aria-expanded={expanded}
                endIcon={
                  expanded ? (
                    <ExpandLessRoundedIcon fontSize="small" />
                  ) : (
                    <ExpandMoreRoundedIcon fontSize="small" />
                  )
                }
                onClick={() => setExpanded((value) => !value)}
                sx={{ textTransform: 'none', fontWeight: 600, minWidth: 'auto', px: 1, flexShrink: 0 }}
              >
                {t('Overview')}
              </Button>
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
            {summaryFields.map((field) => (
              <OverviewField
                key={field.label}
                label={field.label}
                value={field.value}
                tabular={Boolean(field.tabular)}
              />
            ))}
          </Box>
        </Stack>

        {hasOverviewPanel && expanded && (
          <Box
            sx={{
              mt: 1.5,
              pt: 1.5,
              borderTop: '1px solid',
              borderColor: 'divider',
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, minmax(0, 1fr))',
                sm: 'repeat(2, minmax(0, 1fr))',
                md: 'repeat(4, minmax(0, 1fr))',
              },
              gap: { xs: 1.25, md: 2 },
            }}
          >
            {detailFields.map((field) => (
              <OverviewField
                key={field.label}
                label={field.label}
                value={field.value}
                tabular={Boolean(field.tabular)}
              />
            ))}
          </Box>
        )}
      </Paper>

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
    </>
  );
}
