import { useState } from 'react';
import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { useAsset } from '@/features/assets/hooks/useAssets';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import type { ServiceRequest } from '../../api/contractApi';
import { usePartnerDrones } from '../../hooks/useContracts';
import { formatFlightTimeRange } from '../../shared/contractStage';

interface ManagerAssetOverviewProps {
  request: ServiceRequest;
}

function OverviewField({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        variant="caption"
        sx={{ display: 'block', color: 'text.secondary', fontWeight: 500, fontSize: '0.75rem' }}
      >
        {label}
      </Typography>
      <Typography variant="body2" noWrap title={value} sx={{ fontWeight: 600, mt: 0.25 }}>
        {value}
      </Typography>
    </Box>
  );
}

/**
 * Persistent asset/request context for the Manager detail screen. It sits outside the stage body
 * so the same overview remains visible in every step of the service request.
 */
export function ManagerAssetOverview({ request }: ManagerAssetOverviewProps) {
  const { t, formatDate } = useLocale();
  const [expanded, setExpanded] = useState(true);
  const assetQuery = useAsset(request.assetId);
  const asset = assetQuery.data;
  const signedInManagerName = useAuthStore((state) => state.userName);
  const managerName = request.serviceManager?.fullName || signedInManagerName || '—';

  const droneId = request.occurrences.find((occurrence) => occurrence.droneId)?.droneId ?? null;
  const dronesQuery = usePartnerDrones(Boolean(droneId));
  const drone = dronesQuery.data?.find((item) => item.id === droneId) ?? null;
  const droneLabel = drone ? [drone.model, drone.serialNumber].filter(Boolean).join(' · ') : '—';

  const scheduleStart = formatDate(new Date(`${request.requestedFrom}T00:00:00`));
  const scheduleEnd = formatDate(new Date(`${request.requestedUntil}T00:00:00`));
  const dateLabel =
    request.requestedUntil && request.requestedUntil !== request.requestedFrom
      ? `${scheduleStart} – ${scheduleEnd}`
      : scheduleStart;
  const scheduleLabel = `${dateLabel} · ${formatFlightTimeRange(
    request.windowStart,
    request.windowEnd,
  )}`;

  const assetName = asset?.name || '—';

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '10px',
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{
          px: 2,
          py: 1.5,
          alignItems: { sm: 'center' },
          justifyContent: 'space-between',
          borderBottom: expanded ? '1px solid' : 0,
          borderColor: 'divider',
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
          <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
            {assetName}
          </Typography>
          {asset?.code && (
            <Chip
              size="small"
              label={asset.code}
              variant="outlined"
              sx={{ borderRadius: '6px', fontWeight: 600 }}
            />
          )}
          {asset && (
            <Chip
              size="small"
              label={asset.status}
              variant="outlined"
              sx={{ borderRadius: '6px', fontWeight: 600 }}
            />
          )}
        </Stack>
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
          sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, textTransform: 'none' }}
        >
          {t('Overview')}
        </Button>
      </Stack>

      {expanded && (
        <Box
          sx={{
            px: 2,
            py: 1.75,
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, minmax(0, 1fr))',
              sm: 'repeat(4, minmax(0, 1fr))',
            },
            gap: 1.5,
          }}
        >
          <OverviewField
            label={t('Customer')}
            value={request.ownerCustomerName || '—'}
          />
          <OverviewField label={t('Manager')} value={managerName} />
          <OverviewField label={t('Drone')} value={droneLabel} />
          <OverviewField label={t('Schedule')} value={scheduleLabel} />
        </Box>
      )}
    </Box>
  );
}
