import { useState } from 'react';
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
  Stack,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import type { Asset } from '@/features/assets/api/assetApi';
import { documentApi, type AssetDocument } from '@/features/assets/api/documentApi';
import { buildGoogleMapsExternalUrl } from '@/features/assets/components/AssetLocationPickerModal';
import { useAssetDocuments } from '@/features/assets/hooks/useAssetDocuments';
import { useCategories } from '@/features/assets/hooks/useCatalog';
import { evaluateAirspace } from '@/shared/airspace/airspaceZones';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { formatLocationLabel } from '@/shared/ui/formatLocation';

interface AssetOverviewDialogProps {
  open: boolean;
  onClose: () => void;
  assetId: string;
  asset?: Asset | undefined;
  fallbackName?: string;
  fallbackCode?: string | null;
  fallbackLocation?: string | null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AssetOverviewDialogBody({
  assetId,
  asset,
  fallbackName,
  fallbackCode,
  fallbackLocation,
}: Omit<AssetOverviewDialogProps, 'open' | 'onClose'>) {
  const { locale, t, formatDate } = useLocale();
  const documentsQuery = useAssetDocuments(assetId);
  const categoriesQuery = useCategories();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState('');

  const categoryName =
    categoriesQuery.data?.find((cat) => cat.id === asset?.categoryId)?.name ?? null;
  const locationLabel = formatLocationLabel(asset?.locationText ?? fallbackLocation);
  const hasCoordinates = asset?.latitude != null && asset?.longitude != null;
  const airspace =
    hasCoordinates && asset?.latitude != null && asset?.longitude != null
      ? evaluateAirspace(asset.latitude, asset.longitude)
      : null;

  const openDocument = async (doc: AssetDocument) => {
    setDownloadingId(doc.id);
    setDownloadError('');
    try {
      const blob = await documentApi.content(assetId, doc.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = doc.fileName;
      anchor.rel = 'noopener';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch {
      setDownloadError(
        locale === 'vi' ? 'Không thể tải tài liệu của tài sản.' : 'Could not download asset document.',
      );
    } finally {
      setDownloadingId(null);
    }
  };

  const rows: Array<{ label: string; value: string }> = [
    { label: t('Asset'), value: asset?.name || fallbackName || '—' },
    { label: t('Code'), value: asset?.code || fallbackCode || '—' },
    { label: t('Category'), value: categoryName || '—' },
    { label: t('Status'), value: asset?.status || '—' },
    { label: t('Description'), value: asset?.description?.trim() || '—' },
    {
      label: t('Structure height'),
      value: asset?.structureHeightMeters != null ? `${asset.structureHeightMeters} m` : '—',
    },
    {
      label: t('Footprint area'),
      value:
        asset?.footprintAreaSquareMeters != null
          ? `${asset.footprintAreaSquareMeters.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US')} m²`
          : '—',
    },
    {
      label: t('Created at'),
      value: asset?.createdAt ? formatDate(new Date(asset.createdAt)) : '—',
    },
  ];

  const documents = documentsQuery.data ?? [];

  return (
    <Stack spacing={2.25}>
      <Box
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        <Table size="small" sx={{ tableLayout: { xs: 'fixed', sm: 'auto' } }}>
          <TableBody>
            {rows.map((row, idx) => {
              const isLast = idx === rows.length - 1;
              return (
                <TableRow key={row.label}>
                  <TableCell
                    sx={{
                      width: { xs: '42%', sm: 190 },
                      fontWeight: 600,
                      color: 'text.secondary',
                      verticalAlign: 'top',
                      borderBottom: isLast ? 0 : undefined,
                    }}
                  >
                    {row.label}
                  </TableCell>
                  <TableCell
                    sx={{
                      borderBottom: isLast ? 0 : undefined,
                      whiteSpace: 'pre-wrap',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {row.value}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>

      <Box
        sx={{
          p: 1.75,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '8px',
          bgcolor: 'background.default',
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 1 }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {t('Location & Airspace')}
          </Typography>
          {hasCoordinates && asset?.latitude != null && asset?.longitude != null && (
            <Button
              component="a"
              href={buildGoogleMapsExternalUrl(asset.latitude, asset.longitude)}
              target="_blank"
              rel="noopener noreferrer"
              size="small"
              variant="outlined"
              endIcon={<OpenInNewRoundedIcon sx={{ fontSize: 14 }} />}
              sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, alignSelf: 'flex-start' }}
            >
              {t('Open in Google Maps')}
            </Button>
          )}
        </Stack>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {locationLabel}
        </Typography>
        {hasCoordinates && asset?.latitude != null && asset?.longitude != null && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mt: 0.25, fontVariantNumeric: 'tabular-nums' }}
          >
            {asset.latitude.toFixed(6)}, {asset.longitude.toFixed(6)}
          </Typography>
        )}
        {airspace && (
          <Stack spacing={0.75} sx={{ mt: 1.25 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Chip
                size="small"
                color={
                  airspace.classification === 'NO_FLY_ZONE'
                    ? 'error'
                    : airspace.classification === 'RESTRICTED_ZONE'
                      ? 'warning'
                      : 'success'
                }
                label={airspace.classification}
                sx={{ borderRadius: '6px', fontWeight: 700 }}
              />
              {airspace.matchingZones.map((zone) => (
                <Chip
                  key={zone.code}
                  size="small"
                  variant="outlined"
                  label={zone.name}
                  sx={{ borderRadius: '6px' }}
                />
              ))}
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {airspace.advisoryMessage}
            </Typography>
          </Stack>
        )}
      </Box>

      <Box
        sx={{
          p: 1.75,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '8px',
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          {t('Asset documents')} ({documents.length})
        </Typography>
        {downloadError && (
          <Alert severity="error" sx={{ mb: 1, borderRadius: '8px' }}>
            {downloadError}
          </Alert>
        )}
        {documentsQuery.isPending ? (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', py: 1 }}>
            <CircularProgress size={16} />
            <Typography variant="caption" color="text.secondary">
              {t('Loading documents…')}
            </Typography>
          </Stack>
        ) : documentsQuery.isError ? (
          <Typography variant="body2" color="text.secondary">
            {t('Unable to load asset documents.')}
          </Typography>
        ) : documents.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t('No documents attached to this asset.')}
          </Typography>
        ) : (
          <Stack spacing={1}>
            {documents.map((doc) => (
              <Stack
                key={doc.id}
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                sx={{
                  p: 1.25,
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.default',
                  justifyContent: 'space-between',
                  alignItems: { sm: 'center' },
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                    {doc.fileName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {doc.documentType} · {formatFileSize(doc.sizeBytes)}
                    {doc.documentDate ? ` · ${doc.documentDate}` : ''}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={downloadingId === doc.id}
                  startIcon={<DownloadRoundedIcon fontSize="small" />}
                  onClick={() => void openDocument(doc)}
                  sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, flexShrink: 0 }}
                >
                  {downloadingId === doc.id ? t('Downloading…') : t('Download')}
                </Button>
              </Stack>
            ))}
          </Stack>
        )}
      </Box>
    </Stack>
  );
}

export function AssetOverviewDialog({
  open,
  onClose,
  assetId,
  asset,
  fallbackName,
  fallbackCode,
  fallbackLocation,
}: AssetOverviewDialogProps) {
  const { t } = useLocale();
  const titleName = asset?.name || fallbackName || t('Asset details');
  const code = asset?.code || fallbackCode;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      aria-labelledby="asset-overview-dialog-title"
      slotProps={{
        paper: {
          sx: {
            borderRadius: '10px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      <DialogTitle
        id="asset-overview-dialog-title"
        sx={{
          px: { xs: 2, sm: 3 },
          py: 1.75,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {titleName}
              </Typography>
              {code && (
                <Chip
                  size="small"
                  label={code}
                  variant="outlined"
                  sx={{ borderRadius: '6px', fontWeight: 600 }}
                />
              )}
              {asset?.status && (
                <Chip
                  size="small"
                  label={asset.status}
                  variant="outlined"
                  sx={{ borderRadius: '6px', fontWeight: 600 }}
                />
              )}
            </Stack>
          </Box>
          <IconButton aria-label={t('Close')} onClick={onClose} size="small">
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers sx={{ px: { xs: 2, sm: 3 }, py: 2, bgcolor: 'background.paper' }}>
        {open && (
          <AssetOverviewDialogBody
            assetId={assetId}
            asset={asset}
            {...(fallbackName !== undefined ? { fallbackName } : {})}
            {...(fallbackCode !== undefined ? { fallbackCode } : {})}
            {...(fallbackLocation !== undefined ? { fallbackLocation } : {})}
          />
        )}
      </DialogContent>
      <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', fontWeight: 600 }}>
          {t('Close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
