import { type MouseEvent, useRef, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import CropFreeRounded from '@mui/icons-material/CropFreeRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import { AuthenticatedMedia } from '@/shared/ui/AuthenticatedMedia';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { type BoundingBoxCoords, serializeBoundingBox } from '../utils/boundingBox';

type DragMode = 'new' | 'move' | 'nw' | 'ne' | 'sw' | 'se';

interface DragSession {
  mode: DragMode;
  startX: number;
  startY: number;
  originBox: BoundingBoxCoords;
}

interface BoundingBoxEditorDialogProps {
  open: boolean;
  imageSrc: string;
  imageAlt: string;
  initialBox: BoundingBoxCoords | null;
  defectLabel?: string | undefined;
  onClose: () => void;
  onApply: (boxJson: string | null) => void;
}

const MIN_BOX_SPAN = 0.03;

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

export function BoundingBoxEditorDialog({
  open,
  imageSrc,
  imageAlt,
  initialBox,
  defectLabel,
  onClose,
  onApply,
}: BoundingBoxEditorDialogProps) {
  const { t } = useLocale();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState<BoundingBoxCoords | null>(initialBox);
  const [dragSession, setDragSession] = useState<DragSession | null>(null);

  const toRelative = (event: MouseEvent<HTMLDivElement>) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
    return {
      x: clamp((event.clientX - rect.left) / rect.width, 0, 1),
      y: clamp((event.clientY - rect.top) / rect.height, 0, 1),
    };
  };

  const startHandleDrag = (mode: DragMode) => (event: MouseEvent<HTMLDivElement>) => {
    if (!box) return;
    event.stopPropagation();
    const pt = toRelative(event);
    setDragSession({ mode, startX: pt.x, startY: pt.y, originBox: box });
  };

  const handleStageMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    const pt = toRelative(event);
    if (
      box &&
      pt.x >= box.xMin &&
      pt.x <= box.xMax &&
      pt.y >= box.yMin &&
      pt.y <= box.yMax
    ) {
      setDragSession({ mode: 'move', startX: pt.x, startY: pt.y, originBox: box });
      return;
    }
    const initialNew: BoundingBoxCoords = {
      xMin: clamp(pt.x, 0, 1 - MIN_BOX_SPAN),
      yMin: clamp(pt.y, 0, 1 - MIN_BOX_SPAN),
      xMax: clamp(pt.x + MIN_BOX_SPAN, MIN_BOX_SPAN, 1),
      yMax: clamp(pt.y + MIN_BOX_SPAN, MIN_BOX_SPAN, 1),
    };
    setDragSession({ mode: 'new', startX: pt.x, startY: pt.y, originBox: initialNew });
    setBox(initialNew);
  };

  const handleStageMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (!dragSession) return;
    const pt = toRelative(event);
    const o = dragSession.originBox;
    const dx = pt.x - dragSession.startX;
    const dy = pt.y - dragSession.startY;

    if (dragSession.mode === 'move') {
      const w = o.xMax - o.xMin;
      const h = o.yMax - o.yMin;
      const nextXMin = clamp(o.xMin + dx, 0, 1 - w);
      const nextYMin = clamp(o.yMin + dy, 0, 1 - h);
      setBox({ xMin: nextXMin, yMin: nextYMin, xMax: nextXMin + w, yMax: nextYMin + h });
      return;
    }

    if (dragSession.mode === 'new') {
      const rawXMin = Math.min(dragSession.startX, pt.x);
      const rawYMin = Math.min(dragSession.startY, pt.y);
      const rawXMax = Math.max(dragSession.startX, pt.x);
      const rawYMax = Math.max(dragSession.startY, pt.y);
      const xMin = clamp(rawXMin, 0, 1 - MIN_BOX_SPAN);
      const yMin = clamp(rawYMin, 0, 1 - MIN_BOX_SPAN);
      const xMax = clamp(Math.max(rawXMax, xMin + MIN_BOX_SPAN), MIN_BOX_SPAN, 1);
      const yMax = clamp(Math.max(rawYMax, yMin + MIN_BOX_SPAN), MIN_BOX_SPAN, 1);
      setBox({ xMin, yMin, xMax, yMax });
      return;
    }

    let xMin = o.xMin;
    let yMin = o.yMin;
    let xMax = o.xMax;
    let yMax = o.yMax;

    if (dragSession.mode === 'nw' || dragSession.mode === 'sw') {
      xMin = clamp(o.xMin + dx, 0, xMax - MIN_BOX_SPAN);
    }
    if (dragSession.mode === 'ne' || dragSession.mode === 'se') {
      xMax = clamp(o.xMax + dx, xMin + MIN_BOX_SPAN, 1);
    }
    if (dragSession.mode === 'nw' || dragSession.mode === 'ne') {
      yMin = clamp(o.yMin + dy, 0, yMax - MIN_BOX_SPAN);
    }
    if (dragSession.mode === 'sw' || dragSession.mode === 'se') {
      yMax = clamp(o.yMax + dy, yMin + MIN_BOX_SPAN, 1);
    }
    setBox({ xMin, yMin, xMax, yMax });
  };

  const handleStageMouseUp = () => {
    setDragSession(null);
  };

  const widthPct = box ? Math.round((box.xMax - box.xMin) * 100) : 0;
  const heightPct = box ? Math.round((box.yMax - box.yMin) * 100) : 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
        {t('Mark defect region on photo')}
        {defectLabel ? ` — ${defectLabel}` : ''}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}
          >
            <Typography variant="body2" color="text.secondary">
              {t('Drag on the photo to draw, move, or resize the defect bounding box.')}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
              {box ? (
                <Chip
                  size="small"
                  color="primary"
                  variant="outlined"
                  label={`${widthPct}% × ${heightPct}%`}
                />
              ) : (
                <Chip size="small" variant="outlined" label={t('No region box')} />
              )}
              <Button
                size="small"
                variant="outlined"
                startIcon={<CropFreeRounded fontSize="small" />}
                onClick={() => setBox({ xMin: 0.25, yMin: 0.25, xMax: 0.75, yMax: 0.75 })}
                sx={{ textTransform: 'none' }}
              >
                {t('Center 50%')}
              </Button>
              {box && (
                <Button
                  size="small"
                  color="error"
                  variant="text"
                  startIcon={<DeleteOutlineRounded fontSize="small" />}
                  onClick={() => setBox(null)}
                  sx={{ textTransform: 'none' }}
                >
                  {t('Clear region')}
                </Button>
              )}
            </Stack>
          </Stack>

          <Box
            sx={{
              bgcolor: '#0b0f17',
              p: 1,
              borderRadius: 1.5,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box
              ref={stageRef}
              onMouseDown={handleStageMouseDown}
              onMouseMove={handleStageMouseMove}
              onMouseUp={handleStageMouseUp}
              onMouseLeave={handleStageMouseUp}
              sx={{
                position: 'relative',
                width: '100%',
                maxWidth: 720,
                mx: 'auto',
                cursor: dragSession?.mode === 'move' ? 'grabbing' : 'crosshair',
                userSelect: 'none',
                lineHeight: 0,
                borderRadius: 1,
                overflow: 'hidden',
              }}
            >
              <AuthenticatedMedia
                src={imageSrc}
                alt={imageAlt}
                contentType="image/jpeg"
                maxHeight={520}
                sx={{ width: '100%', borderRadius: 0, pointerEvents: 'none' }}
              />
              {box && (
                <Box
                  sx={{
                    position: 'absolute',
                    left: `${box.xMin * 100}%`,
                    top: `${box.yMin * 100}%`,
                    width: `${(box.xMax - box.xMin) * 100}%`,
                    height: `${(box.yMax - box.yMin) * 100}%`,
                    border: '2px solid #ef4444',
                    bgcolor: 'rgba(239, 68, 68, 0.12)',
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
                        bgcolor: '#ef4444',
                        border: '1.5px solid #ffffff',
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
              )}
            </Box>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>{t('Cancel')}</Button>
        <Button
          variant="contained"
          onClick={() => onApply(box ? serializeBoundingBox(box) : null)}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          {t('Apply region')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
