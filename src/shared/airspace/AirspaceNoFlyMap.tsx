import { useEffect, useRef, useState, type MouseEvent, type WheelEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  ClickAwayListener,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useIsDarkMode } from '@/app/layouts/ColorModeContext';
import AddRounded from '@mui/icons-material/AddRounded';
import RemoveRounded from '@mui/icons-material/RemoveRounded';
import MyLocationRounded from '@mui/icons-material/MyLocationRounded';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import RadarRounded from '@mui/icons-material/RadarRounded';
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded';
import GppBadRounded from '@mui/icons-material/GppBadRounded';
import VerifiedUserRounded from '@mui/icons-material/VerifiedUserRounded';
import PersonPinCircleRounded from '@mui/icons-material/PersonPinCircleRounded';
import EditLocationAltRounded from '@mui/icons-material/EditLocationAltRounded';
import RestartAltRounded from '@mui/icons-material/RestartAltRounded';
import CheckRounded from '@mui/icons-material/CheckRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import SearchRounded from '@mui/icons-material/SearchRounded';
import ClearRounded from '@mui/icons-material/ClearRounded';
import PlaceRounded from '@mui/icons-material/PlaceRounded';
import {
  CAMBAY_PORTAL_URL,
  VIETNAM_AIRSPACE_ZONES,
  evaluateAirspace,
  extractCoordinates,
  findSafeTakeoffPoint,
  haversineDistanceMeters,
  searchVietnamLandmarks,
  type AirspaceZone,
  type LandmarkLocation,
} from './airspaceZones';
import { useLocale } from '@/shared/i18n/LocaleProvider';

export interface AirspaceNoFlyMapProps {
  assetName?: string | null | undefined;
  locationText?: string | null | undefined;
  latitude?: number | null | undefined;
  longitude?: number | null | undefined;
  onSelectCoordinates?: ((latitude: number, longitude: number, placeName?: string) => void) | undefined;
  compact?: boolean | undefined;
}

const DEFAULT_CENTER = { lat: 10.7805, lon: 106.7108 }; // Tâm nhịp chính Cầu Ba Son (Cầu Thủ Thiêm 2)
const MAP_WIDTH = 720;
const MAP_HEIGHT = 340;

function lonToWorldX(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * 256 * Math.pow(2, zoom);
}

function latToWorldY(lat: number, zoom: number): number {
  const clamped = Math.max(-85.0511, Math.min(85.0511, lat));
  const rad = (clamped * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 256 * Math.pow(2, zoom)
  );
}

function worldXToLon(x: number, zoom: number): number {
  return (x / (256 * Math.pow(2, zoom))) * 360 - 180;
}

function worldYToLat(y: number, zoom: number): number {
  const n = Math.PI - (2 * Math.PI * y) / (256 * Math.pow(2, zoom));
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

function metersToPixels(meters: number, lat: number, zoom: number): number {
  const metersPerPixel =
    (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
  return Math.max(6, meters / Math.max(0.01, metersPerPixel));
}

function ColorDot({ color, dashed = false }: { color: string; dashed?: boolean }) {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        bgcolor: dashed ? 'transparent' : color,
        border: dashed ? `2px dashed ${color}` : `1.5px solid ${color}`,
        flexShrink: 0,
      }}
    />
  );
}

