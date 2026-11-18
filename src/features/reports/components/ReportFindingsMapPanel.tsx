import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import { inspectionApi, type EvidenceItem, type Finding } from '@/features/inspections/api/inspectionApi';
import {
  CleanTileMapView,
  type CleanMapMarker,
} from '@/features/inspections/components/EvidenceGpsMapDialog';
import { parseBoundingBox } from '@/features/inspections/utils/boundingBox';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { useLocale } from '@/shared/i18n/LocaleProvider';

export interface ReportFindingsMapPanelProps {
  inspectionId: string;
  defectEvidence: EvidenceItem[];
  findings: Finding[];
  selectedEvidenceId: string | null;
  onSelectEvidence: (evidenceId: string) => void;
  onJumpToEvidence: (evidenceId: string) => void;
  focusNonce?: number | undefined;
}

function getMarkerColor(linkedFindings: Finding[]): string {
  if (linkedFindings.some((f) => f.severity === 'CRITICAL' || f.severity === 'HIGH')) {
    return '#dc2626';
  }
  if (linkedFindings.some((f) => f.severity === 'MEDIUM')) {
    return '#d97706';
  }
  return '#0284c7';
}

function getSoftSeverityChipSx(severity: Finding['severity']) {
  if (severity === 'CRITICAL' || severity === 'HIGH') {
    return (theme: { palette: { mode: string } }) => ({
      height: 22,
      fontSize: '0.75rem',
      fontWeight: 600,
      bgcolor: theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.14)' : '#fef2f2',
      borderColor: theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.35)' : '#fecaca',
      color: theme.palette.mode === 'dark' ? '#fca5a5' : '#b91c1c',
    });
  }
  if (severity === 'MEDIUM') {
    return (theme: { palette: { mode: string } }) => ({
      height: 22,
      fontSize: '0.75rem',
      fontWeight: 600,
      bgcolor: theme.palette.mode === 'dark' ? 'rgba(245, 158, 11, 0.14)' : '#fffbeb',
      borderColor: theme.palette.mode === 'dark' ? 'rgba(245, 158, 11, 0.38)' : '#fde68a',
      color: theme.palette.mode === 'dark' ? '#fcd34d' : '#b45309',
    });
  }
  return {
    height: 22,
    fontSize: '0.75rem',
    fontWeight: 600,
    bgcolor: 'action.hover',
    borderColor: 'divider',
    color: 'text.secondary',
  };
}

