import { type MouseEvent, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
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

interface VideoFrameCropDialogProps {
  open: boolean;
  frameDataUrl: string | null;
  naturalWidth: number;
  naturalHeight: number;
  timestampSeconds: number;
  sourceVideoName: string;
  saving: boolean;
  onClose: () => void;
  onSaveCroppedFile: (file: File, locationDescription: string) => Promise<void>;
}

function formatTimeTag(sec: number): string {
  const mins = Math.floor(sec / 60);
  const secs = Math.floor(sec % 60);
  return `${String(mins).padStart(2, '0')}m${String(secs).padStart(2, '0')}s`;
}

export function VideoFrameCropDialog({
  open,
  frameDataUrl,
  naturalWidth,
  naturalHeight,
  timestampSeconds,
  sourceVideoName,
  saving,
  onClose,
  onSaveCroppedFile,
}: VideoFrameCropDialogProps) {
  const { t } = useLocale();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [crop, setCrop] = useState<CropRect>({ x: 0.08, y: 0.08, width: 0.84, height: 0.84 });
  const [fileName, setFileName] = useState('');
  const [locationNote, setLocationNote] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const tag = formatTimeTag(timestampSeconds);
      setCrop({ x: 0.08, y: 0.08, width: 0.84, height: 0.84 });
      setFileName(`video_crop_${tag}_${Date.now() % 10000}.jpg`);
      setLocationNote(
        `Trích xuất & cắt từ video ${sourceVideoName} tại ${tag}`,
      );
      setErrorMsg(null);
    }
  }, [open, timestampSeconds, sourceVideoName]);

  const toRelativeCoords = (event: MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
    const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    return { x, y };
  };

  const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    const pt = toRelativeCoords(event);
    setDragStart(pt);
    setCrop({ x: pt.x, y: pt.y, width: 0.02, height: 0.02 });
  };

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (!dragStart) return;
    const pt = toRelativeCoords(event);
    const x = Math.min(dragStart.x, pt.x);
    const y = Math.min(dragStart.y, pt.y);
    const width = Math.max(0.05, Math.abs(pt.x - dragStart.x));
    const height = Math.max(0.05, Math.abs(pt.y - dragStart.y));
    setCrop({
      x: Math.min(x, 0.95),
      y: Math.min(y, 0.95),
      width: Math.min(width, 1 - x),
      height: Math.min(height, 1 - y),
    });
  };

  const handleMouseUp = () => {
    setDragStart(null);
  };

  const pixelW = Math.max(1, Math.round(crop.width * (naturalWidth || 960)));
  const pixelH = Math.max(1, Math.round(crop.height * (naturalHeight || 720)));

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
      const srcW = img.naturalWidth || naturalWidth || 960;
      const srcH = img.naturalHeight || naturalHeight || 720;
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

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        ✂️ {t('Capture & Crop Video Frame to Evidence')}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
          >
            <Typography variant="body2" color="text.secondary">
              {t('Drag on the video frame below to select the defect area to crop, or keep full frame.')}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Chip
                size="small"
                color="primary"
                variant="outlined"
                label={`${pixelW} × ${pixelH} px @ ${formatTimeTag(timestampSeconds)}`}
              />
              <Button
                size="small"
                variant="outlined"
                startIcon={<RestartAltRounded fontSize="small" />}
                onClick={() => setCrop({ x: 0, y: 0, width: 1, height: 1 })}
                sx={{ textTransform: 'none' }}
              >
                {t('Full Frame')}
              </Button>
            </Stack>
          </Stack>

          {frameDataUrl && (
            <Box
              ref={containerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              sx={{
                position: 'relative',
                width: '100%',
                maxWidth: 760,
                mx: 'auto',
                cursor: 'crosshair',
                userSelect: 'none',
                borderRadius: 1.5,
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'divider',
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
                  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.52)',
                  pointerEvents: 'none',
                }}
              />
            </Box>
          )}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              size="small"
              label={t('Evidence file name')}
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
               sx={{ flex: 1 }}
            />
            <TextField
              size="small"
              label={t('Location / Defect note')}
              value={locationNote}
              onChange={(e) => setLocationNote(e.target.value)}
              sx={{ flex: 1.5 }}
            />
          </Stack>

          {errorMsg && <Alert severity="error">{errorMsg}</Alert>}
        </Stack>
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
