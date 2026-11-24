import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Avatar,
  Box,
  Button,
  ButtonGroup,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Link,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import ChatOutlined from '@mui/icons-material/ChatOutlined';
import CheckRounded from '@mui/icons-material/CheckRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded';
import LocationOnOutlined from '@mui/icons-material/LocationOnOutlined';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import PersonOutlineRounded from '@mui/icons-material/PersonOutlineRounded';
import {
  evaluateAirspace,
  extractCoordinates,
  formatLocation,
  type AirspaceClassification,
} from '@/shared/airspace/airspaceZones';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { InspectorRatingSummaryBadge } from './InspectorRatingSummaryBadge';
import type { InspectionDetail } from '../api/inspectionApi';
import { CleanTileMapView } from './EvidenceGpsMapDialog';

export type InspectionContextModalType = 'asset' | 'customer' | 'manager' | 'inspector' | null;

export interface InspectionContextDialogsProps {
  inspection: InspectionDetail;
  openModal: InspectionContextModalType;
  onClose: () => void;
  isCustomer: boolean;
  droneShortName: string;
  chatInboxPath?: string | undefined;
  canOpenInspectionChat?: boolean;
  customerAvatarUrl?: string | null | undefined;
  managerAvatarUrl?: string | null | undefined;
  inspectorAvatarUrl?: string | null | undefined;
}

function resolveAirspaceLabel(
  classification: AirspaceClassification,
  t: (key: string) => string,
): string {
  if (classification === 'NO_FLY_ZONE') return t('No-Fly Zone');
  if (classification === 'RESTRICTED_ZONE') return t('Restricted Zone');
  return t('Clear Zone');
}

function resolveAirspaceColor(
  classification: AirspaceClassification,
): 'error' | 'warning' | 'info' {
  if (classification === 'NO_FLY_ZONE') return 'error';
  if (classification === 'RESTRICTED_ZONE') return 'warning';
  return 'info';
}

function getInitials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  const last = parts[parts.length - 1];
  if (!first) return '?';
  if (parts.length === 1 || !last) return first.slice(0, 1).toUpperCase();
  return `${first.slice(0, 1)}${last.slice(0, 1)}`.toUpperCase();
}

function DetailRow({
  label,
  value,
  copyValue,
}: {
  label: string;
  value: React.ReactNode;
  copyValue?: string | null | undefined;
}) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!copyValue || !navigator.clipboard) return;
    void navigator.clipboard.writeText(copyValue).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
        {label}
      </Typography>
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Box sx={{ minWidth: 0 }}>{value}</Box>
        {copyValue && (
          <Tooltip title={copied ? t('Copied') : t('Copy')}>
            <IconButton size="small" aria-label={t('Copy')} onClick={handleCopy} sx={{ p: 0.35 }}>
              {copied ? (
                <CheckRounded sx={{ fontSize: 15, color: 'success.main' }} />
              ) : (
                <ContentCopyRounded sx={{ fontSize: 15, color: 'text.secondary' }} />
              )}
            </IconButton>
          </Tooltip>
        )}
      </Stack>
    </Box>
  );
}

/**
 * Detail dialogs opened by clicking the Asset title or Customer/Manager/Inspector columns
 * in the inspection header card.
 */
