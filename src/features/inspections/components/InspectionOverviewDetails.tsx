import { useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  ButtonGroup,
  Grid,
  IconButton,
  Link,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import CheckRounded from '@mui/icons-material/CheckRounded';
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import {
  evaluateAirspace,
  extractCoordinates,
  formatLocation,
  type AirspaceClassification,
} from '@/shared/airspace/airspaceZones';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import type { InspectionDetail } from '../api/inspectionApi';
import { CleanTileMapView } from './EvidenceGpsMapDialog';

function resolveAirspaceLabel(
  classification: AirspaceClassification,
  t: (key: string) => string,
): string {
  if (classification === 'NO_FLY_ZONE') return t('No-Fly Zone');
  if (classification === 'RESTRICTED_ZONE') return t('Restricted Zone');
  return t('Clear Zone');
}

function ContactBlock({
  label,
  name,
  phone,
  email,
  avatarUrl,
}: {
  label: string;
  name?: string | null | undefined;
  phone?: string | null | undefined;
  email?: string | null | undefined;
  avatarUrl?: string | null | undefined;
}) {
  if (!name && !phone && !email) return null;

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.35 }}>
        {label}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Avatar
          src={avatarUrl ?? undefined}
          alt={name || label}
          sx={{ width: 28, height: 28, fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}
        >
          {(name || label).slice(0, 1).toUpperCase()}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          {name && (
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {name}
            </Typography>
          )}
          {(phone || email) && (
            <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', rowGap: 0.25, mt: 0.15 }}>
              {phone && (
                <Link
                  href={`tel:${phone}`}
                  underline="hover"
                  variant="caption"
                  sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
                >
                  {phone}
                </Link>
              )}
              {email && (
                <Link
                  href={`mailto:${email}`}
                  underline="hover"
                  variant="caption"
                  sx={{ color: 'text.secondary', wordBreak: 'break-word' }}
                >
                  {email}
                </Link>
              )}
            </Stack>
          )}
        </Box>
      </Stack>
    </Box>
  );
}

export interface InspectionOverviewDetailsProps {
  inspection: InspectionDetail;
  isCustomer: boolean;
  isReviewerAdmin: boolean;
  droneShortName: string;
}

/**
 * Concise, data-only details rendered inside the expandable Workspace Overview card.
 */