export function ReportFindingsMapPanel({
  inspectionId,
  defectEvidence,
  findings,
  selectedEvidenceId,
  onSelectEvidence,
  onJumpToEvidence,
  focusNonce = 0,
}: ReportFindingsMapPanelProps) {
  const { t } = useLocale();
  const [mapStyle, setMapStyle] = useState<'satellite' | 'street'>('satellite');

  const geotaggedItems = useMemo(
    () =>
      defectEvidence.filter(
        (item) =>
          item.latitude != null &&
          item.longitude != null &&
          Number.isFinite(Number(item.latitude)) &&
          Number.isFinite(Number(item.longitude)),
      ),
    [defectEvidence],
  );

  const avgCenter = useMemo(() => {
    if (geotaggedItems.length === 0) {
      return { lat: 10.875167, lon: 106.800719 };
    }
    const sumLat = geotaggedItems.reduce((acc, item) => acc + Number(item.latitude), 0);
    const sumLon = geotaggedItems.reduce((acc, item) => acc + Number(item.longitude), 0);
    return {
      lat: sumLat / geotaggedItems.length,
      lon: sumLon / geotaggedItems.length,
    };
  }, [geotaggedItems]);

  if (geotaggedItems.length === 0) {
    return null;
  }

  const activeItem =
    geotaggedItems.find((item) => item.id === selectedEvidenceId) ?? geotaggedItems[0]!;
  const activeFindings = findings.filter((f) => f.evidenceId === activeItem.id);
  const activeLat = Number(activeItem.latitude);
  const activeLon = Number(activeItem.longitude);

  const defaultCenter =
    selectedEvidenceId && geotaggedItems.some((item) => item.id === selectedEvidenceId)
      ? { lat: activeLat, lon: activeLon }
      : avgCenter;

  const markers: CleanMapMarker[] = geotaggedItems.map((item) => {
    const linked = findings.filter((f) => f.evidenceId === item.id);
    const firstCode = linked[0]?.findingCode?.trim();
    const pinLabel =
      linked.length > 1
        ? `${firstCode || linked.length} (+${linked.length - 1})`
        : firstCode || linked[0]?.defectLabel || 'F';

    return {
      id: item.id,
      latitude: Number(item.latitude),
      longitude: Number(item.longitude),
      label: pinLabel,
      ariaLabel: `Finding pin ${item.fileName}`,
      color: getMarkerColor(linked),
      selected: item.id === activeItem.id,
      onClick: () => onSelectEvidence(item.id),
    };
  });

  const googleMapsUrl = `https://www.google.com/maps?q=${activeLat},${activeLon}`;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 1.5, sm: 2 },
        borderRadius: '10px',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Stack spacing={1.5}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <PlaceOutlined sx={{ fontSize: 20, color: 'text.secondary' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {t('Findings location map')}
              </Typography>
            </Stack>
          </Box>

          <ButtonGroup size="small" variant="outlined">
            <Button
              variant="outlined"
              onClick={() => setMapStyle('satellite')}
              sx={{
                textTransform: 'none',
                fontWeight: mapStyle === 'satellite' ? 700 : 500,
                bgcolor: mapStyle === 'satellite' ? 'action.selected' : 'transparent',
                color: mapStyle === 'satellite' ? 'text.primary' : 'text.secondary',
                borderColor: 'divider',
              }}
            >
              {t('Satellite')}
            </Button>
            <Button
              variant="outlined"
              onClick={() => setMapStyle('street')}
              sx={{
                textTransform: 'none',
                fontWeight: mapStyle === 'street' ? 700 : 500,
                bgcolor: mapStyle === 'street' ? 'action.selected' : 'transparent',
                color: mapStyle === 'street' ? 'text.primary' : 'text.secondary',
                borderColor: 'divider',
              }}
            >
              {t('Street map')}
            </Button>
          </ButtonGroup>
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.35fr) minmax(300px, 0.85fr)' },
            gap: 2,
            alignItems: 'start',
          }}
        >
          {/* Left Column: Clean Map Tiles + Finding Pins Only */}
          <CleanTileMapView
            centerLat={defaultCenter.lat}
            centerLon={defaultCenter.lon}
            resetLat={avgCenter.lat}
            resetLon={avgCenter.lon}
            mapStyle={mapStyle}
            markers={markers}
            focusNonce={focusNonce}
            testId="report-findings-map-surface"
          />

          {/* Right Column: Selected Pin Findings Details */}
          <Paper
            variant="outlined"
            sx={{
              p: 1.5,
              borderRadius: '10px',
              borderColor: 'divider',
              bgcolor: 'background.default',
            }}
          >
            <Stack spacing={1.25}>
              <Box>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 700, color: 'text.primary', wordBreak: 'break-word' }}
                >
                  {activeItem.fileName}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {`${Math.abs(activeLat).toFixed(6)}° ${activeLat >= 0 ? 'N' : 'S'}, ${Math.abs(activeLon).toFixed(6)}° ${activeLon >= 0 ? 'E' : 'W'}`}
                </Typography>
              </Box>

              {activeItem.contentType.startsWith('image/') && (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                  }}
                >
                  <Box
                    sx={{
                      position: 'relative',
                      display: 'inline-block',
                      lineHeight: 0,
                      maxWidth: '100%',
                    }}
                  >
                    <AuthenticatedImage
                      src={inspectionApi.evidenceContentUrl(inspectionId, activeItem.id, 'thumb')}
                      alt={activeItem.fileName}
                      maxHeight={200}
                      sx={{
                        width: 'auto',
                        height: 'auto',
                        maxWidth: '100%',
                        maxHeight: 200,
                        borderRadius: 0,
                      }}
                    />
                    {activeFindings.map((finding, index) => {
                      const box = parseBoundingBox(finding.boundingBox);
                      if (!box) return null;
                      const boxColor = ['#d32f2f', '#1976d2', '#2e7d32', '#ed6c02'][index % 4];
                      return (
                        <Box
                          key={finding.id}
                          sx={{
                            position: 'absolute',
                            left: `${box.xMin * 100}%`,
                            top: `${box.yMin * 100}%`,
                            width: `${(box.xMax - box.xMin) * 100}%`,
                            height: `${(box.yMax - box.yMin) * 100}%`,
                            border: `2px solid ${boxColor}`,
                            pointerEvents: 'none',
                          }}
                        />
                      );
                    })}
                  </Box>
                </Box>
              )}

              <Stack spacing={0.75}>
                {activeFindings.map((finding) => (
                  <Stack
                    key={finding.id}
                    direction="row"
                    spacing={0.75}
                    sx={{
                      p: 1,
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'background.paper',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 0.5,
                    }}
                  >
                    {finding.findingCode && (
                      <Chip size="small" label={finding.findingCode} sx={{ height: 20, fontWeight: 700, fontSize: '0.72rem' }} />
                    )}
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      {finding.defectLabel}
                    </Typography>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={finding.severity}
                      sx={getSoftSeverityChipSx(finding.severity)}
                    />
                  </Stack>
                ))}
              </Stack>

              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => onJumpToEvidence(activeItem.id)}
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  {t('View in report list')}
                </Button>
                <Button
                  component="a"
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="small"
                  variant="text"
                  endIcon={<OpenInNewRounded sx={{ fontSize: 14 }} />}
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  {t('Open in Google Maps')}
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Box>
      </Stack>
    </Paper>
  );
}
