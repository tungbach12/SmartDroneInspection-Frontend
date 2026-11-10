import { useEffect, useRef, useState, type MouseEvent, type WheelEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
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
import { useLocale } from '@/shared/i18n/LocaleProvider';

export interface AssetLocationPickerModalProps {
  open: boolean;
  onClose: () => void;
  initialLatitude?: number | null | undefined;
  initialLongitude?: number | null | undefined;
  assetName?: string | undefined;
  onApplyCoordinates: (latitude: number, longitude: number, placeName?: string) => void;
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
  assetName,
  onApplyCoordinates,
}: AssetLocationPickerModalProps) {
  const { t } = useLocale();

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

  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [placeLabel, setPlaceLabel] = useState<string>('');

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
      setGpsMessage(null);
    }
  }, [open, initialLatitude, initialLongitude]);

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
    setGpsMessage(null);
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsMessage(t('Trình duyệt không hỗ trợ lấy GPS.'));
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lon = Number(pos.coords.longitude.toFixed(6));
        setPinLat(lat);
        setPinLon(lon);
        setCenterLat(lat);
        setCenterLon(lon);
        setZoom(17);
        setGpsMessage(`✓ Đã ghim vị trí GPS thiết bị của bạn: ${lat}°N, ${lon}°E`);
      },
      () => {
        setGpsLoading(false);
        setGpsMessage(t('Không thể lấy GPS (vui lòng cho phép quyền truy cập vị trí).'));
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

  // Search location via OpenStreetMap Nominatim
  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setSearchLoading(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query.includes('Việt Nam') || query.includes('Vietnam') ? query : `${query}, Việt Nam`,
      )}&limit=1`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'vi,en' } });
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const item = data[0];
        const newLat = Number(Number(item.lat).toFixed(6));
        const newLon = Number(Number(item.lon).toFixed(6));
        setPinLat(newLat);
        setPinLon(newLon);
        setCenterLat(newLat);
        setCenterLon(newLon);
        setZoom(17);
        setPlaceLabel(item.display_name?.split(',')?.[0] || query);
        setGpsMessage(`✓ Đã tìm thấy: ${item.display_name?.slice(0, 80)}…`);
      } else {
        setGpsMessage(t('Không tìm thấy địa điểm này. Vui lòng thử từ khóa khác.'));
      }
    } catch {
      setGpsMessage(t('Không thể tra cứu địa điểm lúc này.'));
    } finally {
      setSearchLoading(false);
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

  const handleConfirm = () => {
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
              {t('Chọn tọa độ công trình trên bản đồ')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {assetName ? `${assetName} — ` : ''}
              {t('Nhấp chuột hoặc kéo thả bản đồ để di chuyển kim ghim đúng vị trí cần kiểm tra / sửa chữa.')}
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
            <TextField
              size="small"
              fullWidth
              placeholder={t('Tìm kiếm địa chỉ, tên cầu, công trình (VD: Cầu Ba Son, Cầu Cần Thơ...)')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRounded sx={{ fontSize: 18, color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                  endAdornment: searchLoading && <CircularProgress size={16} />,
                },
              }}
            />
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

          {gpsMessage && (
            <Alert
              severity={gpsMessage.startsWith('✓') ? 'success' : 'info'}
              sx={{ py: 0.25, px: 1.5, fontSize: '0.875rem', borderRadius: '8px' }}
              onClose={() => setGpsMessage(null)}
            >
              {gpsMessage}
            </Alert>
          )}

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
            {/* OpenStreetMap Tiles */}
            {tiles.map((tile) => (
              <img
                key={`${zoom}-${tile.x}-${tile.y}`}
                src={`https://mt1.google.com/vt/lyrs=m&hl=vi&x=${tile.x}&y=${tile.y}&z=${zoom}`}
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
              {/* Badge Label above pin */}
              <Box
                sx={{
                  bgcolor: '#1e293b',
                  color: '#ffffff',
                  px: 1,
                  py: 0.35,
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  mb: 0.5,
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              >
                📍 {t('Điểm cần kiểm tra / sửa')}
              </Box>

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

            {/* MAP CONTROLS (+ / - ZOOM AND RE-CENTER) */}
            <Stack
              spacing={0.5}
              sx={{
                position: 'absolute',
                right: 12,
                top: 12,
                zIndex: 30,
              }}
            >
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

            {/* INSTRUCTION TIP BAR */}
            <Box
              sx={{
                position: 'absolute',
                bottom: 8,
                left: 10,
                bgcolor: 'rgba(15, 23, 42, 0.82)',
                color: '#f8fafc',
                px: 1.25,
                py: 0.5,
                borderRadius: '8px',
                fontSize: '0.75rem',
                pointerEvents: 'none',
                zIndex: 30,
                backdropFilter: 'blur(4px)',
              }}
            >
              💡 {t('Nhấp chuột bất kỳ đâu trên bản đồ để cắm kim định vị chính xác')}
            </Box>

            <Box
              sx={{
                position: 'absolute',
                bottom: 4,
                right: 6,
                fontSize: '0.75rem',
                color: 'rgba(0,0,0,0.6)',
                bgcolor: 'rgba(255,255,255,0.7)',
                px: 0.5,
                borderRadius: '5px',
                pointerEvents: 'none',
              }}
            >
              © OpenStreetMap contributors
            </Box>
          </Box>

          {/* CURRENT PIN COORDINATE SUMMARY BOX */}
          <Paper
            variant="outlined"
            sx={{
              p: 1.5,
              borderRadius: '10px',
              bgcolor: 'background.default',
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', sm: 'center' },
              gap: 1,
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                {t('Tọa độ kim ghim đã chọn:')}
              </Typography>
              <Typography sx={{ fontWeight: 700, fontFamily: 'monospace', color: 'text.primary', fontSize: '0.875rem' }}>
                Vĩ độ (Lat): <strong>{pinLat.toFixed(6)}°N</strong> · Kinh độ (Lon): <strong>{pinLon.toFixed(6)}°E</strong>
              </Typography>
            </Box>
            <Button
              variant="contained"
              size="medium"
              startIcon={<CheckRounded />}
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
              {t('Xác nhận tọa độ này')}
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