function readSavedTarget(storageKey: string): { lat: number; lon: number } | null {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.lat === 'number' &&
      !Number.isNaN(parsed.lat) &&
      typeof parsed.lon === 'number' &&
      !Number.isNaN(parsed.lon)
    ) {
      return { lat: parsed.lat, lon: parsed.lon };
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

export function AirspaceNoFlyMap({
  assetName,
  locationText,
  latitude,
  longitude,
  onSelectCoordinates,
  compact = false,
}: AirspaceNoFlyMapProps) {
  const isDark = useIsDarkMode();
  const { locale, t } = useLocale();
  const resolved = extractCoordinates(locationText, latitude, longitude);
  const baseLat = resolved.latitude ?? DEFAULT_CENTER.lat;
  const baseLon = resolved.longitude ?? DEFAULT_CENTER.lon;
  const hasCoordinates = resolved.latitude != null && resolved.longitude != null;

  const targetStorageKey = `sdi-airspace-target:${
    assetName?.trim() || (typeof window !== 'undefined' ? window.location.pathname : 'default')
  }`;
  const [zoom, setZoom] = useState<number>(compact ? 13 : 15);
  const [viewOffset, setViewOffset] = useState<{ lat: number; lon: number } | null>(null);
  const [isTargetLocked, setIsTargetLocked] = useState<boolean>(false);
  const [isAdjustingTarget, setIsAdjustingTarget] = useState<boolean>(false);
  const [customTarget, setCustomTarget] = useState<{ lat: number; lon: number } | null>(() =>
    readSavedTarget(targetStorageKey),
  );
  const [draftTarget, setDraftTarget] = useState<{ lat: number; lon: number } | null>(null);

  // Search Address / Landmark State
  const [searchQuery, setSearchQuery] = useState('');
  const [onlineResults, setOnlineResults] = useState<LandmarkLocation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);

  const [prevTargetStorageKey, setPrevTargetStorageKey] = useState(targetStorageKey);
  if (prevTargetStorageKey !== targetStorageKey) {
    setPrevTargetStorageKey(targetStorageKey);
    setCustomTarget(readSavedTarget(targetStorageKey));
  }

  // Debounced search logic for landmarks and addresses
  const localMatches = useMemo(
    () => (searchQuery.trim() ? searchVietnamLandmarks(searchQuery.trim()) : []),
    [searchQuery],
  );

  const searchResults = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return [];
    const names = new Set(localMatches.map((p) => p.name.toLowerCase()));
    const combined = [...localMatches];
    const online = q.length >= 3 ? onlineResults : [];
    for (const o of online) {
      if (!names.has(o.name.toLowerCase())) {
        combined.push(o);
      }
    }
    return combined.slice(0, 8);
  }, [searchQuery, localMatches, onlineResults]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 3) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            q,
          )}&countrycodes=vn&limit=6&addressdetails=1`,
          {
            headers: { 'Accept-Language': 'vi,en' },
            signal: controller.signal,
          },
        );
        if (res.ok) {
          const data = await res.json();
          const parsed: LandmarkLocation[] = data.map(
            (item: { display_name: string; lat: string; lon: string }) => ({
              name: item.display_name.split(',')[0]?.trim() || item.display_name,
              category: 'ĐỊA DANH' as const,
              latitude: Number(Number(item.lat).toFixed(6)),
              longitude: Number(Number(item.lon).toFixed(6)),
              region: item.display_name,
            }),
          );
          setOnlineResults(parsed);
        }
      } catch {
        // ignore network or abort errors
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  const [zoneFilter, setZoneFilter] = useState<'ALL' | 'NO_FLY_ZONE' | 'RESTRICTED_ZONE'>('ALL');
  const [selectedZoneCode, setSelectedZoneCode] = useState<string | null>(null);
  const [pilotLocation, setPilotLocation] = useState<{
    lat: number;
    lon: number;
    source: 'GPS' | 'SIMULATED';
  } | null>(null);

  const savedLat = customTarget ? customTarget.lat : baseLat;
  const savedLon = customTarget ? customTarget.lon : baseLon;
  const activeLat = isAdjustingTarget && draftTarget ? draftTarget.lat : savedLat;
  const activeLon = isAdjustingTarget && draftTarget ? draftTarget.lon : savedLon;

  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
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
  const suppressNextClickRef = useRef<boolean>(false);

  const centerLat = viewOffset ? viewOffset.lat : activeLat;
  const centerLon = viewOffset ? viewOffset.lon : activeLon;

  const evaluation = evaluateAirspace(activeLat, activeLon);
  const pilotEvaluation = pilotLocation
    ? evaluateAirspace(pilotLocation.lat, pilotLocation.lon)
    : null;
  const pilotToTargetDistanceMeters = pilotLocation
    ? Math.round(
        haversineDistanceMeters(pilotLocation.lat, pilotLocation.lon, activeLat, activeLon),
      )
    : null;

  const handleRequestMyGps = () => {
    setGpsError(null);
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsError('Trình duyệt không hỗ trợ định vị GPS.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lon = Number(pos.coords.longitude.toFixed(6));
        setPilotLocation({ lat, lon, source: 'GPS' });
      },
      () => {
        setGpsError(
          'Không lấy được GPS thiết bị (hoặc chưa cấp quyền vị trí). Bạn có thể dùng nút "Giả lập điểm đứng cất cánh" để kiểm thử.',
        );
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const handleSimulatePilotLocation = () => {
    setGpsError(null);
    if (pilotLocation?.source === 'SIMULATED') {
      setPilotLocation(null);
      return;
    }
    const safePoint = findSafeTakeoffPoint(activeLat, activeLon);
    setPilotLocation({
      lat: safePoint.lat,
      lon: safePoint.lon,
      source: 'SIMULATED',
    });
    setIsTargetLocked(false);
    setViewOffset({
      lat: Number(((activeLat + safePoint.lat) / 2).toFixed(6)),
      lon: Number(((activeLon + safePoint.lon) / 2).toFixed(6)),
    });
    setZoom(15);
  };

  const centerWorldX = lonToWorldX(centerLon, zoom);
  const centerWorldY = latToWorldY(centerLat, zoom);
  const topLeftWorldX = centerWorldX - MAP_WIDTH / 2;
  const topLeftWorldY = centerWorldY - MAP_HEIGHT / 2;

  const minTileX = Math.floor(topLeftWorldX / 256);
  const maxTileX = Math.floor((topLeftWorldX + MAP_WIDTH) / 256);
  const minTileY = Math.floor(topLeftWorldY / 256);
  const maxTileY = Math.floor((topLeftWorldY + MAP_HEIGHT) / 256);
  const maxTileIndex = Math.pow(2, zoom) - 1;

  const tiles: { key: string; url: string; left: number; top: number }[] = [];
  for (let tx = minTileX; tx <= maxTileX; tx++) {
    for (let ty = minTileY; ty <= maxTileY; ty++) {
      if (ty < 0 || ty > maxTileIndex) continue;
      const wrappedTx = ((tx % (maxTileIndex + 1)) + (maxTileIndex + 1)) % (maxTileIndex + 1);
      tiles.push({
        key: `${zoom}-${tx}-${ty}`,
        url: `https://tile.openstreetmap.org/${zoom}/${wrappedTx}/${ty}.png`,
        left: tx * 256 - topLeftWorldX,
        top: ty * 256 - topLeftWorldY,
      });
    }
  }

  const visibleZones = VIETNAM_AIRSPACE_ZONES.filter(
    (z) => zoneFilter === 'ALL' || z.zoneType === zoneFilter,
  );

  const activeSelectedZone: AirspaceZone | undefined =
    VIETNAM_AIRSPACE_ZONES.find((z) => z.code === selectedZoneCode) ??
    evaluation.matchingZones[0] ??
    evaluation.nearbyZones[0];

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
      suppressNextClickRef.current = true;
      setIsDragging(true);
    }

    if (dragRef.current.moved) {
      const rect = event.currentTarget.getBoundingClientRect();
      const mapHeightPx = compact ? 260 : MAP_HEIGHT;
      const scaleX = MAP_WIDTH / (rect.width || MAP_WIDTH);
      const scaleY = MAP_HEIGHT / (rect.height || mapHeightPx);
      const nextWorldX = dragRef.current.startWorldX - rawDx * scaleX;
      const nextWorldY = dragRef.current.startWorldY - rawDy * scaleY;
      setIsTargetLocked(false);
      setViewOffset({
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

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey && !event.metaKey && Math.abs(event.deltaY) < 10) return;
    event.preventDefault();
    setZoom((z) => (event.deltaY < 0 ? Math.min(16, z + 1) : Math.max(10, z - 1)));
  };

  const handleMapClick = (event: MouseEvent<HTMLDivElement>) => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }
    if (!onSelectCoordinates && !isAdjustingTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = ((event.clientX - rect.left) / (rect.width || MAP_WIDTH)) * MAP_WIDTH;
    const clickY = ((event.clientY - rect.top) / (rect.height || MAP_HEIGHT)) * MAP_HEIGHT;
    const worldX = topLeftWorldX + clickX;
    const worldY = topLeftWorldY + clickY;
    const pickedLat = Number(worldYToLat(worldY, zoom).toFixed(6));
    const pickedLon = Number(worldXToLon(worldX, zoom).toFixed(6));

    if (isAdjustingTarget) {
      // Keep adjustment mode open so the user can click as many candidate points as they want
      setDraftTarget({ lat: pickedLat, lon: pickedLon });
      return;
    }
    if (onSelectCoordinates) {
      setViewOffset({ lat: pickedLat, lon: pickedLon });
      onSelectCoordinates(pickedLat, pickedLon);
    }
  };

  const handleSelectLocation = (loc: { name: string; latitude: number; longitude: number }) => {
    setViewOffset(null);
    setCustomTarget({ lat: loc.latitude, lon: loc.longitude });
    setDraftTarget({ lat: loc.latitude, lon: loc.longitude });
    setZoom(16);
    setIsTargetLocked(true);
    setSearchFeedback(`Đã chọn: ${loc.name}`);
    setShowSearchDropdown(false);
    setSearchQuery(loc.name);
    try {
      window.localStorage.setItem(
        targetStorageKey,
        JSON.stringify({ lat: loc.latitude, lon: loc.longitude }),
      );
    } catch {
      // ignore storage errors
    }
    if (onSelectCoordinates) {
      onSelectCoordinates(loc.latitude, loc.longitude, loc.name);
    }
  };

  const handleStartAdjustTarget = () => {
    setDraftTarget(customTarget ?? { lat: baseLat, lon: baseLon });
    setIsAdjustingTarget(true);
  };

  const handleConfirmTarget = () => {
    if (draftTarget) {
      setCustomTarget(draftTarget);
      try {
        window.localStorage.setItem(targetStorageKey, JSON.stringify(draftTarget));
      } catch {
        // ignore storage errors
      }
      if (onSelectCoordinates) {
        onSelectCoordinates(draftTarget.lat, draftTarget.lon);
      }
    }
    setIsAdjustingTarget(false);
    setDraftTarget(null);
  };

  const handleCancelAdjustTarget = () => {
    setIsAdjustingTarget(false);
    setDraftTarget(null);
  };

  const markerX = lonToWorldX(activeLon, zoom) - topLeftWorldX;
  const markerY = latToWorldY(activeLat, zoom) - topLeftWorldY;
  const pilotX = pilotLocation ? lonToWorldX(pilotLocation.lon, zoom) - topLeftWorldX : null;
  const pilotY = pilotLocation ? latToWorldY(pilotLocation.lat, zoom) - topLeftWorldY : null;

  const statusMeta =
    evaluation.classification === 'NO_FLY_ZONE'
      ? {
          color: 'error' as const,
          badgeBg: isDark ? 'rgba(239, 68, 68, 0.16)' : '#fef2f2',
          badgeBorder: isDark ? 'rgba(239, 68, 68, 0.4)' : '#fecaca',
          badgeColor: isDark ? '#fca5a5' : '#b91c1c',
          label: locale === 'vi' ? 'VÙNG CẤM BAY TUYỆT ĐỐI' : 'VÙNG CẤM BAY (NO-FLY ZONE)',
          icon: <GppBadRounded sx={{ fontSize: 16, color: isDark ? '#f87171' : '#dc2626' }} />,
        }
      : evaluation.classification === 'RESTRICTED_ZONE'
        ? {
            color: 'warning' as const,
            badgeBg: isDark ? 'rgba(245, 158, 11, 0.16)' : '#fffbeb',
            badgeBorder: isDark ? 'rgba(245, 158, 11, 0.4)' : '#fde68a',
            badgeColor: isDark ? '#fcd34d' : '#b45309',
            label: locale === 'vi' ? 'VÙNG HẠN CHẾ BAY' : 'VÙNG HẠN CHẾ BAY (RESTRICTED)',
            icon: <WarningAmberRounded sx={{ fontSize: 16, color: isDark ? '#fbbf24' : '#d97706' }} />,
          }
        : {
            color: 'success' as const,
            badgeBg: isDark ? 'rgba(16, 185, 129, 0.16)' : '#f0fdf4',
            badgeBorder: isDark ? 'rgba(16, 185, 129, 0.4)' : '#bbf7d0',
            badgeColor: isDark ? '#6ee7b7' : '#15803d',
            label: locale === 'vi' ? 'VÙNG ĐƯỢC PHÉP BAY' : 'VÙNG ĐƯỢC PHÉP BAY (CLEAR ZONE)',
            icon: <VerifiedUserRounded sx={{ fontSize: 16, color: isDark ? '#34d399' : '#16a34a' }} />,
          };

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: '16px',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Stack spacing={1.75}>
        {/* Header */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.5}
          sx={{
            alignItems: { md: 'center' },
            justifyContent: 'space-between',
          }}
        >
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                bgcolor: isDark ? 'rgba(148, 163, 184, 0.12)' : '#f1f5f9',
                border: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <RadarRounded sx={{ fontSize: 20, color: 'text.primary' }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.3 }}>
                Bản đồ Không phận & Vùng cấm bay
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                Quyết định 18/2020/QĐ-TTg · Luật Phòng không nhân dân 2024 · Nghị định 288/2025/NĐ-CP
              </Typography>
            </Box>
          </Stack>

          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}
          >
            <Chip
              size="small"
              icon={statusMeta.icon}
              label={statusMeta.label}
              sx={{
                height: 28,
                bgcolor: statusMeta.badgeBg,
                border: `1px solid ${statusMeta.badgeBorder}`,
                color: statusMeta.badgeColor,
                fontWeight: 600,
                fontSize: '0.75rem',
              }}
            />
            <Button
              size="small"
              variant="outlined"
              component="a"
              href={CAMBAY_PORTAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              endIcon={<OpenInNewRounded sx={{ fontSize: 15 }} />}
              sx={{
                height: 28,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.75rem',
                borderRadius: '8px',
                borderColor: 'divider',
                color: 'text.primary',
                px: 1.25,
                '&:hover': { borderColor: 'text.secondary', bgcolor: 'action.hover' },
              }}
            >
              cambay.mod.gov.vn
            </Button>
          </Stack>
        </Stack>

        {/* MSG28 or Clear Advisory Alert */}
        <Alert
          severity={statusMeta.color}
          sx={{
            borderRadius: '12px',
            py: 0.75,
            '& .MuiAlert-message': { width: '100%' },
          }}
          action={
            <Chip
              size="small"
              label={evaluation.messageCode}
              color={statusMeta.color}
              variant="outlined"
              sx={{ fontWeight: 700, height: 22, fontSize: '0.7rem' }}
            />
          }
        >
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.84rem' }}>
            [{evaluation.messageCode}] {t(evaluation.advisoryMessage)}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', mt: 0.25, color: 'text.secondary' }}>
            {evaluation.classification === 'NO_FLY_ZONE'
              ? 'Tọa độ công trình nằm trong Vùng Cấm Bay Tuyệt Đối. Không được phép cất cánh nếu chưa có văn bản cho phép đặc biệt của Cục Tác chiến - Bộ Tổng Tham mưu.'
              : evaluation.classification === 'RESTRICTED_ZONE'
                ? `Công trình nằm trong ${evaluation.matchingZones.length} vùng hạn chế bay (${evaluation.matchingZones.map((z) => z.name).join('; ')}). Bắt buộc đối chiếu giới hạn độ cao và tải lên Giấy phép bay hợp lệ trước khi mở phiên bay.`
                : 'Khu vực ngoài phạm vi vùng cấm tĩnh đã công bố. Kiểm định viên vẫn bắt buộc tải lên Giấy phép bay hợp lệ theo quy định.'}
          </Typography>
        </Alert>

        {/* Address & Landmark Search Bar */}
        <Box sx={{ position: 'relative' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
            <ClickAwayListener onClickAway={() => setShowSearchDropdown(false)}>
              <Box sx={{ position: 'relative', flex: 1 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 0.5,
                    px: 1.25,
                    borderRadius: '10px',
                    bgcolor: isDark ? 'rgba(30, 41, 59, 0.7)' : '#ffffff',
                    border: '1px solid',
                    borderColor: showSearchDropdown ? 'primary.main' : 'divider',
                    boxShadow: showSearchDropdown ? '0 0 0 2px rgba(99, 102, 241, 0.2)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {isSearching ? (
                    <CircularProgress size={16} sx={{ color: 'primary.main', flexShrink: 0 }} />
                  ) : (
                    <SearchRounded sx={{ fontSize: 18, color: 'text.secondary', flexShrink: 0 }} />
                  )}
                  <TextField
                    variant="standard"
                    fullWidth
                    value={searchQuery}
                    placeholder="Tìm kiếm công trình, địa chỉ (VD: Cầu Phú Mỹ, Cầu Ba Son, Cảng Cát Lái, Landmark 81...)"
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSearchDropdown(true);
                    }}
                    onFocus={() => {
                      if (searchQuery.trim()) setShowSearchDropdown(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && searchResults.length > 0) {
                        e.preventDefault();
                        handleSelectLocation(searchResults[0]!);
                      }
                    }}
                    slotProps={{
                      input: {
                        disableUnderline: true,
                        sx: { fontSize: '0.8125rem', color: 'text.primary' },
                      },
                      htmlInput: {
                        autoComplete: 'off',
                        spellCheck: false,
                        'data-lpignore': 'true',
                      },
                    }}
                  />
                  {searchQuery && (
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSearchQuery('');
                        setSearchResults([]);
                        setShowSearchDropdown(false);
                      }}
                      sx={{ p: 0.25 }}
                    >
                      <ClearRounded sx={{ fontSize: 16 }} />
                    </IconButton>
                  )}
                </Box>

                {/* Search Autocomplete Suggestions Dropdown */}
                {showSearchDropdown && searchResults.length > 0 && (
                  <Paper
                    elevation={8}
                    sx={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      mt: 0.75,
                      zIndex: 50,
                      maxHeight: 280,
                      overflowY: 'auto',
                      borderRadius: '10px',
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'background.paper',
                    }}
                  >
                    {searchResults.map((item, idx) => (
                      <Box
                        key={`${item.name}-${idx}`}
                        onClick={() => handleSelectLocation(item)}
                        sx={{
                          p: 1.25,
                          px: 1.5,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 1.5,
                          borderBottom: idx < searchResults.length - 1 ? '1px solid' : 'none',
                          borderColor: 'divider',
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            <PlaceRounded sx={{ fontSize: 16, color: 'primary.main', flexShrink: 0 }} />
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.84rem' }} noWrap>
                              {item.name}
                            </Typography>
                            <Chip
                              size="small"
                              label={item.category}
                              sx={{ height: 18, fontSize: '9.5px', fontWeight: 700 }}
                            />
                          </Stack>
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }} noWrap>
                            {item.region}
                          </Typography>
                        </Box>
                        <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600, flexShrink: 0, fontSize: '11px' }}>
                          {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                        </Typography>
                      </Box>
                    ))}
                  </Paper>
                )}
              </Box>
            </ClickAwayListener>
          </Stack>

          {searchFeedback && (
            <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 600, mt: 0.5, display: 'block' }}>
              ✓ {searchFeedback}
            </Typography>
          )}
        </Box>

        {/* Unified Single-Row Control Bar */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', lg: 'row' },
            alignItems: { xs: 'stretch', lg: 'center' },
            justifyContent: 'space-between',
            gap: 1,
            p: 0.75,
            borderRadius: '12px',
            bgcolor: isDark ? 'rgba(15, 23, 42, 0.65)' : '#f8fafc',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          {/* Left: Segmented Zone Filter */}
          <Stack
            direction="row"
            spacing={0.5}
            sx={{
              bgcolor: isDark ? '#1e293b' : '#eef2f6',
              p: 0.35,
              borderRadius: '9px',
              alignSelf: { xs: 'flex-start', lg: 'center' },
            }}
          >
            {(
              [
                { key: 'ALL', label: 'Tất cả vùng', dot: null },
                { key: 'NO_FLY_ZONE', label: 'Vùng cấm bay', dot: '#dc2626' },
                { key: 'RESTRICTED_ZONE', label: 'Vùng hạn chế', dot: '#d97706' },
              ] as const
            ).map((item) => {
              const active = zoneFilter === item.key;
              return (
                <Button
                  key={item.key}
                  size="small"
                  disableElevation
                  onClick={() => setZoneFilter(item.key)}
                  sx={{
                    minWidth: 'unset',
                    height: 28,
                    px: 1.25,
                    borderRadius: '7px',
                    textTransform: 'none',
                    whiteSpace: 'nowrap',
                    fontSize: '0.75rem',
                    fontWeight: active ? 600 : 500,
                    color: active ? 'text.primary' : 'text.secondary',
                    bgcolor: active ? (isDark ? '#334155' : '#ffffff') : 'transparent',
                    boxShadow: active ? '0 1px 2px rgba(15, 23, 42, 0.12)' : 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.75,
                    '&:hover': {
                      bgcolor: active
                        ? isDark
                          ? '#334155'
                          : '#ffffff'
                        : isDark
                          ? 'rgba(255,255,255,0.06)'
                          : 'rgba(255,255,255,0.5)',
                    },
                  }}
                >
                  {item.dot && <ColorDot color={item.dot} />}
                  {item.label}
                </Button>
              );
            })}
          </Stack>

          {/* Right: Positioning & Region Quick Actions */}
          <Stack
            direction="row"
            spacing={0.75}
            sx={{
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 0.5,
            }}
          >
            <Button
              size="small"
              variant="outlined"
              startIcon={<MyLocationRounded sx={{ fontSize: 15 }} />}
              onClick={handleRequestMyGps}
              sx={{
                height: 28,
                px: 1.15,
                textTransform: 'none',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '8px',
                borderColor: pilotLocation?.source === 'GPS' ? '#0284c7' : 'divider',
                bgcolor:
                  pilotLocation?.source === 'GPS'
                    ? isDark
                      ? 'rgba(2, 132, 199, 0.22)'
                      : '#e0f2fe'
                    : 'background.paper',
                color:
                  pilotLocation?.source === 'GPS'
                    ? isDark
                      ? '#7dd3fc'
                      : '#0369a1'
                    : 'text.primary',
                '&:hover': {
                  borderColor: 'text.secondary',
                  bgcolor: 'action.hover',
                },
              }}
            >
              Vị trí của tôi (GPS)
            </Button>

            <Button
              size="small"
              variant="outlined"
              startIcon={<PersonPinCircleRounded sx={{ fontSize: 15 }} />}
              onClick={handleSimulatePilotLocation}
              sx={{
                height: 28,
                px: 1.15,
                textTransform: 'none',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '8px',
                borderColor: pilotLocation?.source === 'SIMULATED' ? '#0284c7' : 'divider',
                bgcolor:
                  pilotLocation?.source === 'SIMULATED'
                    ? isDark
                      ? 'rgba(2, 132, 199, 0.22)'
                      : '#e0f2fe'
                    : 'background.paper',
                color:
                  pilotLocation?.source === 'SIMULATED'
                    ? isDark
                      ? '#7dd3fc'
                      : '#0369a1'
                    : 'text.primary',
                '&:hover': {
                  borderColor: 'text.secondary',
                  bgcolor: 'action.hover',
                },
              }}
            >
              Giả lập điểm đứng cất cánh
            </Button>

            {!isAdjustingTarget ? (
              <Button
                size="small"
                variant="outlined"
                startIcon={<EditLocationAltRounded sx={{ fontSize: 15 }} />}
                onClick={handleStartAdjustTarget}
                sx={{
                  height: 28,
                  px: 1.15,
                  textTransform: 'none',
                  whiteSpace: 'nowrap',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: '8px',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  color: 'text.primary',
                  '&:hover': {
                    borderColor: 'text.secondary',
                    bgcolor: 'action.hover',
                  },
                }}
              >
                Điều chỉnh mục tiêu
              </Button>
            ) : (
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                <Button
                  size="small"
                  variant="contained"
                  color="primary"
                  startIcon={<CheckRounded sx={{ fontSize: 15 }} />}
                  onClick={handleConfirmTarget}
                  sx={{
                    height: 28,
                    px: 1.25,
                    textTransform: 'none',
                    whiteSpace: 'nowrap',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    borderRadius: '8px',
                  }}
                >
                  Xác nhận mục tiêu
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<CloseRounded sx={{ fontSize: 15 }} />}
                  onClick={handleCancelAdjustTarget}
                  sx={{
                    height: 28,
                    px: 1,
                    textTransform: 'none',
                    whiteSpace: 'nowrap',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    borderRadius: '8px',
                    borderColor: 'divider',
                    color: 'text.secondary',
                  }}
                >
                  Hủy
                </Button>
              </Stack>
            )}

            {customTarget && !isAdjustingTarget && (
              <Button
                size="small"
                variant="text"
                startIcon={<RestartAltRounded sx={{ fontSize: 15 }} />}
                onClick={() => {
                  setCustomTarget(null);
                  setDraftTarget(null);
                  setIsAdjustingTarget(false);
                  try {
                    window.localStorage.removeItem(targetStorageKey);
                  } catch {
                    // ignore storage errors
                  }
                }}
                sx={{
                  height: 28,
                  px: 1,
                  textTransform: 'none',
                  whiteSpace: 'nowrap',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  borderRadius: '8px',
                  color: isDark ? '#c4b5fd' : '#6d28d9',
                }}
              >
                Khôi phục vị trí gốc
              </Button>
            )}

            <Divider orientation="vertical" flexItem sx={{ mx: 0.25, display: { xs: 'none', sm: 'block' } }} />

            <Stack direction="row" spacing={0.25} sx={{ alignItems: 'center' }}>
              {(
                [
                  { label: 'TP.HCM', lat: 10.79, lon: 106.695 },
                  { label: 'Hà Nội', lat: 21.0369, lon: 105.8342 },
                  { label: 'Đà Nẵng', lat: 16.0539, lon: 108.1994 },
                ] as const
              ).map((region) => (
                <Button
                  key={region.label}
                  size="small"
                  variant="text"
                  onClick={() => {
                    setIsTargetLocked(false);
                    setViewOffset({ lat: region.lat, lon: region.lon });
                    setZoom(12);
                  }}
                  sx={{
                    minWidth: 'unset',
                    height: 26,
                    px: 0.9,
                    borderRadius: '6px',
                    textTransform: 'none',
                    fontSize: '0.73rem',
                    fontWeight: 500,
                    color: 'text.secondary',
                    '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
                  }}
                >
                  {region.label}
                </Button>
              ))}
            </Stack>
          </Stack>
        </Box>

        {/* Interactive OpenStreetMap + SVG Airspace Vector Map */}
        <Box
          data-testid="airspace-map-surface"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          onWheel={handleWheel}
          onDoubleClick={() => setZoom((z) => Math.min(16, z + 1))}
          onClick={handleMapClick}
          sx={{
            position: 'relative',
            width: '100%',
            height: compact ? 260 : MAP_HEIGHT,
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid #cbd5e1',
            bgcolor: '#e2e8f0',
            cursor: isDragging
              ? 'grabbing'
              : onSelectCoordinates || isAdjustingTarget
                ? 'crosshair'
                : 'grab',
            userSelect: 'none',
            touchAction: 'none',
          }}
        >
          {/* OpenStreetMap Raster Tile Layer */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
            }}
          >
            {tiles.map((tile) => (
              <Box
                component="img"
                key={tile.key}
                src={tile.url}
                alt=""
                draggable={false}
                sx={{
                  position: 'absolute',
                  left: `${(tile.left / MAP_WIDTH) * 100}%`,
                  top: `${(tile.top / MAP_HEIGHT) * 100}%`,
                  width: `${(256 / MAP_WIDTH) * 100}%`,
                  height: `${(256 / MAP_HEIGHT) * 100}%`,
                  objectFit: 'fill',
                  filter: isDark
                    ? 'invert(0.88) hue-rotate(180deg) brightness(0.92) contrast(0.96)'
                    : 'contrast(1.02) saturate(0.95)',
                }}
              />
            ))}
          </Box>

          {/* SVG No-Fly & Restricted Airspace Vector Overlay */}
          <Box
            component="svg"
            viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
            preserveAspectRatio="none"
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              pointerEvents: isAdjustingTarget || onSelectCoordinates ? 'none' : 'auto',
            }}
          >
            {visibleZones.map((zone) => {
              const cx = lonToWorldX(zone.longitude, zoom) - topLeftWorldX;
              const cy = latToWorldY(zone.latitude, zoom) - topLeftWorldY;
              const r = metersToPixels(zone.radiusMeters, zone.latitude, zoom);
              const isNoFly = zone.zoneType === 'NO_FLY_ZONE';
              const isSelected = activeSelectedZone?.code === zone.code;

              return (
                <g
                  key={zone.code}
                  style={{
                    cursor: isAdjustingTarget ? 'crosshair' : 'pointer',
                  }}
                  onClick={() => {
                    if (!isAdjustingTarget && !onSelectCoordinates) {
                      setSelectedZoneCode(zone.code);
                    }
                  }}
                >
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill={isNoFly ? 'rgba(220, 38, 38, 0.22)' : 'rgba(217, 119, 6, 0.14)'}
                    stroke={isNoFly ? '#dc2626' : '#d97706'}
                    strokeWidth={isSelected ? 2.5 : 1.75}
                    strokeDasharray={isNoFly ? undefined : '7 4'}
                  />
                  <circle
                    cx={cx}
                    cy={cy}
                    r={3.5}
                    fill={isNoFly ? '#b91c1c' : '#b45309'}
                    stroke="#ffffff"
                    strokeWidth={1.5}
                  />
                </g>
              );
            })}

            {/* Flight Vector Line from Pilot Take-off Location to Asset Target */}
            {pilotX != null && pilotY != null && (
              <g>
                <line
                  x1={pilotX}
                  y1={pilotY}
                  x2={markerX}
                  y2={markerY}
                  stroke="#0284c7"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                />
                <circle
                  cx={pilotX}
                  cy={pilotY}
                  r={14}
                  fill="rgba(2, 132, 199, 0.20)"
                  stroke="#0284c7"
                  strokeWidth={1.25}
                />
                <circle
                  cx={pilotX}
                  cy={pilotY}
                  r={6}
                  fill="#0284c7"
                  stroke="#ffffff"
                  strokeWidth={2}
                />
                <rect
                  x={pilotX + 10}
                  y={pilotY - 11}
                  width={136}
                  height={20}
                  rx={5}
                  fill="rgba(15, 23, 42, 0.86)"
                />
                <circle cx={pilotX + 19} cy={pilotY - 1} r={3.5} fill="#38bdf8" />
                <text
                  x={pilotX + 27}
                  y={pilotY + 3}
                  fill="#f8fafc"
                  fontSize="10"
                  fontWeight="600"
                  fontFamily="Inter, system-ui, sans-serif"
                >
                  Điểm cất cánh (Pilot)
                </text>
              </g>
            )}

            {/* Asset Location Target Pin (Mục tiêu Công trình cần kiểm tra) */}
            <g>
              {isTargetLocked && viewOffset === null && (
                <circle
                  cx={markerX}
                  cy={markerY}
                  r={32}
                  fill="rgba(124, 58, 237, 0.12)"
                  stroke="#7c3aed"
                  strokeWidth={2}
                />
              )}
              <circle
                cx={markerX}
                cy={markerY}
                r={18}
                fill="rgba(124, 58, 237, 0.16)"
                stroke="#7c3aed"
                strokeWidth={1.75}
                strokeDasharray="4 2"
              />
              <line
                x1={markerX - 12}
                y1={markerY}
                x2={markerX + 12}
                y2={markerY}
                stroke="#6d28d9"
                strokeWidth={1.25}
              />
              <line
                x1={markerX}
                y1={markerY - 12}
                x2={markerX}
                y2={markerY + 12}
                stroke="#6d28d9"
                strokeWidth={1.25}
              />
              <circle
                cx={markerX}
                cy={markerY}
                r={6.5}
                fill="#7c3aed"
                stroke="#ffffff"
                strokeWidth={2}
              />
              <rect
                x={markerX + 11}
                y={markerY - 11}
                width={132}
                height={20}
                rx={5}
                fill="rgba(15, 23, 42, 0.86)"
              />
              <circle cx={markerX + 20} cy={markerY - 1} r={3.5} fill="#a855f7" />
              <text
                x={markerX + 28}
                y={markerY + 3}
                fill="#f8fafc"
                fontSize="10"
                fontWeight="600"
                fontFamily="Inter, system-ui, sans-serif"
              >
                Mục tiêu công trình
              </text>
            </g>
          </Box>

          {/* Top-Left Coordinate & Asset Overlay Pill */}
          <Box
            sx={{
              position: 'absolute',
              top: 10,
              left: 10,
              bgcolor: 'rgba(15, 23, 42, 0.84)',
              color: '#ffffff',
              px: 1.5,
              py: 0.85,
              borderRadius: '10px',
              backdropFilter: 'blur(6px)',
              maxWidth: '78%',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <ColorDot color="#a855f7" />
              <Typography variant="caption" sx={{ fontWeight: 600, color: '#f8fafc' }}>
                Mục tiêu công trình cần kiểm tra ({assetName || 'Vị trí khảo sát'}):{' '}
                {activeLat.toFixed(4)}°N, {activeLon.toFixed(4)}°E
                {isAdjustingTarget
                  ? ' · Đang chọn vị trí mới (Chưa lưu)'
                  : customTarget
                    ? ' · Đã điều chỉnh điểm mục tiêu'
                    : ''}
                {isTargetLocked && viewOffset === null ? ` · Đã khóa tâm (Zoom ${zoom}x)` : ''}
              </Typography>
            </Stack>
            {isAdjustingTarget && (
              <Typography variant="caption" sx={{ color: '#e9d5ff', display: 'block', mt: 0.25 }}>
                Nhấp chuột vào bất kỳ điểm nào trên bản đồ để chọn mục tiêu, sau đó bấm "Xác nhận mục tiêu" để lưu.
              </Typography>
            )}
            {pilotLocation && (
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.4 }}>
                <ColorDot color="#38bdf8" />
                <Typography variant="caption" sx={{ color: '#bae6fd' }}>
                  Vị trí người điều khiển / Điểm cất cánh (
                  {pilotLocation.source === 'GPS' ? 'GPS thiết bị' : 'Giả lập hiện trường'}):{' '}
                  {pilotLocation.lat.toFixed(4)}°N, {pilotLocation.lon.toFixed(4)}°E · Cách mục
                  tiêu:{' '}
                  <strong>
                    {pilotToTargetDistanceMeters != null && pilotToTargetDistanceMeters >= 1000
                      ? `${(pilotToTargetDistanceMeters / 1000).toFixed(2)} km`
                      : `${pilotToTargetDistanceMeters ?? 0} m`}
                  </strong>
                </Typography>
              </Stack>
            )}
            {!hasCoordinates && (
              <Typography variant="caption" sx={{ color: '#fde68a', display: 'block', mt: 0.25 }}>
                Đang hiển thị tọa độ mặc định trung tâm TP.HCM
              </Typography>
            )}
            {onSelectCoordinates && (
              <Typography variant="caption" sx={{ color: '#cbd5e1', display: 'block', mt: 0.25 }}>
                Nhấp chuột lên bản đồ để chọn tọa độ công trình
              </Typography>
            )}
          </Box>

          {/* Zoom Controls */}
          <Stack
            spacing={0.25}
            sx={{
              position: 'absolute',
              top: 10,
              right: 10,
              bgcolor: isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.94)',
              borderRadius: '8px',
              p: 0.35,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 1px 4px rgba(15, 23, 42, 0.16)',
            }}
          >
            <Tooltip title="Phóng to">
              <span>
                <IconButton
                  size="small"
                  disabled={zoom >= 16}
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoom((z) => Math.min(16, z + 1));
                  }}
                  sx={{ p: 0.4, color: 'text.primary' }}
                >
                  <AddRounded fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Divider />
            <Tooltip title="Thu nhỏ">
              <span>
                <IconButton
                  size="small"
                  disabled={zoom <= 10}
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoom((z) => Math.max(10, z - 1));
                  }}
                  sx={{ p: 0.4, color: 'text.primary' }}
                >
                  <RemoveRounded fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>

          {/* Bottom-Right Map Attribution */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 6,
              right: 8,
              bgcolor: isDark ? 'rgba(15, 23, 42, 0.86)' : 'rgba(255, 255, 255, 0.88)',
              px: 1,
              py: 0.25,
              borderRadius: '6px',
            }}
          >
            <Typography variant="caption" sx={{ fontSize: '0.68rem', color: isDark ? '#cbd5e1' : '#334155' }}>
              © OpenStreetMap · QĐ 18/2020/QĐ-TTg & NĐ 288/2025/NĐ-CP
            </Typography>
          </Box>
        </Box>

        {/* Clean Minimal Legend Bar */}
        <Stack
          direction="row"
          spacing={2.5}
          sx={{
            flexWrap: 'wrap',
            rowGap: 0.75,
            px: 1.5,
            py: 0.85,
            borderRadius: '10px',
            bgcolor: isDark ? 'rgba(15, 23, 42, 0.65)' : '#f8fafc',
            border: '1px solid',
            borderColor: 'divider',
            alignItems: 'center',
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
            Chú giải:
          </Typography>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <ColorDot color="#a855f7" />
            <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 500 }}>
              Mục tiêu công trình cần kiểm tra
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <ColorDot color="#38bdf8" />
            <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 500 }}>
              Vị trí người điều khiển / Điểm cất cánh
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <ColorDot color="#ef4444" />
            <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 500 }}>
              Vùng cấm bay tuyệt đối (No-Fly)
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <ColorDot color="#f59e0b" dashed />
            <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 500 }}>
              Vùng hạn chế bay (Restricted)
            </Typography>
          </Stack>
        </Stack>

        {gpsError && (
          <Alert severity="info" sx={{ borderRadius: '10px', py: 0.5 }}>
            {gpsError}
          </Alert>
        )}

        {/* Đánh giá an toàn không phận tại điểm đứng cất cánh của Người điều khiển */}
        {pilotLocation && pilotEvaluation && (
          <Alert
            severity={
              pilotEvaluation.classification === 'NO_FLY_ZONE'
                ? 'error'
                : 'success'
            }
            action={
              pilotEvaluation.classification === 'NO_FLY_ZONE' ? (
                <Button
                  size="small"
                  color="inherit"
                  variant="outlined"
                  onClick={() => {
                    const safePoint = findSafeTakeoffPoint(activeLat, activeLon);
                    setPilotLocation({
                      lat: safePoint.lat,
                      lon: safePoint.lon,
                      source: 'SIMULATED',
                    });
                  }}
                  sx={{ textTransform: 'none', fontSize: '0.73rem', whiteSpace: 'nowrap' }}
                >
                  Dời ra ngoài vùng cấm
                </Button>
              ) : undefined
            }
            sx={{ borderRadius: '12px', py: 0.75 }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.84rem' }}>
              {pilotEvaluation.classification === 'NO_FLY_ZONE'
                ? `Cảnh báo điểm đứng cất cánh: Vị trí người điều khiển (${pilotLocation.lat.toFixed(4)}°N, ${pilotLocation.lon.toFixed(4)}°E) đang nằm trong Vùng Cấm Bay Tuyệt Đối (${pilotEvaluation.matchingZones.map((z) => z.name).join('; ')}).`
                : `Điểm đứng cất cánh hợp lệ (Ngoài vùng cấm bay đỏ): Vị trí người điều khiển (${pilotLocation.lat.toFixed(4)}°N, ${pilotLocation.lon.toFixed(4)}°E) đã tự động đặt ngoài ranh giới Vùng Cấm Bay Tuyệt Đối.`}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 0.25, color: 'text.secondary' }}>
              Khoảng cách tới mục tiêu công trình:{' '}
              <strong>
                {pilotToTargetDistanceMeters != null && pilotToTargetDistanceMeters >= 1000
                  ? `${(pilotToTargetDistanceMeters / 1000).toFixed(2)} km`
                  : `${pilotToTargetDistanceMeters ?? 0} m`}
              </strong>
              {pilotEvaluation.classification === 'NO_FLY_ZONE'
                ? ' — Vui lòng nhấn "Dời ra ngoài vùng cấm" hoặc di chuyển điểm đặt trạm điều khiển sang phía ngoài ranh giới đỏ trước khi khởi động Drone.'
                : ' — Đảm bảo tầm nhìn thẳng (VLOS) tới công trình và tuân thủ trần bay theo Giấy phép bay.'}
            </Typography>
          </Alert>
        )}

        {/* Active / Selected Airspace Zone Details */}
        {activeSelectedZone && (
          <Box
            sx={{
              p: 1.5,
              borderRadius: '12px',
              border: '1px solid',
              borderColor:
                activeSelectedZone.zoneType === 'NO_FLY_ZONE'
                  ? isDark
                    ? 'rgba(239, 68, 68, 0.35)'
                    : '#fecaca'
                  : isDark
                    ? 'rgba(245, 158, 11, 0.35)'
                    : '#fde68a',
              bgcolor:
                activeSelectedZone.zoneType === 'NO_FLY_ZONE'
                  ? isDark
                    ? 'rgba(239, 68, 68, 0.12)'
                    : '#fef2f2'
                  : isDark
                    ? 'rgba(245, 158, 11, 0.12)'
                    : '#fffbeb',
            }}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
            >
              <Box>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
                  <Chip
                    size="small"
                    color={activeSelectedZone.zoneType === 'NO_FLY_ZONE' ? 'error' : 'warning'}
                    label={
                      activeSelectedZone.zoneType === 'NO_FLY_ZONE'
                        ? 'CẤM BAY (NO-FLY)'
                        : `HẠN CHẾ BAY (Trần <= ${activeSelectedZone.maxAltitudeMetersAgl}m AGL)`
                    }
                    sx={{ fontWeight: 700, height: 22, fontSize: '0.7rem' }}
                  />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {activeSelectedZone.name}
                  </Typography>
                </Stack>
                <Typography variant="caption" sx={{ color: 'text.primary', display: 'block' }}>
                  {activeSelectedZone.description}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
                  <strong>Cơ quan quản lý:</strong> {activeSelectedZone.authority} ·{' '}
                  <strong>Căn cứ:</strong> {activeSelectedZone.legalBasis} ·{' '}
                  <strong>Bán kính:</strong> {(activeSelectedZone.radiusMeters / 1000).toFixed(1)}{' '}
                  km
                  {activeSelectedZone.distanceMeters != null
                    ? ` · Khoảng cách tới tâm: ${(activeSelectedZone.distanceMeters / 1000).toFixed(2)} km`
                    : ''}
                </Typography>
              </Box>
            </Stack>
          </Box>
        )}
      </Stack>
    </Paper>
  );
}
