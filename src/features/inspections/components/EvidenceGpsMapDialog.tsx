import { useEffect, useRef, useState, type MouseEvent } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import AddRounded from '@mui/icons-material/AddRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import MyLocationRounded from '@mui/icons-material/MyLocationRounded';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import RemoveRounded from '@mui/icons-material/RemoveRounded';
import { useLocale } from '@/shared/i18n/LocaleProvider';

export interface CleanMapMarker {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
  ariaLabel: string;
  color: string;
  selected?: boolean | undefined;
  onClick?: (() => void) | undefined;
}

export interface CleanTileMapViewProps {
  centerLat: number;
  centerLon: number;
  resetLat?: number | undefined;
  resetLon?: number | undefined;
  mapStyle: 'satellite' | 'street';
  markers: CleanMapMarker[];
  width?: number | undefined;
  height?: number | undefined;
  initialZoom?: number | undefined;
  focusNonce?: number | undefined;
  title?: string | undefined;
  testId?: string | undefined;
  minHeight?: number | undefined;
  maxHeight?: number | undefined;
}

const DEFAULT_MIN_ZOOM = 15;
const DEFAULT_MAX_ZOOM = 20;

function lonToWorldX(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * 256 * Math.pow(2, zoom);
}

function latToWorldY(lat: number, zoom: number): number {
  const clamped = Math.max(-85.0511, Math.min(85.0511, lat));
  const rad = (clamped * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) *
    256 *
    Math.pow(2, zoom)
  );
}

function worldXToLon(x: number, zoom: number): number {
  return (x / (256 * Math.pow(2, zoom))) * 360 - 180;
}