export function InspectionOverviewDetails({
  inspection,
  isCustomer,
  isReviewerAdmin,
  droneShortName,
}: InspectionOverviewDetailsProps) {
  const { t, formatDateTime, formatDate } = useLocale();
  const [mapStyle, setMapStyle] = useState<'street' | 'satellite'>('satellite');
  const [copiedCoords, setCopiedCoords] = useState(false);

  const coords = extractCoordinates(
    inspection.locationText,
    inspection.assetLatitude,
    inspection.assetLongitude,
  );
  const hasCoords =
    typeof coords.latitude === 'number' &&
    typeof coords.longitude === 'number' &&
    Number.isFinite(coords.latitude) &&
    Number.isFinite(coords.longitude);

  const lat = coords.latitude ?? 0;
  const lon = coords.longitude ?? 0;
  const coordsLabel = hasCoords ? `${lat.toFixed(6)}, ${lon.toFixed(6)}` : null;
  const googleMapsUrl = hasCoords ? `https://www.google.com/maps?q=${lat},${lon}` : null;
  const airspace = hasCoords ? evaluateAirspace(lat, lon) : null;

  const permitParts = !isCustomer
    ? [
        inspection.flightPermitNumber,
        inspection.flightPermitMaxAltitudeM != null
          ? `${t('Max altitude')} ${inspection.flightPermitMaxAltitudeM}m`
          : null,
        inspection.flightPermitValidFrom || inspection.flightPermitValidTo
          ? `${inspection.flightPermitValidFrom ? formatDate(new Date(inspection.flightPermitValidFrom)) : '—'} – ${inspection.flightPermitValidTo ? formatDate(new Date(inspection.flightPermitValidTo)) : '—'}`
          : null,
      ].filter(Boolean)
    : [];

  const handleCopyCoords = () => {
    if (!coordsLabel || !navigator.clipboard) return;
    void navigator.clipboard.writeText(coordsLabel).then(() => {
      setCopiedCoords(true);
      window.setTimeout(() => setCopiedCoords(false), 1800);
    });
  };

  return (
    <Grid container spacing={2} sx={{ alignItems: 'start' }}>
      <Grid size={{ xs: 12, md: hasCoords ? 7 : 12 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {t('Location')}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {formatLocation(inspection.locationText)}
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {t('Coordinates')}
            </Typography>
            {coordsLabel ? (
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums' }}
                >
                  {coordsLabel}
                </Typography>
                <Tooltip title={copiedCoords ? t('Copied') : t('Copy')}>
                  <IconButton
                    size="small"
                    aria-label={t('Copy')}
                    onClick={handleCopyCoords}
                    sx={{ p: 0.35 }}
                  >
                    {copiedCoords ? (
                      <CheckRounded sx={{ fontSize: 15, color: 'success.main' }} />
                    ) : (
                      <ContentCopyRounded sx={{ fontSize: 15, color: 'text.secondary' }} />
                    )}
                  </IconButton>
                </Tooltip>
              </Stack>
            ) : (
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                —
              </Typography>
            )}
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {t('Drone')}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {isCustomer
                ? droneShortName
                : [inspection.droneModel, inspection.droneSerialNumber].filter(Boolean).join(' · ') ||
                  t('Unassigned')}
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {t('Planned Start')}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {inspection.plannedStartAt
                ? `${formatDateTime(new Date(inspection.plannedStartAt))}${inspection.plannedEndAt ? ` – ${formatDateTime(new Date(inspection.plannedEndAt))}` : ''}`
                : '—'}
            </Typography>
          </Grid>

          {!isCustomer && (
            <Grid size={{ xs: 12, sm: 6 }}>
              <ContactBlock
                label={t('Customer contact')}
                name={inspection.ownerCustomerName}
                phone={inspection.ownerCustomerPhone}
                email={inspection.ownerCustomerEmail}
                avatarUrl={inspection.ownerCustomerAvatarUrl}
              />
            </Grid>
          )}

          {!isReviewerAdmin && (
            <Grid size={{ xs: 12, sm: 6 }}>
              <ContactBlock
                label={t('Manager contact')}
                name={inspection.managerName}
                phone={inspection.managerPhone}
                email={inspection.managerEmail}
                avatarUrl={inspection.managerAvatarUrl}
              />
            </Grid>
          )}

          {airspace && (
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {t('Airspace')}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  color:
                    airspace.classification === 'NO_FLY_ZONE'
                      ? 'error.main'
                      : airspace.classification === 'RESTRICTED_ZONE'
                        ? 'warning.dark'
                        : 'text.primary',
                }}
              >
                {resolveAirspaceLabel(airspace.classification, t)}
              </Typography>
            </Grid>
          )}

          {permitParts.length > 0 && (
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {t('Flight permit')}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {permitParts.join(' · ')}
              </Typography>
            </Grid>
          )}

          {inspection.inspectionItems?.length > 0 && (
            <Grid size={{ xs: 12 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {t('Inspection items')}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {inspection.inspectionItems.join(', ')}
              </Typography>
            </Grid>
          )}
        </Grid>
      </Grid>

      {hasCoords && googleMapsUrl && (
        <Grid size={{ xs: 12, md: 5 }}>
          <Stack spacing={0.75}>
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}
            >
              <ButtonGroup size="small" variant="outlined">
                <Button
                  onClick={() => setMapStyle('satellite')}
                  sx={{
                    py: 0.25,
                    px: 1,
                    fontSize: '0.72rem',
                    textTransform: 'none',
                    fontWeight: mapStyle === 'satellite' ? 700 : 500,
                    bgcolor: mapStyle === 'satellite' ? 'action.selected' : 'transparent',
                  }}
                >
                  {t('Satellite')}
                </Button>
                <Button
                  onClick={() => setMapStyle('street')}
                  sx={{
                    py: 0.25,
                    px: 1,
                    fontSize: '0.72rem',
                    textTransform: 'none',
                    fontWeight: mapStyle === 'street' ? 700 : 500,
                    bgcolor: mapStyle === 'street' ? 'action.selected' : 'transparent',
                  }}
                >
                  {t('Street')}
                </Button>
              </ButtonGroup>

              <Button
                component="a"
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                variant="outlined"
                color="inherit"
                endIcon={<OpenInNewRounded sx={{ fontSize: '14px !important' }} />}
                sx={{
                  py: 0.25,
                  px: 1.25,
                  fontSize: '0.75rem',
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: '8px',
                  borderColor: 'divider',
                  color: 'text.primary',
                }}
              >
                {t('Open in Google Maps')}
              </Button>
            </Stack>
            <CleanTileMapView
              centerLat={lat}
              centerLon={lon}
              mapStyle={mapStyle}
              markers={[
                {
                  id: inspection.id,
                  latitude: lat,
                  longitude: lon,
                  label: inspection.assetName || t('Asset'),
                  ariaLabel: inspection.assetName || t('Asset'),
                  color: '#EA4335',
                  variant: 'pin',
                  selected: true,
                },
              ]}
              width={460}
              height={240}
              minHeight={210}
              maxHeight={245}
              initialZoom={17}
              testId="overview-asset-map"
            />
          </Stack>
        </Grid>
      )}
    </Grid>
  );
}
