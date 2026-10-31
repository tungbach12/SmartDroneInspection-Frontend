import { useState, useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
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
import CloseIcon from '@mui/icons-material/Close';
import DownloadRounded from '@mui/icons-material/DownloadRounded';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import PictureAsPdfRounded from '@mui/icons-material/PictureAsPdfRounded';
import type {
  EvidenceItem,
  InspectionReport,
  Finding,
  ReinspectionVerificationItem,
} from '@/features/inspections/api/inspectionApi';
import { inspectionApi } from '@/features/inspections/api/inspectionApi';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { ReportDerivedSections } from './ReportDerivedSections';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import type { ReportSectionValues } from './ReportSectionForm';

export interface ReportAuthoringPanelProps {
  version: InspectionReport;
  findings: Finding[];
  evidenceList: EvidenceItem[];
  inspectionId: string;
  canEdit?: boolean;
  onSaveSections?: ((sections: ReportSectionValues) => Promise<unknown>) | undefined;
  onDirtyChange?: ((dirty: boolean) => void) | undefined;
  reinspectionVerifications?: ReinspectionVerificationItem[] | undefined;
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

export function ReportAuthoringPanel({
  version,
  findings,
  evidenceList,
  inspectionId,
  canEdit = false,
  reinspectionVerifications,
}: ReportAuthoringPanelProps) {
  const { t } = useLocale();
  const [previewing, setPreviewing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const isPublished = version.status === 'PUBLISHED';

  const canPreview = canEdit || isPublished;
  const canDownload = canEdit || isPublished;

  const handlePreview = async () => {
    setPreviewing(true);
    setError(null);
    try {
      const blob = await (isPublished
        ? inspectionApi.downloadReport(inspectionId, version.id)
        : inspectionApi.previewReport(inspectionId, version.id));

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      const url = URL.createObjectURL(blob);
      setPreviewBlob(blob);
      setPreviewUrl(url);
      setPreviewOpen(true);
    } catch (previewError) {
      setError(getErrorMessage(previewError, 'The report preview could not be produced.'));
    } finally {
      setPreviewing(false);
    }
  };

  const handleClosePreview = () => {
    setPreviewOpen(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setPreviewBlob(null);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);
    try {
      const blob = await (isPublished
        ? inspectionApi.downloadReport(inspectionId, version.id)
        : inspectionApi.previewReport(inspectionId, version.id));

      const fileName = isPublished
        ? `SDI-RPT-${version.id.slice(0, 8).toUpperCase()}-V${version.versionNo}.pdf`
        : `SDI-RPT-${version.id.slice(0, 8).toUpperCase()}-V${version.versionNo}-draft.pdf`;

      triggerDownload(blob, fileName);
    } catch (downloadError) {
      setError(getErrorMessage(downloadError, 'The report document could not be downloaded.'));
    } finally {
      setDownloading(false);
    }
  };

  const reportRef = `SDI-RPT-${version.id.slice(0, 8).toUpperCase()}-V${version.versionNo}`;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: '16px',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2, flexWrap: 'wrap', alignItems: { xs: 'stretch', md: 'center' } }}>
        <Box sx={{ flex: 1, minWidth: 240 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary' }}>
            {t('Report details')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>
            {t('Report generated automatically from confirmed findings, evidence, and flight records.')}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          {canPreview && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<PictureAsPdfRounded />}
              onClick={handlePreview}
              disabled={previewing}
              sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
            >
              {previewing ? t('Rendering…') : t('Preview PDF')}
            </Button>
          )}
          <Tooltip title={!canDownload ? t('Available once the report is published') : ''}>
            <span>
              <Button
                size="small"
                variant="outlined"
                startIcon={<DownloadRounded />}
                onClick={handleDownload}
                disabled={!canDownload || downloading}
                sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
              >
                {downloading ? t('Downloading…') : t('Download report')}
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>
          {error}
        </Alert>
      )}

      <ReportDerivedSections
        version={version}
        findings={findings}
        evidenceList={evidenceList}
        inspectionId={inspectionId}
        reinspectionVerifications={reinspectionVerifications}
      />

      {/* PDF Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={handleClosePreview}
        maxWidth="lg"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '16px',
              overflow: 'hidden',
              maxHeight: '92vh',
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <PictureAsPdfRounded sx={{ color: 'primary.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.05rem' }}>
              {isPublished ? t('Published Report PDF') : t('Draft Report Preview')}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              {reportRef}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            {previewUrl && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<OpenInNewRounded />}
                onClick={() => window.open(previewUrl, '_blank')}
                sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
              >
                {t('Open in new tab')}
              </Button>
            )}
            <IconButton onClick={handleClosePreview} size="small" aria-label="close">
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: 0, bgcolor: 'background.default' }}>
          {previewUrl ? (
            <iframe
              src={previewUrl}
              title={reportRef}
              width="100%"
              height="750px"
              style={{ border: 'none', display: 'block' }}
            />
          ) : (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">{t('No PDF preview available.')}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={handleClosePreview} sx={{ borderRadius: '8px', textTransform: 'none' }}>
            {t('Close')}
          </Button>
          {previewBlob && (
            <Button
              variant="contained"
              startIcon={<DownloadRounded />}
              onClick={() => {
                const fileName = isPublished
                  ? `${reportRef}.pdf`
                  : `${reportRef}-draft.pdf`;
                triggerDownload(previewBlob, fileName);
              }}
              sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
            >
              {t('Download PDF')}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