function worldYToLat(y: number, zoom: number): number {
  const n = Math.PI - (2 * Math.PI * y) / (256 * Math.pow(2, zoom));
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

function buildCleanTileUrl(
  mapStyle: 'satellite' | 'street',
  wrappedTx: number,
  ty: number,
  zoom: number,
): string {
  if (mapStyle === 'satellite') {
    // Pure satellite imagery (`lyrs=s`) hides POI pins, business names, and road labels.
    return `https://mt1.google.com/vt/lyrs=s&x=${wrappedTx}&y=${ty}&z=${zoom}`;
  }
  // Street tiles with POI (`s.t:2`) and transit (`s.t:4`) markers hidden.
  return `https://mt1.google.com/vt/lyrs=m&hl=vi&x=${wrappedTx}&y=${ty}&z=${zoom}&apistyle=s.t:2%7Cs.e:a%7Cp.v:off,s.t:4%7Cs.e:a%7Cp.v:off`;
}

export function CleanTileMapView({
  centerLat,
  centerLon,
  resetLat,
  resetLon,
  mapStyle,
  markers,
  width = 680,
  height = 360,
  initialZoom = 18,
  focusNonce = 0,
  title,
  testId,
  minHeight = 280,
  maxHeight = 400,
}: CleanTileMapViewProps) {
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState<number>(initialZoom);
  const [customCenter, setCustomCenter] = useState<{ lat: number; lon: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [prevFocusNonce, setPrevFocusNonce] = useState(focusNonce);
  if (prevFocusNonce !== focusNonce) {
    setPrevFocusNonce(focusNonce);
    setCustomCenter(null);
  }

  useEffect(() => {
    const el = surfaceRef.current;
    if (!el) return;
    const onWheel = (event: globalThis.WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (Math.abs(event.deltaY) < 4) return;
      setZoom((z) =>
        event.deltaY < 0
          ? Math.min(DEFAULT_MAX_ZOOM, z + 1)
          : Math.max(DEFAULT_MIN_ZOOM, z - 1),
      );
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const dragRef = useRef<{
    active: boolean;
    startClientX: number;
    startClientY: number;
    startWorldX: number;
    startWorldY: number;
    moved: boolean;
  }>({
    active: false,
    startClientX: 0,
    startClientY: 0,
    startWorldX: 0,
    startWorldY: 0,
    moved: false,
  });

  const activeLat = customCenter?.lat ?? centerLat;
  const activeLon = customCenter?.lon ?? centerLon;
  const centerWorldX = lonToWorldX(activeLon, zoom);
  const centerWorldY = latToWorldY(activeLat, zoom);
  const topLeftWorldX = centerWorldX - width / 2;
  const topLeftWorldY = centerWorldY - height / 2;

  const minTileX = Math.floor(topLeftWorldX / 256);
  const maxTileX = Math.floor((topLeftWorldX + width) / 256);
  const minTileY = Math.floor(topLeftWorldY / 256);
  const maxTileY = Math.floor((topLeftWorldY + height) / 256);
  const maxTileIndex = Math.pow(2, zoom) - 1;

  const tiles: Array<{ key: string; url: string; left: number; top: number }> = [];
  for (let tx = minTileX; tx <= maxTileX; tx++) {
    for (let ty = minTileY; ty <= maxTileY; ty++) {
      if (ty < 0 || ty > maxTileIndex) continue;
      const wrappedTx = ((tx % (maxTileIndex + 1)) + (maxTileIndex + 1)) % (maxTileIndex + 1);
      tiles.push({
        key: `${mapStyle}-${zoom}-${tx}-${ty}`,
        url: buildCleanTileUrl(mapStyle, wrappedTx, ty, zoom),
        left: tx * 256 - topLeftWorldX,
        top: ty * 256 - topLeftWorldY,
      });
    }
  }

  const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    dragRef.current = {
      active: true,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startWorldX: centerWorldX,
      startWorldY: centerWorldY,
      moved: false,
    };
  };

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const rawDx = event.clientX - dragRef.current.startClientX;
    const rawDy = event.clientY - dragRef.current.startClientY;
    if (!dragRef.current.moved && Math.hypot(rawDx, rawDy) > 4) {
      dragRef.current.moved = true;
      setIsDragging(true);
    }
    if (dragRef.current.moved) {
      const rect = event.currentTarget.getBoundingClientRect();
      const scaleX = width / (rect.width || width);
      const scaleY = height / (rect.height || height);
      const nextWorldX = dragRef.current.startWorldX - rawDx * scaleX;
      const nextWorldY = dragRef.current.startWorldY - rawDy * scaleY;
      setCustomCenter({
        lat: Number(worldYToLat(nextWorldY, zoom).toFixed(6)),
        lon: Number(worldXToLon(nextWorldX, zoom).toFixed(6)),
      });
    }
  };

  const handleMouseUpOrLeave = () => {
    if (dragRef.current.active) {
      dragRef.current.active = false;
      setIsDragging(false);
    }
  };

  return (
    <Box
      ref={surfaceRef}
      title={title}
      data-testid={testId}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUpOrLeave}
      onMouseLeave={handleMouseUpOrLeave}
      sx={{
        position: 'relative',
        width: '100%',
        aspectRatio: `${width} / ${height}`,
        minHeight,
        maxHeight,
        borderRadius: '10px',
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: '#1e293b',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        overscrollBehavior: 'contain',
        touchAction: 'none',
      }}
    >
      <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {tiles.map((tile) => (
          <Box
            key={tile.key}
            component="img"
            src={tile.url}
            alt=""
            draggable={false}
            sx={{
              position: 'absolute',
              left: `${(tile.left / width) * 100}%`,
              top: `${(tile.top / height) * 100}%`,
              width: `${(256 / width) * 100}%`,
              height: `${(256 / height) * 100}%`,
              objectFit: 'fill',
            }}
          />
        ))}
      </Box>

      {markers.map((marker) => {
        const px = lonToWorldX(marker.longitude, zoom) - topLeftWorldX;
        const py = latToWorldY(marker.latitude, zoom) - topLeftWorldY;
        const leftPct = (px / width) * 100;
        const topPct = (py / height) * 100;
        const isSelected = Boolean(marker.selected);

        return (
          <Box
            key={marker.id}
            component="button"
            type="button"
            aria-label={marker.ariaLabel}
            aria-pressed={isSelected}
            onMouseDown={(e: MouseEvent<HTMLButtonElement>) => e.stopPropagation()}
            onClick={(e: MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              marker.onClick?.();
            }}
            sx={{
              position: 'absolute',
              left: `${leftPct}%`,
              top: `${topPct}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: isSelected ? 5 : 3,
              border: '2px solid #ffffff',
              bgcolor: marker.color,
              color: '#ffffff',
              px: 1,
              py: 0.35,
              borderRadius: '999px',
              fontSize: '0.72rem',
              fontWeight: 700,
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
              cursor: marker.onClick ? 'pointer' : 'default',
              boxShadow: isSelected
                ? '0 0 0 4px rgba(59, 130, 246, 0.55), 0 4px 12px rgba(0, 0, 0, 0.4)'
                : '0 2px 6px rgba(0, 0, 0, 0.35)',
              transition: 'transform 0.12s ease, box-shadow 0.12s ease',
              ...(marker.onClick
                ? {
                    '&:hover': {
                      transform: 'translate(-50%, -50%) scale(1.06)',
                    },
                  }
                : {}),
            }}
          >
            {marker.label}
          </Box>
        );
      })}

      <Paper
        elevation={2}
        onMouseDown={(e) => e.stopPropagation()}
        sx={{
          position: 'absolute',
          right: 10,
          bottom: 10,
          zIndex: 6,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '8px',
          overflow: 'hidden',
          bgcolor: 'background.paper',
        }}
      >
        <Tooltip title="Zoom in">
          <IconButton
            size="small"
            aria-label="Zoom in"
            onClick={() => setZoom((z) => Math.min(DEFAULT_MAX_ZOOM, z + 1))}
            disabled={zoom >= DEFAULT_MAX_ZOOM}
          >
            <AddRounded fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Zoom out">
          <IconButton
            size="small"
            aria-label="Zoom out"
            onClick={() => setZoom((z) => Math.max(DEFAULT_MIN_ZOOM, z - 1))}
            disabled={zoom <= DEFAULT_MIN_ZOOM}
          >
            <RemoveRounded fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Reset view">
          <IconButton
            size="small"
            aria-label="Reset map view"
            onClick={() => {
              setCustomCenter({
                lat: resetLat ?? centerLat,
                lon: resetLon ?? centerLon,
              });
              setZoom(initialZoom);
            }}
          >
            <MyLocationRounded fontSize="small" />
          </IconButton>
        </Tooltip>
      </Paper>
    </Box>
  );
}

export interface EvidenceGpsMapDialogProps {
  open: boolean;
  onClose: () => void;
  fileName: string;
  latitude: number;
  longitude: number;
  captureTime?: string | null | undefined;
  locationDescription?: string | null | undefined;
}

function formatDmsDecimalLabel(latitude: number, longitude: number): string {
  const latDir = latitude >= 0 ? 'N' : 'S';
  const lonDir = longitude >= 0 ? 'E' : 'W';
  return `${Math.abs(latitude).toFixed(6)}° ${latDir}, ${Math.abs(longitude).toFixed(6)}° ${lonDir}`;
}

export function EvidenceGpsMapDialog({
  open,
  onClose,
  fileName,
  latitude,
  longitude,
  captureTime,
  locationDescription,
}: EvidenceGpsMapDialogProps) {
  const { t } = useLocale();
  const [mapMode, setMapMode] = useState<'satellite' | 'street'>('satellite');

  const coordLabel = formatDmsDecimalLabel(latitude, longitude);
  const externalUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 1.5,
          pb: 1,
        }}
      >
        <Box component="span" sx={{ minWidth: 0 }}>
          <Typography
            component="span"
            variant="h6"
            sx={{ display: 'block', fontWeight: 700, fontSize: '1.05rem' }}
          >
            {t('Capture location on map')}
          </Typography>
          <Typography
            component="span"
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', wordBreak: 'break-word', mt: 0.25 }}
          >
            {fileName}
          </Typography>
        </Box>
        <IconButton size="small" aria-label={t('Close')} onClick={onClose}>
          <CloseRounded fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
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
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
              <Chip
                size="small"
                color="primary"
                variant="outlined"
                icon={<PlaceOutlined sx={{ fontSize: 15 }} />}
                label={coordLabel}
                sx={{ fontWeight: 600 }}
              />
              {captureTime && (
                <Typography variant="caption" color="text.secondary">
                  {t('Captured')} {captureTime}
                </Typography>
              )}
            </Stack>

            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <ButtonGroup size="small" variant="outlined">
                <Button
                  variant={mapMode === 'satellite' ? 'contained' : 'outlined'}
                  onClick={() => setMapMode('satellite')}
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  {t('Satellite')}
                </Button>
                <Button
                  variant={mapMode === 'street' ? 'contained' : 'outlined'}
                  onClick={() => setMapMode('street')}
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  {t('Street map')}
                </Button>
              </ButtonGroup>

              <Button
                component="a"
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                variant="outlined"
                endIcon={<OpenInNewRounded sx={{ fontSize: 15 }} />}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                {t('Open in Google Maps')}
              </Button>
            </Stack>
          </Stack>

          {locationDescription && (
            <Typography variant="body2" color="text.secondary">
              {locationDescription}
            </Typography>
          )}

          <CleanTileMapView
            centerLat={latitude}
            centerLon={longitude}
            mapStyle={mapMode}
            title={`Map location for ${fileName}`}
            testId="evidence-gps-map-surface"
            width={760}
            height={420}
            minHeight={320}
            maxHeight={420}
            markers={[
              {
                id: 'capture',
                latitude,
                longitude,
                label: fileName,
                ariaLabel: `Capture pin ${fileName}`,
                color: '#dc2626',
                selected: true,
              },
            ]}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.5 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', fontWeight: 600 }}>
          {t('Close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
