import {
  Alert,
  Button,
  Chip,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import CancelRounded from '@mui/icons-material/CancelRounded';
import GppBadRounded from '@mui/icons-material/GppBadRounded';
import PendingActionsRounded from '@mui/icons-material/PendingActionsRounded';
import SecurityRounded from '@mui/icons-material/SecurityRounded';
import VerifiedUserRounded from '@mui/icons-material/VerifiedUserRounded';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded';
import { StatusChip } from '@/shared/ui/StatusChip';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import {
  evaluateAirspace,
  extractCoordinates,
} from '@/shared/airspace/airspaceZones';
import type {
  FlightPermitVerificationStatus,
  InspectionDetail,
} from '../api/inspectionApi';

export interface FlightPermitVerificationPanelProps {
  inspection: InspectionDetail;
  onPreviewPermit?: () => void;
  compact?: boolean;
  hideHeader?: boolean;
  hideEmptyNotice?: boolean;
  showAirspace?: boolean;
  showPendingPrompt?: boolean;
}

function formatDigestShort(digest: string): string {
  return digest.length > 20 ? `${digest.slice(0, 12)}…${digest.slice(-8)}` : digest;
}

function resolveAirspaceLabel(
  classification: 'NO_FLY_ZONE' | 'RESTRICTED_ZONE' | 'CLEAR_ZONE',
  t: (text: string) => string,
): string {
  switch (classification) {
    case 'NO_FLY_ZONE':
      return t('No-Fly Zone');
    case 'RESTRICTED_ZONE':
      return t('Restricted Zone');
    default:
      return t('Clear Zone');
  }
}

function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function resolveStatusMeta(
  status: FlightPermitVerificationStatus,
  t: (text: string) => string,
) {
  switch (status) {
    case 'APPROVED':
      return {
        label: t('Submitted by Inspector'),
        severity: 'success' as const,
        icon: <CheckCircleRounded fontSize="small" />,
      };
    case 'PENDING_REVIEW':
      return {
        label: t('Re-upload required'),
        severity: 'warning' as const,
        icon: <PendingActionsRounded fontSize="small" />,
      };
    case 'REJECTED':
      return {
        label: t('Invalid — re-upload required'),
        severity: 'error' as const,
        icon: <CancelRounded fontSize="small" />,
      };
    default:
      return {
        label: t('Not uploaded'),
        severity: 'info' as const,
        icon: <SecurityRounded fontSize="small" />,
      };
  }
}

export function FlightPermitVerificationPanel({
  inspection,
  onPreviewPermit,
  compact = false,
  hideHeader = false,
  hideEmptyNotice = false,
  showAirspace = true,
  showPendingPrompt = true,
}: FlightPermitVerificationPanelProps) {
  const { t, formatDateTime } = useLocale();

  const verificationStatus: FlightPermitVerificationStatus =
    inspection.flightPermitVerificationStatus ??
    (inspection.flightPermitFileName ? 'APPROVED' : 'NOT_UPLOADED');
  const hasPermit = Boolean(inspection.flightPermitFileName);
  const statusMeta = resolveStatusMeta(verificationStatus, t);

  const coords = extractCoordinates(
    inspection.locationText,
    inspection.assetLatitude,
    inspection.assetLongitude,
  );
  const airspace =
    coords.latitude != null && coords.longitude != null
      ? evaluateAirspace(coords.latitude, coords.longitude)
      : null;

  const serialMismatch =
    Boolean(inspection.flightPermitDroneSerial) &&
    Boolean(inspection.droneSerialNumber) &&
    inspection.flightPermitDroneSerial!.trim().toLowerCase() !==
      inspection.droneSerialNumber!.trim().toLowerCase();

  const validFromMs = inspection.flightPermitValidFrom
    ? new Date(inspection.flightPermitValidFrom).getTime()
    : Number.NaN;
  const validToMs = inspection.flightPermitValidTo
    ? new Date(inspection.flightPermitValidTo).getTime()
    : Number.NaN;
  const plannedStartMs = inspection.plannedStartAt
    ? new Date(inspection.plannedStartAt).getTime()
    : Number.NaN;
  const plannedEndMs = inspection.plannedEndAt
    ? new Date(inspection.plannedEndAt).getTime()
    : Number.NaN;

  const scheduleOutOfPermitWindow =
    hasPermit &&
    Number.isFinite(validFromMs) &&
    Number.isFinite(validToMs) &&
    ((Number.isFinite(plannedStartMs) && validFromMs > plannedStartMs) ||
      (Number.isFinite(plannedEndMs) && validToMs < plannedEndMs));

  const isPermitExpired =
    hasPermit && Number.isFinite(validToMs) && validToMs < Date.now();

  const hasVisibleBody =
    !hideHeader ||
    (showAirspace && Boolean(airspace)) ||
    Boolean(inspection.flightPermitRejectionReason) ||
    (showPendingPrompt && verificationStatus === 'PENDING_REVIEW') ||
    (!compact && verificationStatus === 'APPROVED') ||
    (!hasPermit && !hideEmptyNotice) ||
    hasPermit;

  if (!hasVisibleBody) {
    return null;
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        p: compact ? 2 : 2.5,
        borderRadius: '12px',
        borderColor:
          verificationStatus === 'REJECTED' ? 'error.main' : 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Stack spacing={1.5}>
        {!hideHeader && (
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{
              alignItems: { sm: 'center' },
              justifyContent: 'space-between',
            }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <VerifiedUserRounded color="primary" fontSize="small" />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {t('Flight Permit')}
              </Typography>
              <StatusChip
                status={verificationStatus}
                label={statusMeta.label}
                tone={statusMeta.severity}
              />
            </Stack>

            {hasPermit && onPreviewPermit && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<VisibilityOutlined fontSize="small" />}
                onClick={onPreviewPermit}
                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px', alignSelf: { xs: 'flex-start', sm: 'center' } }}
              >
                {t('View permit document')}
              </Button>
            )}
          </Stack>
        )}

        {showAirspace && airspace && (
          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: 'center',
              flexWrap: 'wrap',
              px: 1.5,
              py: 1,
              borderRadius: '8px',
              bgcolor: 'action.hover',
            }}
          >
            {airspace.classification === 'NO_FLY_ZONE' ? (
              <GppBadRounded fontSize="small" color="error" />
            ) : airspace.classification === 'RESTRICTED_ZONE' ? (
              <WarningAmberRounded fontSize="small" color="warning" />
            ) : (
              <SecurityRounded fontSize="small" color="info" />
            )}
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              {t('Airspace')}:
            </Typography>
            <Chip
              size="small"
              label={resolveAirspaceLabel(airspace.classification, t)}
              color={
                airspace.classification === 'NO_FLY_ZONE'
                  ? 'error'
                  : airspace.classification === 'RESTRICTED_ZONE'
                    ? 'warning'
                    : 'info'
              }
              variant="outlined"
              sx={{ height: 22, fontSize: '0.75rem', fontWeight: 600 }}
            />
            {airspace.matchingZones[0] && (
              <Typography variant="caption" color="text.secondary">
                {airspace.matchingZones[0].name} ({airspace.matchingZones[0].authority})
              </Typography>
            )}
          </Stack>
        )}

        {inspection.flightPermitRejectionReason && (
          <Alert severity="error" sx={{ borderRadius: '10px' }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {t('Rejection reason')}: {inspection.flightPermitRejectionReason}
            </Typography>
          </Alert>
        )}

        {showPendingPrompt && verificationStatus === 'PENDING_REVIEW' && (
          <Alert severity="warning" icon={statusMeta.icon} sx={{ borderRadius: '10px' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {t(
                'The drone or schedule changed. The assigned Inspector must upload an updated permit before pre-flight.',
              )}
            </Typography>
          </Alert>
        )}

        {!compact && verificationStatus === 'APPROVED' && (
          <Alert severity="success" icon={statusMeta.icon} sx={{ borderRadius: '10px' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {t('Uploaded and self-attested by the assigned Inspector for this mission window.')}
            </Typography>
          </Alert>
        )}

        {!hasPermit && !hideEmptyNotice && (
          <Alert severity="info" sx={{ borderRadius: '10px' }}>
            {t('No flight permit document has been uploaded yet.')}
          </Alert>
        )}

        {(serialMismatch || scheduleOutOfPermitWindow || isPermitExpired) && (
          <Alert severity="error" sx={{ borderRadius: '10px' }}>
            <Stack spacing={0.25}>
              {serialMismatch && (
                <Typography variant="body2">
                  {t('Permit UAV serial does not match the assigned drone serial')}{' '}
                  ({inspection.flightPermitDroneSerial} vs {inspection.droneSerialNumber}).
                </Typography>
              )}
              {scheduleOutOfPermitWindow && (
                <Typography variant="body2">
                  {t('Inspection schedule extends outside the permit validity window.')}
                </Typography>
              )}
              {isPermitExpired && (
                <Typography variant="body2">
                  {t('The recorded flight permit validity window has expired.')}
                </Typography>
              )}
            </Stack>
          </Alert>
        )}

        {hasPermit && (
          <Grid container spacing={1.5}>
            {inspection.flightPermitNumber && (
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant="caption" color="text.secondary">
                  {t('Permit Number')}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {inspection.flightPermitNumber}
                </Typography>
              </Grid>
            )}

            {inspection.flightPermitAuthority && (
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant="caption" color="text.secondary">
                  {t('Issuing Authority')}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {inspection.flightPermitAuthority}
                </Typography>
              </Grid>
            )}

            {inspection.flightPermitDroneSerial && (
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant="caption" color="text.secondary">
                  {t('Permitted Drone Serial')}
                </Typography>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {inspection.flightPermitDroneSerial}
                  </Typography>
                  {inspection.droneSerialNumber && (
                    <Chip
                      size="small"
                      label={serialMismatch ? t('Mismatch') : t('Matches drone')}
                      color={serialMismatch ? 'error' : 'success'}
                      variant="outlined"
                    />
                  )}
                </Stack>
              </Grid>
            )}

            {compact ? (
              (inspection.flightPermitValidFrom || inspection.flightPermitValidTo) && (
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Typography variant="caption" color="text.secondary">
                    {t('Validity Window')}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {[
                      inspection.flightPermitValidFrom
                        ? formatDateTime(new Date(inspection.flightPermitValidFrom))
                        : null,
                      inspection.flightPermitValidTo
                        ? formatDateTime(new Date(inspection.flightPermitValidTo))
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' – ')}
                  </Typography>
                </Grid>
              )
            ) : (
              <>
                {inspection.flightPermitValidFrom && (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <Typography variant="caption" color="text.secondary">
                      {t('Valid From')}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {formatDateTime(new Date(inspection.flightPermitValidFrom))}
                    </Typography>
                  </Grid>
                )}

                {inspection.flightPermitValidTo && (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <Typography variant="caption" color="text.secondary">
                      {t('Valid To')}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {formatDateTime(new Date(inspection.flightPermitValidTo))}
                    </Typography>
                  </Grid>
                )}
              </>
            )}

            {!compact && inspection.flightPermitMaxAltitudeM != null && (
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant="caption" color="text.secondary">
                  {t('Max Permitted Altitude')}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {`${inspection.flightPermitMaxAltitudeM} m AGL`}
                </Typography>
              </Grid>
            )}

            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="caption" color="text.secondary">
                {t('Uploaded File')}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap title={inspection.flightPermitFileName ?? ''}>
                {inspection.flightPermitFileName}
                {!compact &&
                inspection.flightPermitFileSizeBytes != null &&
                inspection.flightPermitFileSizeBytes > 0
                  ? ` (${formatFileSize(inspection.flightPermitFileSizeBytes)})`
                  : ''}
              </Typography>
            </Grid>

            {!compact && inspection.flightPermitFileSha256 && (
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant="caption" color="text.secondary">
                  {t('SHA-256 Digest')}
                </Typography>
                <Typography
                  variant="body2"
                  title={inspection.flightPermitFileSha256}
                  sx={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}
                >
                  {formatDigestShort(inspection.flightPermitFileSha256)}
                </Typography>
              </Grid>
            )}
          </Grid>
        )}
      </Stack>
    </Paper>
  );
}
