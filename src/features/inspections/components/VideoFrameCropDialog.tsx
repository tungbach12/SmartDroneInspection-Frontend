import { type MouseEvent, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CropFreeRounded from '@mui/icons-material/CropFreeRounded';
import CropRounded from '@mui/icons-material/CropRounded';
import RestartAltRounded from '@mui/icons-material/RestartAltRounded';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { useLocale } from '@/shared/i18n/LocaleProvider';

interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

type DragMode = 'new' | 'move' | 'nw' | 'ne' | 'sw' | 'se';

interface DragSession {
  mode: DragMode;
  startX: number;
  startY: number;
  originCrop: CropRect;
}

interface VideoFrameCropDialogProps {
  open: boolean;
  frameDataUrl: string | null;
  naturalWidth: number;
  naturalHeight: number;
  timestampSeconds: number;
  sourceVideoName: string;
  existingFileNames?: string[] | undefined;
  saving: boolean;
  onClose: () => void;
  onSaveCroppedFile: (file: File, locationDescription: string) => Promise<void>;
}

const DEFAULT_CROP: CropRect = { x: 0.08, y: 0.08, width: 0.84, height: 0.84 };
const MIN_CROP_SIZE = 0.05;

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

function formatTimeTag(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}m${String(secs).padStart(2, '0')}s`;
}

function buildUniqueCropFileName(timestampSeconds: number, existingFileNames: string[] = []): string {
  const tag = formatTimeTag(timestampSeconds);
  const existing = new Set(existingFileNames.map((n) => n.toLowerCase()));
  const baseName = `video_crop_${tag}.jpg`;
  if (!existing.has(baseName.toLowerCase())) {
    return baseName;
  }
  let index = 2;
  while (existing.has(`video_crop_${tag}_${index}.jpg`.toLowerCase())) {
    index += 1;
  }
  return `video_crop_${tag}_${index}.jpg`;
}

export function VideoFrameCropDialog({
  open,
  frameDataUrl,
  naturalWidth,
  naturalHeight,
  timestampSeconds,
  sourceVideoName,
  existingFileNames = [],
  saving,
  onClose,
  onSaveCroppedFile,
}: VideoFrameCropDialogProps) {
  const { t } = useLocale();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dragSession, setDragSession] = useState<DragSession | null>(null);
  const [crop, setCrop] = useState<CropRect>(DEFAULT_CROP);
  const [fileName, setFileName] = useState(() =>
    buildUniqueCropFileName(timestampSeconds, existingFileNames),
  );
  const [locationNote, setLocationNote] = useState(
    () => `Extracted from video ${sourceVideoName} at ${formatTimeTag(timestampSeconds)}`,
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const toRelativeCoords = (event: MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
    return {
      x: clamp((event.clientX - rect.left) / rect.width, 0, 1),
      y: clamp((event.clientY - rect.top) / rect.height, 0, 1),
    };
  };

  const startHandleDrag = (mode: DragMode) => (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    const pt = toRelativeCoords(event);
    setDragSession({ mode, startX: pt.x, startY: pt.y, originCrop: crop });
  };

  const handleStageMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    const pt = toRelativeCoords(event);
    const insideExisting =
      pt.x >= crop.x &&
      pt.x <= crop.x + crop.width &&
      pt.y >= crop.y &&
      pt.y <= crop.y + crop.height;
    if (insideExisting) {
      setDragSession({ mode: 'move', startX: pt.x, startY: pt.y, originCrop: crop });
      return;
    }
    setDragSession({
      mode: 'new',
      startX: pt.x,
      startY: pt.y,
      originCrop: { x: pt.x, y: pt.y, width: MIN_CROP_SIZE, height: MIN_CROP_SIZE },
    });
    setCrop({
      x: clamp(pt.x, 0, 1 - MIN_CROP_SIZE),
      y: clamp(pt.y, 0, 1 - MIN_CROP_SIZE),
      width: MIN_CROP_SIZE,
      height: MIN_CROP_SIZE,
    });
  };

  const handleStageMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (!dragSession) return;
    const pt = toRelativeCoords(event);
    const dx = pt.x - dragSession.startX;
    const dy = pt.y - dragSession.startY;
    const o = dragSession.originCrop;

    if (dragSession.mode === 'move') {
      setCrop({
        x: clamp(o.x + dx, 0, 1 - o.width),
        y: clamp(o.y + dy, 0, 1 - o.height),
        width: o.width,
        height: o.height,
      });
      return;
    }

    if (dragSession.mode === 'new') {
      const x = Math.min(dragSession.startX, pt.x);
      const y = Math.min(dragSession.startY, pt.y);
      const width = Math.max(MIN_CROP_SIZE, Math.abs(pt.x - dragSession.startX));
      const height = Math.max(MIN_CROP_SIZE, Math.abs(pt.y - dragSession.startY));
      setCrop({
        x: clamp(x, 0, 1 - MIN_CROP_SIZE),
        y: clamp(y, 0, 1 - MIN_CROP_SIZE),
        width: Math.min(width, 1 - x),
        height: Math.min(height, 1 - y),
      });
      return;
    }

    let left = o.x;
    let top = o.y;
    let right = o.x + o.width;
    let bottom = o.y + o.height;

    if (dragSession.mode === 'nw' || dragSession.mode === 'sw') {
      left = clamp(o.x + dx, 0, right - MIN_CROP_SIZE);
    }
    if (dragSession.mode === 'ne' || dragSession.mode === 'se') {
      right = clamp(o.x + o.width + dx, left + MIN_CROP_SIZE, 1);
    }
    if (dragSession.mode === 'nw' || dragSession.mode === 'ne') {
      top = clamp(o.y + dy, 0, bottom - MIN_CROP_SIZE);
    }
    if (dragSession.mode === 'sw' || dragSession.mode === 'se') {
      bottom = clamp(o.y + o.height + dy, top + MIN_CROP_SIZE, 1);
    }

    setCrop({ x: left, y: top, width: right - left, height: bottom - top });
  };

  const handleStageMouseUp = () => {
    setDragSession(null);
  };

  const safeW = naturalWidth || 960;
  const safeH = naturalHeight || 720;
  const pixelW = Math.max(1, Math.round(crop.width * safeW));
  const pixelH = Math.max(1, Math.round(crop.height * safeH));

  const handleConfirmSave = async () => {
    if (!frameDataUrl) return;
    setErrorMsg(null);
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Could not decode captured video frame'));
        img.src = frameDataUrl;
      });
      const srcW = img.naturalWidth || safeW;
      const srcH = img.naturalHeight || safeH;
      const sx = Math.round(crop.x * srcW);
      const sy = Math.round(crop.y * srcH);
      const sw = Math.max(32, Math.round(crop.width * srcW));
      const sh = Math.max(32, Math.round(crop.height * srcH));

      const canvas = document.createElement('canvas');
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context unavailable');
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Failed to encode JPEG blob'))),
          'image/jpeg',
          0.95,
        );
      });

      const safeName = fileName.trim().endsWith('.jpg')
        ? fileName.trim()
        : `${fileName.trim() || 'frame_crop'}.jpg`;
      const file = new File([blob], safeName, { type: 'image/jpeg' });
      await onSaveCroppedFile(file, locationNote.trim());
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not crop frame');
    }
  };

  const safeCropW = Math.max(MIN_CROP_SIZE, crop.width);
  const safeCropH = Math.max(MIN_CROP_SIZE, crop.height);

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
        {t('Capture & Crop Video Frame to Evidence')}
      </DialogTitle>
      <DialogContent dividers>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.45fr) minmax(290px, 360px)' },
            gap: 2.5,
            alignItems: 'start',
          }}
        >
          {/* Left column: interactive crop stage + quick presets */}
          <Stack spacing={1.25}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}
            >
              <Typography variant="body2" color="text.secondary">
                {t('Drag to draw, move, or resize the crop box.')}
              </Typography>
              <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<CropFreeRounded fontSize="small" />}
                  onClick={() => setCrop({ x: 0, y: 0, width: 1, height: 1 })}
                  sx={{ textTransform: 'none' }}
                >
                  {t('Full Frame')}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setCrop({ x: 0.25, y: 0.25, width: 0.5, height: 0.5 })}
                  sx={{ textTransform: 'none' }}
                >
                  {t('Center 50%')}
                </Button>
                <Button
                  size="small"
                  variant="text"
                  startIcon={<RestartAltRounded fontSize="small" />}
                  onClick={() => setCrop(DEFAULT_CROP)}
                  sx={{ textTransform: 'none' }}
                >
                  {t('Reset')}
                </Button>
              </Stack>
            </Stack>

            {frameDataUrl && (
              <Box
                sx={{
                  bgcolor: '#0b0f17',
                  borderRadius: 1.5,
                  p: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Box
                  ref={containerRef}
                  onMouseDown={handleStageMouseDown}
                  onMouseMove={handleStageMouseMove}
                  onMouseUp={handleStageMouseUp}
                  onMouseLeave={handleStageMouseUp}
                  sx={{
                    position: 'relative',
                    width: '100%',
                    cursor: dragSession?.mode === 'move' ? 'grabbing' : 'crosshair',
                    userSelect: 'none',
                    borderRadius: 1,
                    overflow: 'hidden',
                    bgcolor: '#000',
                  }}
                >
                  <Box
                    component="img"
                    src={frameDataUrl}
                    alt="Captured video frame"
                    draggable={false}
                    sx={{ width: '100%', display: 'block', pointerEvents: 'none' }}
                  />
                  {/* Crop Selection Overlay */}
                  <Box
                    sx={{
                      position: 'absolute',
                      left: `${crop.x * 100}%`,
                      top: `${crop.y * 100}%`,
                      width: `${crop.width * 100}%`,
                      height: `${crop.height * 100}%`,
                      border: '2px solid #00e5ff',
                      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.56)',
                      cursor: 'move',
                    }}
                  >
                    {(
                      [
                        { mode: 'nw' as const, top: -5, left: -5, cursor: 'nwse-resize' },
                        { mode: 'ne' as const, top: -5, right: -5, cursor: 'nesw-resize' },
                        { mode: 'sw' as const, bottom: -5, left: -5, cursor: 'nesw-resize' },
                        { mode: 'se' as const, bottom: -5, right: -5, cursor: 'nwse-resize' },
                      ] as const
                    ).map((h) => (
                      <Box
                        key={h.mode}
                        onMouseDown={startHandleDrag(h.mode)}
                        sx={{
                          position: 'absolute',
                          width: 11,
                          height: 11,
                          bgcolor: '#00e5ff',
                          border: '1.5px solid #0b0f17',
                          borderRadius: '2px',
                          cursor: h.cursor,
                          ...('top' in h ? { top: h.top } : {}),
                          ...('bottom' in h ? { bottom: h.bottom } : {}),
                          ...('left' in h ? { left: h.left } : {}),
                          ...('right' in h ? { right: h.right } : {}),
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              </Box>
            )}
          </Stack>

          {/* Right column: live cropped preview & metadata */}
          <Stack spacing={1.75}>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '10px' }}>
              <Stack
                direction="row"
                sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  {t('Crop preview')}
                </Typography>
                <Chip
                  size="small"
                  color="primary"
                  variant="outlined"
                  label={`${pixelW} × ${pixelH} px @ ${formatTimeTag(timestampSeconds)}`}
                />
              </Stack>
              {frameDataUrl && (
                <Box
                  sx={{
                    width: '100%',
                    maxHeight: 220,
                    mx: 'auto',
                    aspectRatio: `${pixelW} / ${pixelH}`,
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: '#0b0f17',
                  }}
                >
                  <Box
                    component="img"
                    src={frameDataUrl}
                    alt={t('Crop preview')}
                    sx={{
                      position: 'absolute',
                      maxWidth: 'none',
                      width: `${100 / safeCropW}%`,
                      height: `${100 / safeCropH}%`,
                      left: `${(-crop.x / safeCropW) * 100}%`,
                      top: `${(-crop.y / safeCropH) * 100}%`,
                      pointerEvents: 'none',
                    }}
                  />
                </Box>
              )}
            </Paper>

            <TextField
              size="small"
              fullWidth
              label={t('Evidence file name')}
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
            />
            <TextField
              size="small"
              fullWidth
              multiline
              minRows={2}
              label={t('Location / Defect note')}
              value={locationNote}
              onChange={(e) => setLocationNote(e.target.value)}
            />

            {errorMsg && <Alert severity="error">{errorMsg}</Alert>}
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          {t('Cancel')}
        </Button>
        <LoadingButton
          variant="contained"
          startIcon={<CropRounded />}
          loading={saving}
          onClick={() => void handleConfirmSave()}
        >
          {t('Save cropped image to Evidence')}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
