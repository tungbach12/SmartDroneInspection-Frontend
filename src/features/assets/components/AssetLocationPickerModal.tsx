import { useCallback, useEffect, useRef, useState, type MouseEvent, type WheelEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import CloseRounded from '@mui/icons-material/CloseRounded';
import MyLocationRounded from '@mui/icons-material/MyLocationRounded';
import AddRounded from '@mui/icons-material/AddRounded';
import RemoveRounded from '@mui/icons-material/RemoveRounded';
import PlaceRounded from '@mui/icons-material/PlaceRounded';
import SearchRounded from '@mui/icons-material/SearchRounded';
import CheckRounded from '@mui/icons-material/CheckRounded';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import SatelliteAltOutlined from '@mui/icons-material/SatelliteAltOutlined';
import MapOutlined from '@mui/icons-material/MapOutlined';
import ClearRounded from '@mui/icons-material/ClearRounded';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import {
  POPULAR_VIETNAM_LANDMARKS,
  VIETNAM_AIRSPACE_ZONES,
  evaluateAirspace,
  haversineDistanceMeters,
} from '@/shared/airspace/airspaceZones';

interface LocationSuggestion {
  id: string;
  title: string;
  subtitle: string;
  lat: number;
  lon: number;
  distanceMeters: number;
  isNoFly: boolean;
  isRestricted: boolean;
}

function normalizeSearchText(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

function formatDistanceLabel(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  if (meters < 10000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters / 1000)} km`;
}

export interface AssetLocationPickerModalProps {
  open: boolean;
  onClose: () => void;
  initialLatitude?: number | null | undefined;
  initialLongitude?: number | null | undefined;
  assetName?: string | undefined;
  onApplyCoordinates: (latitude: number, longitude: number, placeName?: string) => void;
}

export interface GoogleMapsLocationCardProps {
  latitude: number | null;
  longitude: number | null;
  placeLabel?: string | null | undefined;
  gpsLoading?: boolean;
  gpsFeedback?: string | null | undefined;
  onUseMyGps: () => void;
  onOpenMapPicker: () => void;
  onClearLocation?: (() => void) | undefined;
}

export function buildGoogleMapsExternalUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

export function parseGoogleMapsCoordinates(input: string): { lat: number; lon: number } | null {
  const trimmed = input.trim();
  const patterns = [
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /[?&](?:q|query|ll)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/,
  ];
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) {
      const lat = Number(match[1]);
      const lon = Number(match[2]);
      if (
        Number.isFinite(lat) &&
        Number.isFinite(lon) &&
        lat >= -90 &&
        lat <= 90 &&
        lon >= -180 &&
        lon <= 180
      ) {
        return { lat: Number(lat.toFixed(6)), lon: Number(lon.toFixed(6)) };
      }
    }
  }
  return null;
}

export function GoogleMapsLocationCard({
  latitude,
  longitude,
  placeLabel,
  gpsLoading = false,
  gpsFeedback,
  onUseMyGps,
  onOpenMapPicker,
  onClearLocation,
}: GoogleMapsLocationCardProps) {
  const { locale, t } = useLocale();
  const hasCoordinates = latitude != null && longitude != null;
  const mapLang = locale === 'vi' ? 'vi' : 'en';
  const airspace = hasCoordinates ? evaluateAirspace(latitude, longitude) : null;
  const isNoFlyZone = airspace?.classification === 'NO_FLY_ZONE';
  const isRestrictedZone = airspace?.classification === 'RESTRICTED_ZONE';
  const noFlyZoneNames =
    airspace?.matchingZones
      .filter((z) => z.zoneType === 'NO_FLY_ZONE')
      .map((z) => z.name)
      .join(', ') ?? '';
  const restrictedZones =
    airspace?.matchingZones.filter((z) => z.zoneType === 'RESTRICTED_ZONE') ?? [];
  const restrictedPrimary = restrictedZones[0];

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: '10px',
        border: '1px solid',
        borderColor: isNoFlyZone ? 'error.main' : isRestrictedZone ? 'warning.main' : 'divider',
        bgcolor: 'action.hover',
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.25, flexWrap: 'wrap', gap: 1 }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <PlaceRounded
            sx={{
              fontSize: 18,
              color: isNoFlyZone ? 'error.main' : isRestrictedZone ? 'warning.main' : 'primary.main',
            }}
          />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
            {t('Google Maps Location')}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={gpsLoading ? <CircularProgress size={14} /> : <MyLocationRounded sx={{ fontSize: 15 }} />}
            onClick={onUseMyGps}
            disabled={gpsLoading}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.75rem',
              borderRadius: '8px',
            }}
          >
            {gpsLoading
              ? locale === 'vi'
                ? 'Đang định vị…'
                : 'Locating…'
              : locale === 'vi'
                ? 'Lấy GPS của tôi'
                : 'Use my GPS'}
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<PlaceRounded sx={{ fontSize: 15 }} />}
            onClick={onOpenMapPicker}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.75rem',
              borderRadius: '8px',
              bgcolor: 'primary.main',
              boxShadow: 'none',
              '&:hover': { bgcolor: 'primary.dark' },
            }}
          >
            {locale === 'vi' ? 'Chọn trên Google Maps' : 'Pick on Google Maps'}
          </Button>
        </Stack>
      </Stack>

      {gpsFeedback && (
        <Alert
          severity={gpsFeedback.startsWith('✓') ? 'success' : 'info'}
          sx={{ mb: 1.25, py: 0.25, borderRadius: '8px', fontSize: '0.75rem' }}
        >
          {gpsFeedback}
        </Alert>
      )}

      {isNoFlyZone && (
        <Alert severity="error" sx={{ mb: 1.25, borderRadius: '8px', fontSize: '0.8125rem' }}>
          {locale === 'vi'
            ? `⛔ Vị trí này nằm trong Vùng Cấm Bay (${noFlyZoneNames}). Không thể đăng ký hoặc cập nhật công trình tại khu vực cấm bay — vui lòng chọn vị trí khác.`
            : `⛔ This location falls inside a prohibited No-Fly Zone (${noFlyZoneNames}). Assets inside a no-fly zone are rejected — please pick another location.`}
        </Alert>
      )}

      {isRestrictedZone && restrictedPrimary && (
        <Alert severity="warning" sx={{ mb: 1.25, borderRadius: '8px', fontSize: '0.8125rem' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8125rem' }}>
            {locale === 'vi'
              ? `Vùng hạn chế bay (MSG28) — ${restrictedPrimary.name}`
              : `Restricted Airspace (MSG28) — ${restrictedPrimary.name}`}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', mt: 0.35, color: 'text.primary' }}>
            {locale === 'vi'
              ? `Công trình vẫn có thể đăng ký/lưu bình thường, nhưng khi bay kiểm định bắt buộc phải có giấy phép bay hợp lệ từ ${restrictedPrimary.authority} (trần bay tham khảo: ≤ ${restrictedPrimary.maxAltitudeMetersAgl} m AGL). Tra cứu thêm tại `
              : `You can still register and save this asset normally, but inspection flights require a valid flight permit from ${restrictedPrimary.authority} (reference ceiling: ≤ ${restrictedPrimary.maxAltitudeMetersAgl} m AGL). Check current rules at `}
            <a href="https://cambay.mod.gov.vn" target="_blank" rel="noopener noreferrer">
              https://cambay.mod.gov.vn
            </a>
            .
          </Typography>
        </Alert>
      )}

      {hasCoordinates ? (
        <Stack spacing={1}>
          <Box
            sx={{
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              height: 200,
            }}
          >
            <iframe
              title={t('Google Maps preview')}
              src={`https://maps.google.com/maps?q=${latitude},${longitude}&hl=${mapLang}&z=16&output=embed`}
              width="100%"
              height="200"
              style={{ border: 0, display: 'block' }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </Box>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
              {placeLabel
                ? `📍 ${placeLabel}`
                : locale === 'vi'
                  ? '✓ Đã ghim vị trí trên Google Maps'
                  : '✓ Location pinned on Google Maps'}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Button
                size="small"
                variant="text"
                component="a"
                href={buildGoogleMapsExternalUrl(latitude, longitude)}
                target="_blank"
                rel="noopener noreferrer"
                endIcon={<OpenInNewRounded sx={{ fontSize: 14 }} />}
                sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', py: 0 }}
              >
                {locale === 'vi' ? 'Mở Google Maps' : 'Open Google Maps'}
              </Button>
              {onClearLocation && (
                <Button
                  size="small"
                  color="inherit"
                  startIcon={<ClearRounded sx={{ fontSize: 14 }} />}
                  onClick={onClearLocation}
                  sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0 }}
                >
                  {locale === 'vi' ? 'Bỏ ghim' : 'Clear'}
                </Button>
              )}
            </Stack>
          </Stack>
        </Stack>
      ) : (
        <Box
          onClick={onOpenMapPicker}
          sx={{
            p: 2.5,
            borderRadius: '8px',
            border: '1px dashed',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            textAlign: 'center',
            cursor: 'pointer',
            '&:hover': { borderColor: 'primary.main' },
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
            {locale === 'vi'
              ? 'Chưa chọn vị trí trên Google Maps. Bấm "Chọn trên Google Maps" để ghim vị trí công trình.'
              : 'No Google Maps pin selected yet. Click "Pick on Google Maps" to set the asset location.'}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

const DEFAULT_CENTER = { lat: 10.7805, lon: 106.7108 }; // Cầu Ba Son / Cầu Thủ Thiêm 2
const TILE_SIZE = 256;

function lonToWorldX(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * TILE_SIZE * Math.pow(2, zoom);
}

function latToWorldY(lat: number, zoom: number): number {
  const sin = Math.sin((lat * Math.PI) / 180);
  const clamped = Math.max(-0.9999, Math.min(0.9999, sin));
  return (
    (0.5 - Math.log((1 + clamped) / (1 - clamped)) / (4 * Math.PI)) *
    TILE_SIZE *
    Math.pow(2, zoom)
  );
}

function worldXToLon(x: number, zoom: number): number {
  return (x / (TILE_SIZE * Math.pow(2, zoom))) * 360 - 180;
}

function worldYToLat(y: number, zoom: number): number {
  const n = Math.PI - (2 * Math.PI * y) / (TILE_SIZE * Math.pow(2, zoom));
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

export function AssetLocationPickerModal({
  open,
  onClose,
  initialLatitude,
  initialLongitude,
  onApplyCoordinates,
}: AssetLocationPickerModalProps) {
  const { locale, t } = useLocale();

  const [pinLat, setPinLat] = useState<number>(() => {
    return typeof initialLatitude === 'number' && !Number.isNaN(initialLatitude)
      ? initialLatitude
      : DEFAULT_CENTER.lat;
  });

  const [pinLon, setPinLon] = useState<number>(() => {
    return typeof initialLongitude === 'number' && !Number.isNaN(initialLongitude)
      ? initialLongitude
      : DEFAULT_CENTER.lon;
  });

  const [centerLat, setCenterLat] = useState<number>(pinLat);
  const [centerLon, setCenterLon] = useState<number>(pinLon);
  const [zoom, setZoom] = useState<number>(16);
  const [mapLayer, setMapLayer] = useState<'m' | 'y'>('m');

  const [gpsLoading, setGpsLoading] = useState(false);
  const [userGpsCoords, setUserGpsCoords] = useState<{ lat: number; lon: number } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [placeLabel, setPlaceLabel] = useState<string>('');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [hasSearchedOnce, setHasSearchedOnce] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const skipNextLiveSearchRef = useRef(false);
  const searchAbortRef = useRef<AbortController | null>(null);
  const mapCenterRef = useRef({ lat: centerLat, lon: centerLon });

  useEffect(() => {
    mapCenterRef.current = { lat: centerLat, lon: centerLon };
  }, [centerLat, centerLon]);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const [mapSize, setMapSize] = useState({ width: 700, height: 420 });

  // Update center when initial coordinates change
  useEffect(() => {
    if (open) {
      const lat =
        typeof initialLatitude === 'number' && !Number.isNaN(initialLatitude)
          ? initialLatitude
          : DEFAULT_CENTER.lat;
      const lon =
        typeof initialLongitude === 'number' && !Number.isNaN(initialLongitude)
          ? initialLongitude
          : DEFAULT_CENTER.lon;
      setPinLat(lat);
      setPinLon(lon);
      setCenterLat(lat);
      setCenterLon(lon);
      setSuggestions([]);
      setSuggestionsOpen(false);
      setHasSearchedOnce(false);

      // Silently grab GPS proximity anchor if permission was already granted
      if (typeof navigator !== 'undefined' && navigator.geolocation && navigator.permissions?.query) {
        navigator.permissions
          .query({ name: 'geolocation' })
          .then((perm) => {
            if (perm.state === 'granted') {
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  setUserGpsCoords({
                    lat: Number(pos.coords.latitude.toFixed(6)),
                    lon: Number(pos.coords.longitude.toFixed(6)),
                  });
                },
                () => undefined,
                { maximumAge: 60000, timeout: 4000 },
              );
            }
          })
          .catch(() => undefined);
      }
    }
  }, [open, initialLatitude, initialLongitude]);

  // Close suggestions dropdown when clicking outside the search box
  useEffect(() => {
    if (!suggestionsOpen) return;
    const handleClickOutside = (event: globalThis.MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setSuggestionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [suggestionsOpen]);

  // Track map container size
  useEffect(() => {
    if (!open) return;
    const updateSize = () => {
      if (mapContainerRef.current) {
        setMapSize({
          width: mapContainerRef.current.clientWidth || 700,
          height: mapContainerRef.current.clientHeight || 420,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [open]);

  // Request current device GPS
  const handleRequestMyGps = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lon = Number(pos.coords.longitude.toFixed(6));
        setUserGpsCoords({ lat, lon });
        setPinLat(lat);
        setPinLon(lon);
        setCenterLat(lat);
        setCenterLon(lon);
        setZoom(17);
      },
      () => {
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  // Drag and pan state
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

  const centerWorldX = lonToWorldX(centerLon, zoom);
  const centerWorldY = latToWorldY(centerLat, zoom);
  const topLeftWorldX = centerWorldX - mapSize.width / 2;
  const topLeftWorldY = centerWorldY - mapSize.height / 2;

  // Pin pixel position on map
  const pinWorldX = lonToWorldX(pinLon, zoom);
  const pinWorldY = latToWorldY(pinLat, zoom);
  const pinPixelX = pinWorldX - topLeftWorldX;
  const pinPixelY = pinWorldY - topLeftWorldY;

  // Mouse pan handlers
  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    dragRef.current = {
      active: true,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startWorldX: lonToWorldX(centerLon, zoom),
      startWorldY: latToWorldY(centerLat, zoom),
      moved: false,
    };
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startClientX;
    const dy = e.clientY - dragRef.current.startClientY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      dragRef.current.moved = true;
    }
    const newWorldX = dragRef.current.startWorldX - dx;
    const newWorldY = dragRef.current.startWorldY - dy;
    setCenterLat(Number(worldYToLat(newWorldY, zoom).toFixed(6)));
    setCenterLon(Number(worldXToLon(newWorldX, zoom).toFixed(6)));
  };

  const handleMouseUp = (e: MouseEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const wasMoved = dragRef.current.moved;
    dragRef.current.active = false;

    // If user clicked without dragging, move pin to clicked coordinate
    if (!wasMoved && mapContainerRef.current) {
      const rect = mapContainerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const clickedWorldX = topLeftWorldX + clickX;
      const clickedWorldY = topLeftWorldY + clickY;
      const newLat = Number(worldYToLat(clickedWorldY, zoom).toFixed(6));
      const newLon = Number(worldXToLon(clickedWorldX, zoom).toFixed(6));
      setPinLat(newLat);
      setPinLon(newLon);
    }
  };

  // Mouse wheel zoom
  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoom((z) => Math.min(19, z + 1));
    } else if (e.deltaY > 0) {
      setZoom((z) => Math.max(10, z - 1));
    }
  };

  // Fetch and rank nearby suggestions from local registry + proximity-biased Nominatim geocoder
  const fetchNearbySuggestions = useCallback(
    async (rawQuery: string, signal?: AbortSignal): Promise<LocationSuggestion[]> => {
      const trimmed = rawQuery.trim();
      if (!trimmed) return [];

      const anchorLat = userGpsCoords?.lat ?? mapCenterRef.current.lat;
      const anchorLon = userGpsCoords?.lon ?? mapCenterRef.current.lon;
      const normalizedQuery = normalizeSearchText(trimmed);

      const candidates: LocationSuggestion[] = [];

      // 1. Local Vietnam landmarks (buildings, factories, substations, campuses)
      for (const landmark of POPULAR_VIETNAM_LANDMARKS) {
        const haystack = normalizeSearchText(`${landmark.name} ${landmark.region} ${landmark.category}`);
        if (haystack.includes(normalizedQuery)) {
          const airspace = evaluateAirspace(landmark.latitude, landmark.longitude);
          candidates.push({
            id: `landmark-${landmark.name}-${landmark.latitude}`,
            title: landmark.name,
            subtitle: `${landmark.region} · ${landmark.category}`,
            lat: landmark.latitude,
            lon: landmark.longitude,
            distanceMeters: haversineDistanceMeters(anchorLat, anchorLon, landmark.latitude, landmark.longitude),
            isNoFly: airspace.classification === 'NO_FLY_ZONE',
            isRestricted: airspace.classification === 'RESTRICTED_ZONE',
          });
        }
      }

      // 2. Known airspace zones & airports (especially useful for queries like "sân bay")
      for (const zone of VIETNAM_AIRSPACE_ZONES) {
        const haystack = normalizeSearchText(`${zone.name} ${zone.region} ${zone.description} ${zone.zoneType}`);
        const matchesAirportAlias =
          (normalizedQuery.includes('san bay') || normalizedQuery.includes('airport')) &&
          haystack.includes('san bay');
        if (haystack.includes(normalizedQuery) || matchesAirportAlias) {
          candidates.push({
            id: `zone-${zone.code}`,
            title: zone.name,
            subtitle: `${zone.region} · ${zone.description}`,
            lat: zone.latitude,
            lon: zone.longitude,
            distanceMeters: haversineDistanceMeters(anchorLat, anchorLon, zone.latitude, zone.longitude),
            isNoFly: zone.zoneType === 'NO_FLY_ZONE',
            isRestricted: zone.zoneType === 'RESTRICTED_ZONE',
          });
        }
      }

      // 3. Nominatim OpenStreetMap search biased around user's GPS / current map view
      try {
        const delta = 0.55; // ~60km radius bias box around anchor
        const viewbox = `${(anchorLon - delta).toFixed(4)},${(anchorLat + delta).toFixed(4)},${(
          anchorLon + delta
        ).toFixed(4)},${(anchorLat - delta).toFixed(4)}`;
        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=vn&addressdetails=1&limit=8&viewbox=${encodeURIComponent(
          viewbox,
        )}&bounded=0&q=${encodeURIComponent(trimmed)}`;
        const res = await fetch(url, {
          headers: { 'Accept-Language': 'vi,en' },
          ...(signal ? { signal } : {}),
        });
        const data: Array<{
          place_id?: number;
          lat?: string;
          lon?: string;
          name?: string;
          display_name?: string;
        }> = await res.json();

        if (Array.isArray(data)) {
          for (const item of data) {
            const lat = Number(item.lat);
            const lon = Number(item.lon);
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
            const roundedLat = Number(lat.toFixed(6));
            const roundedLon = Number(lon.toFixed(6));
            const displayParts = (item.display_name ?? '').split(',').map((s) => s.trim()).filter(Boolean);
            const title = item.name?.trim() || displayParts[0] || trimmed;
            const subtitle = displayParts.slice(1, 5).join(', ') || item.display_name || '';

            const duplicate = candidates.some(
              (existing) =>
                haversineDistanceMeters(existing.lat, existing.lon, roundedLat, roundedLon) < 250 &&
                normalizeSearchText(existing.title).includes(normalizeSearchText(title).slice(0, 12)),
            );
            if (duplicate) continue;

            const airspace = evaluateAirspace(roundedLat, roundedLon);
            candidates.push({
              id: `osm-${item.place_id ?? `${roundedLat}-${roundedLon}`}`,
              title,
              subtitle,
              lat: roundedLat,
              lon: roundedLon,
              distanceMeters: haversineDistanceMeters(anchorLat, anchorLon, roundedLat, roundedLon),
              isNoFly: airspace.classification === 'NO_FLY_ZONE',
              isRestricted: airspace.classification === 'RESTRICTED_ZONE',
            });
          }
        }
      } catch {
        // Keep local landmark / zone matches if Nominatim is temporarily unavailable or aborted
      }

      candidates.sort((a, b) => a.distanceMeters - b.distanceMeters);
      return candidates.slice(0, 8);
    },
    [userGpsCoords],
  );

  // Live debounced autocomplete as user types
  useEffect(() => {
    if (!open) return;
    if (skipNextLiveSearchRef.current) {
      skipNextLiveSearchRef.current = false;
      return;
    }

    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 2 || parseGoogleMapsCoordinates(trimmed)) {
      searchAbortRef.current?.abort();
      return;
    }

    const timer = window.setTimeout(async () => {
      searchAbortRef.current?.abort();
      const controller = new AbortController();
      searchAbortRef.current = controller;

      setSearchLoading(true);
      const results = await fetchNearbySuggestions(trimmed, controller.signal);
      if (!controller.signal.aborted) {
        setSuggestions(results);
        setSuggestionsOpen(true);
        setHasSearchedOnce(true);
        setSearchLoading(false);
      }
    }, 320);

    return () => {
      window.clearTimeout(timer);
    };
  }, [open, searchQuery, fetchNearbySuggestions]);

  const handleSelectSuggestion = (item: LocationSuggestion) => {
    skipNextLiveSearchRef.current = true;
    setSearchQuery(item.title);
    setSuggestionsOpen(false);
    setPinLat(item.lat);
    setPinLon(item.lon);
    setCenterLat(item.lat);
    setCenterLon(item.lon);
    setZoom(17);
    setPlaceLabel(item.title);
  };

  // Search location via Google Maps link/coordinates or open ranked suggestions dropdown
  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    const parsedFromUrl = parseGoogleMapsCoordinates(query);
    if (parsedFromUrl) {
      setSuggestionsOpen(false);
      setPinLat(parsedFromUrl.lat);
      setPinLon(parsedFromUrl.lon);
      setCenterLat(parsedFromUrl.lat);
      setCenterLon(parsedFromUrl.lon);
      setZoom(17);
      return;
    }

    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;

    setSearchLoading(true);
    try {
      const results = await fetchNearbySuggestions(query, controller.signal);
      if (controller.signal.aborted) return;
      setSuggestions(results);
      setSuggestionsOpen(true);
      setHasSearchedOnce(true);
    } finally {
      if (!controller.signal.aborted) {
        setSearchLoading(false);
      }
    }
  };

  // Calculate visible OSM tiles
  const numTiles = Math.pow(2, zoom);
  const minTileX = Math.floor(Math.max(0, topLeftWorldX) / TILE_SIZE);
  const maxTileX = Math.floor((topLeftWorldX + mapSize.width) / TILE_SIZE);
  const minTileY = Math.floor(Math.max(0, topLeftWorldY) / TILE_SIZE);
  const maxTileY = Math.floor((topLeftWorldY + mapSize.height) / TILE_SIZE);

  const tiles = [];
  for (let x = minTileX; x <= maxTileX; x++) {
    for (let y = minTileY; y <= maxTileY; y++) {
      if (x >= 0 && x < numTiles && y >= 0 && y < numTiles) {
        const left = x * TILE_SIZE - topLeftWorldX;
        const top = y * TILE_SIZE - topLeftWorldY;
        tiles.push({ x, y, left, top });
      }
    }
  }

  const pinAirspace = evaluateAirspace(pinLat, pinLon);
  const isPinNoFlyZone = pinAirspace.classification === 'NO_FLY_ZONE';
  const isPinRestrictedZone = pinAirspace.classification === 'RESTRICTED_ZONE';
  const pinRestrictedPrimary = pinAirspace.matchingZones.find((z) => z.zoneType === 'RESTRICTED_ZONE');

  const handleConfirm = () => {
    if (isPinNoFlyZone) return;
    onApplyCoordinates(pinLat, pinLon, placeLabel || undefined);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PlaceRounded sx={{ color: 'error.main', fontSize: 24 }} />
          <Box>
            <Typography variant="h6" component="h2" sx={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>
              {t('Chọn vị trí trên Google Maps')}
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} aria-label={t('Đóng')}>
          <CloseRounded />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          {/* SEARCH BAR & GPS CURRENT BUTTON */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} component="form" onSubmit={handleSearchSubmit}>
            <Box ref={searchContainerRef} sx={{ position: 'relative', flex: 1 }}>
              <TextField
                size="small"
                fullWidth
                placeholder={t('Tìm địa chỉ, tên công trình hoặc dán link Google Maps...')}
                value={searchQuery}
                onChange={(e) => {
                  const next = e.target.value;
                  setSearchQuery(next);
                  const trimmedNext = next.trim();
                  if (!trimmedNext || trimmedNext.length < 2 || parseGoogleMapsCoordinates(trimmedNext)) {
                    setSuggestions([]);
                    setSuggestionsOpen(false);
                    setHasSearchedOnce(false);
                  }
                }}
                onFocus={() => {
                  if (suggestions.length > 0 || (hasSearchedOnce && searchQuery.trim().length >= 2)) {
                    setSuggestionsOpen(true);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSuggestionsOpen(false);
                  }
                }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchRounded sx={{ fontSize: 18, color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        {searchLoading ? (
                          <CircularProgress size={16} />
                        ) : searchQuery ? (
                          <IconButton
                            size="small"
                            aria-label={t('Xóa tìm kiếm')}
                            onClick={() => {
                              setSearchQuery('');
                              setSuggestions([]);
                              setSuggestionsOpen(false);
                              setHasSearchedOnce(false);
                            }}
                          >
                            <ClearRounded sx={{ fontSize: 16 }} />
                          </IconButton>
                        ) : null}
                      </InputAdornment>
                    ),
                  },
                }}
              />

              {suggestionsOpen && (suggestions.length > 0 || (hasSearchedOnce && !searchLoading)) && (
                <Paper
                  elevation={8}
                  sx={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    zIndex: 50,
                    borderRadius: '10px',
                    border: '1px solid',
                    borderColor: 'divider',
                    maxHeight: 280,
                    overflowY: 'auto',
                  }}
                >
                  {suggestions.length === 0 ? (
                    <Box sx={{ px: 2, py: 1.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        {t('Không tìm thấy địa điểm phù hợp gần bạn. Thử từ khóa khác hoặc dán link Google Maps.')}
                      </Typography>
                    </Box>
                  ) : (
                    <List dense disablePadding>
                      {suggestions.map((item) => (
                        <ListItemButton
                          key={item.id}
                          onClick={() => handleSelectSuggestion(item)}
                          divider
                          sx={{
                            py: 1,
                            px: 1.5,
                            alignItems: 'flex-start',
                            '&:last-child': { borderBottom: 'none' },
                          }}
                        >
                          <PlaceRounded
                            sx={{
                              fontSize: 18,
                              mt: 0.25,
                              mr: 1,
                              flexShrink: 0,
                              color: item.isNoFly
                                ? 'error.main'
                                : item.isRestricted
                                  ? 'warning.main'
                                  : 'primary.main',
                            }}
                          />
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {item.title}
                                </Typography>
                                <Chip
                                  size="small"
                                  label={formatDistanceLabel(item.distanceMeters)}
                                  sx={{
                                    height: 20,
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    bgcolor: 'action.hover',
                                  }}
                                />
                                {item.isNoFly && (
                                  <Chip
                                    size="small"
                                    color="error"
                                    label={t('Vùng cấm bay')}
                                    sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
                                  />
                                )}
                                {!item.isNoFly && item.isRestricted && (
                                  <Chip
                                    size="small"
                                    color="warning"
                                    label={t('Vùng hạn chế')}
                                    sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
                                  />
                                )}
                              </Box>
                            }
                            secondary={
                              item.subtitle ? (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{
                                    display: '-webkit-box',
                                    WebkitLineClamp: 1,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                  }}
                                >
                                  {item.subtitle}
                                </Typography>
                              ) : null
                            }
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  )}
                </Paper>
              )}
            </Box>
            <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
              <Button
                variant="outlined"
                size="small"
                type="submit"
                disabled={searchLoading || !searchQuery.trim()}
                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
              >
                {t('Tìm')}
              </Button>
              <Button
                variant="contained"
                size="small"
                startIcon={gpsLoading ? <CircularProgress size={14} color="inherit" /> : <MyLocationRounded sx={{ fontSize: 16 }} />}
                onClick={handleRequestMyGps}
                disabled={gpsLoading}
                sx={{
                  bgcolor: '#0284c7',
                  '&:hover': { bgcolor: '#0369a1' },
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: '8px',
                  whiteSpace: 'nowrap',
                }}
              >
                {t('Vị trí GPS của tôi')}
              </Button>
            </Stack>
          </Stack>

          {/* INTERACTIVE MAP CONTAINER */}
          <Box
            ref={mapContainerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
            sx={{
              position: 'relative',
              height: 420,
              width: '100%',
              bgcolor: '#e5e7eb',
              overflow: 'hidden',
              borderRadius: '10px',
              border: '1.5px solid',
              borderColor: 'divider',
              cursor: dragRef.current.active ? 'grabbing' : 'grab',
              userSelect: 'none',
            }}
          >
            {/* Google Maps Tiles */}
            {tiles.map((tile) => (
              <img
                key={`${mapLayer}-${zoom}-${tile.x}-${tile.y}`}
                src={`https://mt1.google.com/vt/lyrs=${mapLayer}&hl=vi&x=${tile.x}&y=${tile.y}&z=${zoom}`}
                alt=""
                draggable={false}
                style={{
                  position: 'absolute',
                  left: `${tile.left}px`,
                  top: `${tile.top}px`,
                  width: `${TILE_SIZE}px`,
                  height: `${TILE_SIZE}px`,
                  pointerEvents: 'none',
                }}
              />
            ))}

            {/* AIRSPACE NO-FLY & RESTRICTED ZONES OVERLAY */}
            {VIETNAM_AIRSPACE_ZONES.map((zone) => {
              const zoneWorldX = lonToWorldX(zone.longitude, zoom);
              const zoneWorldY = latToWorldY(zone.latitude, zoom);
              const cx = zoneWorldX - topLeftWorldX;
              const cy = zoneWorldY - topLeftWorldY;
              const metersPerPixel =
                (156543.03392 * Math.cos((zone.latitude * Math.PI) / 180)) / Math.pow(2, zoom);
              const radiusPx = zone.radiusMeters / metersPerPixel;
              if (
                cx + radiusPx < -50 ||
                cx - radiusPx > mapSize.width + 50 ||
                cy + radiusPx < -50 ||
                cy - radiusPx > mapSize.height + 50
              ) {
                return null;
              }
              const isNoFly = zone.zoneType === 'NO_FLY_ZONE';
              return (
                <Box
                  key={zone.code}
                  sx={{
                    position: 'absolute',
                    left: `${cx - radiusPx}px`,
                    top: `${cy - radiusPx}px`,
                    width: `${radiusPx * 2}px`,
                    height: `${radiusPx * 2}px`,
                    borderRadius: '50%',
                    bgcolor: isNoFly ? 'rgba(239, 68, 68, 0.24)' : 'rgba(245, 158, 11, 0.14)',
                    border: isNoFly
                      ? '2px solid rgba(220, 38, 38, 0.9)'
                      : '1.5px dashed rgba(217, 119, 6, 0.8)',
                    pointerEvents: 'none',
                    zIndex: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {radiusPx >= 36 && (
                    <Typography
                      variant="caption"
                      sx={{
                        px: 0.75,
                        py: 0.25,
                        borderRadius: '6px',
                        bgcolor: isNoFly ? 'rgba(185, 28, 28, 0.88)' : 'rgba(180, 83, 9, 0.84)',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.6875rem',
                        maxWidth: `${Math.max(80, radiusPx * 1.5)}px`,
                        textAlign: 'center',
                        lineHeight: 1.2,
                      }}
                    >
                      {isNoFly ? `⛔ ${zone.name}` : `⚠️ ${zone.name}`}
                    </Typography>
                  )}
                </Box>
              );
            })}

            {/* THE MOVABLE PIN (KIM ĐỊNH VỊ CÔNG TRÌNH) */}
            <Box
              sx={{
                position: 'absolute',
                left: `${pinPixelX}px`,
                top: `${pinPixelY}px`,
                transform: 'translate(-50%, -100%)',
                pointerEvents: 'none',
                zIndex: 20,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.35))',
              }}
            >
              {/* Pin Icon SVG with sharp bottom point */}
              <svg width="34" height="42" viewBox="0 0 34 42" fill="none">
                <path
                  d="M17 0C7.61 0 0 7.61 0 17C0 27.5 14.5 40.5 16.2 41.8C16.7 42.1 17.3 42.1 17.8 41.8C19.5 40.5 34 27.5 34 17C34 7.61 26.39 0 17 0Z"
                  fill="#ef4444"
                />
                <circle cx="17" cy="16" r="6.5" fill="#ffffff" />
                <circle cx="17" cy="16" r="3.5" fill="#ef4444" />
              </svg>
            </Box>

            {/* MAP CONTROLS (+ / - ZOOM, SATELLITE TOGGLE, RE-CENTER) */}
            <Stack
              spacing={0.5}
              sx={{
                position: 'absolute',
                right: 12,
                top: 12,
                zIndex: 30,
              }}
            >
              <Tooltip title={mapLayer === 'm' ? t('Chế độ Vệ tinh') : t('Chế độ Bản đồ')}>
                <IconButton
                  size="small"
                  onClick={() => setMapLayer((prev) => (prev === 'm' ? 'y' : 'm'))}
                  sx={{ bgcolor: '#ffffff', boxShadow: 2, '&:hover': { bgcolor: '#f8fafc' } }}
                >
                  {mapLayer === 'm' ? <SatelliteAltOutlined fontSize="small" /> : <MapOutlined fontSize="small" />}
                </IconButton>
              </Tooltip>
              <Tooltip title={t('Phóng to')}>
                <IconButton
                  size="small"
                  onClick={() => setZoom((z) => Math.min(19, z + 1))}
                  sx={{ bgcolor: '#ffffff', boxShadow: 2, '&:hover': { bgcolor: '#f8fafc' } }}
                >
                  <AddRounded fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={t('Thu nhỏ')}>
                <IconButton
                  size="small"
                  onClick={() => setZoom((z) => Math.max(10, z - 1))}
                  sx={{ bgcolor: '#ffffff', boxShadow: 2, '&:hover': { bgcolor: '#f8fafc' } }}
                >
                  <RemoveRounded fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={t('Đưa kim ghim về tâm bản đồ')}>
                <IconButton
                  size="small"
                  onClick={() => {
                    setCenterLat(pinLat);
                    setCenterLon(pinLon);
                  }}
                  sx={{ bgcolor: '#ffffff', boxShadow: 2, '&:hover': { bgcolor: '#f8fafc' } }}
                >
                  <PlaceRounded fontSize="small" sx={{ color: '#ef4444' }} />
                </IconButton>
              </Tooltip>
            </Stack>

            <Box
              sx={{
                position: 'absolute',
                bottom: 4,
                right: 6,
                fontSize: '0.75rem',
                color: 'rgba(0,0,0,0.65)',
                bgcolor: 'rgba(255,255,255,0.8)',
                px: 0.75,
                borderRadius: '5px',
                pointerEvents: 'none',
                fontWeight: 600,
              }}
            >
              Google Maps
            </Box>
          </Box>

          {isPinRestrictedZone && pinRestrictedPrimary && (
            <Alert severity="warning" sx={{ borderRadius: '10px', fontSize: '0.8125rem' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8125rem' }}>
                {locale === 'vi'
                  ? `Vùng hạn chế bay (MSG28) — ${pinRestrictedPrimary.name}`
                  : `Restricted Airspace (MSG28) — ${pinRestrictedPrimary.name}`}
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', mt: 0.25 }}>
                {locale === 'vi'
                  ? `Bạn vẫn có thể xác nhận vị trí này, nhưng khi bay kiểm định cần giấy phép từ ${pinRestrictedPrimary.authority} (≤ ${pinRestrictedPrimary.maxAltitudeMetersAgl} m AGL). `
                  : `You can confirm this location normally; inspection flights require a permit from ${pinRestrictedPrimary.authority} (≤ ${pinRestrictedPrimary.maxAltitudeMetersAgl} m AGL). `}
                <a href="https://cambay.mod.gov.vn" target="_blank" rel="noopener noreferrer">
                  https://cambay.mod.gov.vn
                </a>
              </Typography>
            </Alert>
          )}

          {/* CURRENT PIN SUMMARY BOX */}
          <Paper
            variant="outlined"
            sx={{
              p: 1.5,
              borderRadius: '10px',
              bgcolor: 'background.default',
              borderColor: isPinNoFlyZone ? 'error.main' : 'divider',
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', sm: 'center' },
              gap: 1,
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                {t('Vị trí đã ghim trên Google Maps:')}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography
                  sx={{
                    fontWeight: 700,
                    color: isPinNoFlyZone ? 'error.main' : 'text.primary',
                    fontSize: '0.875rem',
                  }}
                >
                  {isPinNoFlyZone
                    ? t('Không hợp lệ (Trong vùng cấm bay)')
                    : placeLabel || t('Đã chọn điểm trên bản đồ')}
                </Typography>
                <Button
                  size="small"
                  variant="text"
                  component="a"
                  href={buildGoogleMapsExternalUrl(pinLat, pinLon)}
                  target="_blank"
                  rel="noopener noreferrer"
                  endIcon={<OpenInNewRounded sx={{ fontSize: 14 }} />}
                  sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', py: 0 }}
                >
                  Google Maps
                </Button>
              </Stack>
            </Box>
            <Button
              variant="contained"
              size="medium"
              startIcon={<CheckRounded />}
              disabled={isPinNoFlyZone}
              onClick={handleConfirm}
              sx={{
                borderRadius: '8px',
                px: 2.5,
                bgcolor: 'primary.main',
                fontWeight: 700,
                textTransform: 'none',
                boxShadow: 'none',
                '&:hover': { bgcolor: 'primary.dark' },
              }}
            >
              {t('Xác nhận vị trí này')}
            </Button>
          </Paper>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} color="inherit" sx={{ textTransform: 'none', fontWeight: 600 }}>
          {t('Đóng')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
