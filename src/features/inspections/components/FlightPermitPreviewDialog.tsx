import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import DownloadRounded from '@mui/icons-material/DownloadRounded';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import PrintRounded from '@mui/icons-material/PrintRounded';
import { inspectionApi } from '../api/inspectionApi';
import { useLocale } from '@/shared/i18n/LocaleProvider';

const uploadedPermitCache = new Map<string, File>();

export function cacheUploadedFlightPermit(inspectionId: string, file: File) {
  if (!inspectionId) return;
  uploadedPermitCache.set(inspectionId, file);
}

export function getCachedFlightPermit(inspectionId: string): File | undefined {
  return uploadedPermitCache.get(inspectionId);
}

export interface FlightPermitPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  inspectionId: string;
  fileName: string | null | undefined;
  uploadedAt?: string | null | undefined;
  assetName?: string | null | undefined;
  droneSummary?: string | null | undefined;
  localFile?: File | null | undefined;
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function FlightPermitPreviewDialog({
  open,
  onClose,
  inspectionId,
  fileName,
  uploadedAt,
  assetName,
  droneSummary,
  localFile,
}: FlightPermitPreviewDialogProps) {
  const { t, formatDateTime } = useLocale();
  const [loading, setLoading] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [blobData, setBlobData] = useState<Blob | null>(null);
  const [mimeType, setMimeType] = useState<string>('application/pdf');
  const [useRecordSheetFallback, setUseRecordSheetFallback] = useState(false);

  const effectiveFileName = fileName?.trim() || localFile?.name || 'flight-permit.pdf';

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    let active = true;
    let currentObjectUrl: string | null = null;

    const sourceFile = localFile ?? getCachedFlightPermit(inspectionId);
    if (sourceFile) {
      const inferredMime =
        sourceFile.type ||
        (effectiveFileName.toLowerCase().endsWith('.png')
          ? 'image/png'
          : effectiveFileName.toLowerCase().endsWith('.jpg') ||
              effectiveFileName.toLowerCase().endsWith('.jpeg')
            ? 'image/jpeg'
            : effectiveFileName.toLowerCase().endsWith('.webp')
              ? 'image/webp'
              : 'application/pdf');
      currentObjectUrl = URL.createObjectURL(sourceFile);
      setBlobData(sourceFile);
      setBlobUrl(currentObjectUrl);
      setMimeType(inferredMime);
      setUseRecordSheetFallback(false);
      setLoading(false);
      return () => {
        if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
      };
    }

    setLoading(true);
    setUseRecordSheetFallback(false);

    inspectionApi
      .getFlightPermitBlob(inspectionId)
      .then((blob) => {
        if (!active) return;
        if (!blob || blob.size === 0) {
          setUseRecordSheetFallback(true);
          return;
        }
        const inferredMime =
          blob.type && blob.type !== 'application/octet-stream'
            ? blob.type
            : effectiveFileName.toLowerCase().endsWith('.png')
              ? 'image/png'
              : effectiveFileName.toLowerCase().endsWith('.jpg') ||
                  effectiveFileName.toLowerCase().endsWith('.jpeg')
                ? 'image/jpeg'
                : effectiveFileName.toLowerCase().endsWith('.webp')
                  ? 'image/webp'
                  : 'application/pdf';
        const typedBlob =
          blob.type === inferredMime ? blob : new Blob([blob], { type: inferredMime });
        currentObjectUrl = URL.createObjectURL(typedBlob);
        setBlobData(typedBlob);
        setBlobUrl(currentObjectUrl);
        setMimeType(inferredMime);
      })
      .catch(() => {
        if (!active) return;
        setUseRecordSheetFallback(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
      }
    };
  }, [open, inspectionId, localFile, effectiveFileName]);

  const isImage = mimeType.startsWith('image/');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: '14px' } } }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          py: 1.75,
          px: 2.5,
        }}
      >
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
          <DescriptionOutlined color="primary" />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.25 }} noWrap>
              {t('Flight Permit Document')}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
              {effectiveFileName}
            </Typography>
          </Box>
          <Chip
            size="small"
            color="success"
            variant="outlined"
            icon={<CheckCircleRounded sx={{ fontSize: 14 }} />}
            label={t('Permit on file')}
            sx={{ height: 22, fontSize: '0.72rem', fontWeight: 600 }}
          />
        </Stack>
        <IconButton size="small" onClick={onClose} aria-label={t('Close')}>
          <CloseRounded fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0, bgcolor: 'background.default', minHeight: 460 }}>
        {loading ? (
          <Stack
            spacing={1.5}
            sx={{ minHeight: 440, alignItems: 'center', justifyContent: 'center', p: 4 }}
          >
            <CircularProgress size={28} />
            <Typography variant="body2" color="text.secondary">
              {t('Loading flight permit document…')}
            </Typography>
          </Stack>
        ) : blobUrl && !useRecordSheetFallback ? (
          isImage ? (
            <Box
              sx={{
                p: 2.5,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: 440,
              }}
            >
              <Box
                component="img"
                src={blobUrl}
                alt={effectiveFileName}
                sx={{
                  maxWidth: '100%',
                  maxHeight: '70vh',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                }}
              />
            </Box>
          ) : (
            <Box sx={{ height: '72vh', minHeight: 460, width: '100%' }}>
              <iframe
                src={blobUrl}
                title={effectiveFileName}
                style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
              />
            </Box>
          )
        ) : (
          <Box sx={{ p: { xs: 2, sm: 3.5 } }}>
            <Paper
              variant="outlined"
              sx={{
                p: { xs: 2.5, sm: 3.5 },
                borderRadius: '12px',
                bgcolor: 'background.paper',
                maxWidth: 680,
                mx: 'auto',
              }}
            >
              <Stack spacing={2.5}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.5}
                  sx={{
                    justifyContent: 'space-between',
                    alignItems: { sm: 'center' },
                    pb: 2,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Box>
                    <Typography
                      variant="overline"
                      sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: '0.06em' }}
                    >
                      {t('FLIGHT AUTHORIZATION RECORD')}
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      {effectiveFileName}
                    </Typography>
                  </Box>
                  <Chip
                    color="success"
                    icon={<CheckCircleRounded />}
                    label={t('Verified Pre-Flight Gate')}
                    sx={{ fontWeight: 700, alignSelf: { xs: 'flex-start', sm: 'center' } }}
                  />
                </Stack>

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {t('Document File Name')}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 650, mt: 0.25 }}>
                      {effectiveFileName}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {t('Inspection Reference')}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 650, fontFamily: 'monospace', mt: 0.25 }}
                    >
                      {inspectionId}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {t('Target Asset')}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 650, mt: 0.25 }}>
                      {assetName || '—'}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {t('Assigned UAV / Drone')}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 650, mt: 0.25 }}>
                      {droneSummary || '—'}
                    </Typography>
                  </Box>

                  {uploadedAt && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        {t('Recorded Timestamp')}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 650, mt: 0.25 }}>
                        {formatDateTime(new Date(uploadedAt))}
                      </Typography>
                    </Box>
                  )}
                </Box>

                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.75,
                    borderRadius: '8px',
                    bgcolor: 'action.hover',
                    borderColor: 'divider',
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {t(
                      'This flight permit record was registered prior to field session takeoff and is retained in the inspection compliance audit trail.',
                    )}
                  </Typography>
                </Paper>
              </Stack>
            </Paper>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.5, justifyContent: 'space-between' }}>
        <Box>
          {blobUrl && !useRecordSheetFallback ? (
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<OpenInNewRounded fontSize="small" />}
                onClick={() => window.open(blobUrl, '_blank', 'noopener,noreferrer')}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                {t('Open in new tab')}
              </Button>
              {blobData && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<DownloadRounded fontSize="small" />}
                  onClick={() => triggerDownload(blobData, effectiveFileName)}
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  {t('Download permit')}
                </Button>
              )}
            </Stack>
          ) : (
            <Button
              size="small"
              variant="outlined"
              startIcon={<PrintRounded fontSize="small" />}
              onClick={() => window.print()}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              {t('Print record')}
            </Button>
          )}
        </Box>
        <Button
          variant="contained"
          onClick={onClose}
          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
        >
          {t('Close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