export function InspectionContextDialogs({
  inspection,
  openModal,
  onClose,
  isCustomer,
  droneShortName,
  chatInboxPath,
  canOpenInspectionChat = false,
  customerAvatarUrl,
  managerAvatarUrl,
  inspectorAvatarUrl,
}: InspectionContextDialogsProps) {
  const { t, formatDateTime, formatDate } = useLocale();
  const [mapStyle, setMapStyle] = useState<'street' | 'satellite'>('satellite');
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);

  const photoIds = inspection.assetPhotoDocumentIds ?? [];
  const activePhotoId =
    (selectedPhotoId && photoIds.includes(selectedPhotoId) ? selectedPhotoId : photoIds[0]) ?? null;

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

  const isContactModal =
    openModal === 'customer' || openModal === 'manager' || openModal === 'inspector';

  const contactConfig = (() => {
    if (openModal === 'customer') {
      return {
        title: t('Customer details'),
        name: inspection.ownerCustomerName,
        phone: inspection.ownerCustomerPhone,
        email: inspection.ownerCustomerEmail,
        avatarUrl: customerAvatarUrl ?? inspection.ownerCustomerAvatarUrl ?? null,
      };
    }
    if (openModal === 'manager') {
      return {
        title: t('Manager details'),
        name: inspection.managerName,
        phone: inspection.managerPhone,
        email: inspection.managerEmail,
        avatarUrl: managerAvatarUrl ?? inspection.managerAvatarUrl ?? null,
      };
    }
    return {
      title: t('Inspector details'),
      name: inspection.inspectorName,
      phone: null,
      email: null,
      avatarUrl: inspectorAvatarUrl ?? inspection.inspectorAvatarUrl ?? null,
    };
  })();

  return (
    <>
      <Dialog
        open={openModal === 'asset'}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '14px' } } }}
      >
        <DialogTitle sx={{ pr: 6 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <LocationOnOutlined color="primary" fontSize="small" />
            <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
              {inspection.assetName || t('Asset details')}
            </Typography>
            {inspection.inspectionType === 'RE_INSPECTION' && (
              <Chip
                size="small"
                variant="outlined"
                color="secondary"
                label={
                  inspection.sourceInspectionId
                    ? `${t('Re-inspection')} · #${inspection.sourceInspectionId.slice(0, 8)}`
                    : t('Re-inspection')
                }
                sx={{ height: 22, fontSize: '0.75rem', fontWeight: 600 }}
              />
            )}
          </Stack>
          <IconButton
            aria-label={t('Close')}
            onClick={onClose}
            sx={{ position: 'absolute', right: 12, top: 12 }}
          >
            <CloseRounded />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          <Grid container spacing={2.5} sx={{ alignItems: 'start' }}>
            <Grid size={{ xs: 12, md: hasCoords ? 6 : 12 }}>
              <Stack spacing={2}>
                {activePhotoId && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                      {t('Asset photos')}
                    </Typography>
                    <Stack spacing={1}>
                      <Box
                        sx={{
                          width: '100%',
                          height: 190,
                          borderRadius: '10px',
                          border: '1px solid',
                          borderColor: 'divider',
                          overflow: 'hidden',
                          bgcolor: 'action.hover',
                        }}
                      >
                        <AuthenticatedImage
                          src={`/inspections/${inspection.id}/asset-photos/${activePhotoId}/content`}
                          alt={inspection.assetName || t('Asset')}
                          maxHeight={190}
                          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      </Box>
                      {photoIds.length > 1 && (
                        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                          {photoIds.map((photoId, idx) => (
                            <Box
                              key={photoId}
                              component="button"
                              type="button"
                              onClick={() => setSelectedPhotoId(photoId)}
                              aria-label={`${t('Asset photos')} ${idx + 1}`}
                              sx={{
                                p: 0,
                                width: 52,
                                height: 40,
                                borderRadius: '6px',
                                overflow: 'hidden',
                                border: '2px solid',
                                borderColor: photoId === activePhotoId ? 'primary.main' : 'divider',
                                cursor: 'pointer',
                                bgcolor: 'action.hover',
                              }}
                            >
                              <AuthenticatedImage
                                src={`/inspections/${inspection.id}/asset-photos/${photoId}/content`}
                                alt={`${inspection.assetName || t('Asset')} ${idx + 1}`}
                                maxHeight={40}
                                sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                              />
                            </Box>
                          ))}
                        </Stack>
                      )}
                    </Stack>
                  </Box>
                )}

                <DetailRow
                  label={t('Location')}
                  value={
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {formatLocation(inspection.locationText) || '—'}
                    </Typography>
                  }
                />

                <DetailRow
                  label={t('Coordinates')}
                  copyValue={coordsLabel}
                  value={
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        fontFamily: 'monospace',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {coordsLabel || '—'}
                    </Typography>
                  }
                />

                {airspace && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      {t('Airspace')}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                      <Chip
                        size="small"
                        variant="outlined"
                        color={resolveAirspaceColor(airspace.classification)}
                        label={resolveAirspaceLabel(airspace.classification, t)}
                        sx={{ fontWeight: 600 }}
                      />
                      {airspace.matchingZones[0] && (
                        <Typography variant="caption" color="text.secondary">
                          {airspace.matchingZones[0].name} ({airspace.matchingZones[0].authority})
                        </Typography>
                      )}
                    </Stack>
                  </Box>
                )}

                <DetailRow
                  label={t('Planned Start')}
                  value={
                    <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {inspection.plannedStartAt
                        ? `${formatDateTime(new Date(inspection.plannedStartAt))}${inspection.plannedEndAt ? ` – ${formatDateTime(new Date(inspection.plannedEndAt))}` : ''}`
                        : '—'}
                    </Typography>
                  }
                />

                {!isCustomer && (
                  <DetailRow
                    label={t('Drone')}
                    value={
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {[inspection.droneModel, inspection.droneSerialNumber]
                          .filter(Boolean)
                          .join(' · ') || droneShortName}
                      </Typography>
                    }
                  />
                )}

                {permitParts.length > 0 && (
                  <DetailRow
                    label={t('Flight permit')}
                    value={
                      <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                        {permitParts.join(' · ')}
                      </Typography>
                    }
                  />
                )}
              </Stack>
            </Grid>

            {hasCoords && googleMapsUrl && (
              <Grid size={{ xs: 12, md: 6 }}>
                <Stack spacing={1}>
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
                    height={280}
                    minHeight={240}
                    maxHeight={290}
                    initialZoom={17}
                    testId="asset-detail-dialog-map"
                  />
                </Stack>
              </Grid>
            )}
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} variant="contained" sx={{ textTransform: 'none', borderRadius: '8px' }}>
            {t('Close')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isContactModal}
        onClose={onClose}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '14px' } } }}
      >
        <DialogTitle sx={{ pr: 6 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <PersonOutlineRounded color="primary" fontSize="small" />
            <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
              {contactConfig.title}
            </Typography>
          </Stack>
          <IconButton
            aria-label={t('Close')}
            onClick={onClose}
            sx={{ position: 'absolute', right: 12, top: 12 }}
          >
            <CloseRounded />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={1.75}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Avatar
                src={contactConfig.avatarUrl ?? undefined}
                alt={contactConfig.name || ''}
                sx={{ width: 48, height: 48, fontWeight: 700 }}
              >
                {getInitials(contactConfig.name)}
              </Avatar>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {contactConfig.name || '—'}
              </Typography>
            </Stack>

            <Divider />

            {openModal === 'inspector' ? (
              <>
                <DetailRow
                  label={t('Drone')}
                  value={
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {isCustomer
                        ? droneShortName
                        : [inspection.droneModel, inspection.droneSerialNumber]
                            .filter(Boolean)
                            .join(' · ') || droneShortName}
                    </Typography>
                  }
                />
                <DetailRow
                  label={t('Rating')}
                  value={
                    <InspectorRatingSummaryBadge
                      averageRating={inspection.inspectorAverageRating}
                      ratingCount={inspection.inspectorRatingCount}
                      variant="inline"
                      showEmpty
                    />
                  }
                />
              </>
            ) : (
              <>
                <DetailRow
                  label={t('Phone Number')}
                  copyValue={contactConfig.phone}
                  value={
                    contactConfig.phone ? (
                      <Link
                        href={`tel:${contactConfig.phone}`}
                        underline="hover"
                        variant="body2"
                        sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
                      >
                        {contactConfig.phone}
                      </Link>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        —
                      </Typography>
                    )
                  }
                />

                <DetailRow
                  label={t('Email address')}
                  copyValue={contactConfig.email}
                  value={
                    contactConfig.email ? (
                      <Link
                        href={`mailto:${contactConfig.email}`}
                        underline="hover"
                        variant="body2"
                        sx={{ fontWeight: 600, wordBreak: 'break-word' }}
                      >
                        {contactConfig.email}
                      </Link>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        —
                      </Typography>
                    )
                  }
                />
              </>
            )}

            {openModal === 'customer' && (
              <DetailRow
                label={t('Asset')}
                value={
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {inspection.assetName}
                    {formatLocation(inspection.locationText)
                      ? ` · ${formatLocation(inspection.locationText)}`
                      : ''}
                  </Typography>
                }
              />
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
          <Box>
            {canOpenInspectionChat && chatInboxPath && (
              <Button
                component={RouterLink}
                to={chatInboxPath}
                onClick={onClose}
                variant="outlined"
                startIcon={<ChatOutlined fontSize="small" />}
                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
              >
                {t('Messages')}
              </Button>
            )}
          </Box>
          <Button onClick={onClose} variant="contained" sx={{ textTransform: 'none', borderRadius: '8px' }}>
            {t('Close')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
