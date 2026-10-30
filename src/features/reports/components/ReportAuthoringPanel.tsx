import { useState, useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
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
import CloseIcon from '@mui/icons-material/Close';
import DownloadRounded from '@mui/icons-material/DownloadRounded';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import PictureAsPdfRounded from '@mui/icons-material/PictureAsPdfRounded';
import SaveRounded from '@mui/icons-material/SaveRounded';
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
import {
  EMPTY_SECTION_VALUES,
  ReportSectionField,
  sectionValuesFrom,
  type ReportSectionValues,
} from './ReportSectionForm';

export interface ReportAuthoringPanelProps {
  version: InspectionReport;
  findings: Finding[];
  evidenceList: EvidenceItem[];
  inspectionId: string;
  canEdit: boolean;
  onSaveSections: (sections: ReportSectionValues) => Promise<unknown>;
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
  canEdit,
  onSaveSections,
  reinspectionVerifications,
}: ReportAuthoringPanelProps) {
  const { t } = useLocale();
  const [sections, setSections] = useState<ReportSectionValues>(() =>
    sectionValuesFrom(version),
  );
  const [saved, setSaved] = useState<ReportSectionValues>(() =>
    sectionValuesFrom(version),
  );
  const [saving, setSaving] = useState(false);
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

  const hasChanges =
    JSON.stringify(sections) !== JSON.stringify(saved) ||
    JSON.stringify(sectionValuesFrom(version)) !== JSON.stringify(saved);

  const change = <K extends keyof ReportSectionValues>(
    field: K,
    value: ReportSectionValues[K],
  ) => setSections((previous) => ({ ...previous, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSaveSections(sections);
      setSaved(sections);
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'The report sections could not be saved.'));
    } finally {
      setSaving(false);
    }
  };

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
      <Stack direction="row" spacing={1.5} sx={{ mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <Box sx={{ flex: 1, minWidth: 240 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary' }}>
            {t('Report sections')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>
            Sections marked with the author are yours to write. The rest are read from the reviewed
            records.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          {canEdit && (
            <Button
              size="small"
              variant="contained"
              startIcon={<SaveRounded />}
              onClick={handleSave}
              disabled={saving || !hasChanges}
              sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
            >
              {saving ? 'Saving…' : 'Save sections'}
            </Button>
          )}
          {canPreview && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<PictureAsPdfRounded />}
              onClick={handlePreview}
              disabled={previewing}
              sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
            >
              {previewing ? 'Rendering…' : 'Preview PDF'}
            </Button>
          )}
          <Tooltip title={!canDownload ? 'Available once the report is published' : ''}>
            <span>
              <Button
                size="small"
                variant="outlined"
                startIcon={<DownloadRounded />}
                onClick={handleDownload}
                disabled={!canDownload || downloading}
                sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
              >
                {downloading ? 'Downloading…' : 'Download report'}
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
        executiveSummary={
          <ReportSectionField
            section="executiveSummary"
            sections={sections}
            onChange={change}
            disabled={!canEdit}
          />
        }
        limitations={
          <ReportSectionField
            section="omissionDisclosure"
            sections={sections}
            onChange={change}
            disabled={!canEdit}
          />
        }
        conclusions={
          <ReportSectionField
            section="conclusionsRecommendations"
            sections={sections}
            onChange={change}
            disabled={!canEdit}
          />
        }
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
            alignItems: 'center',
            justifyContent: 'space-between',
            pb: 1.5,
            borderBottom: '1px solid #eaecf0',
            bgcolor: '#ffffff',
          }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '8px',
                bgcolor: '#f0f4ff',
                color: '#3538cd',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PictureAsPdfRounded fontSize="small" />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#101828' }}>
                {t('Report PDF Preview')}
              </Typography>
              <Typography variant="caption" sx={{ color: '#667085' }}>
                {reportRef}
              </Typography>
            </Box>
            <Chip
              label={version.status}
              size="small"
              sx={{
                fontWeight: 600,
                fontSize: '0.75rem',
                bgcolor: isPublished ? '#ecfdf3' : '#f8f9fc',
                color: isPublished ? '#027a48' : '#344054',
              }}
            />
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
            {previewBlob && (
              <Button
                size="small"
                variant="contained"
                startIcon={<DownloadRounded />}
                onClick={() => {
                  const fileName = isPublished ? `${reportRef}.pdf` : `${reportRef}-draft.pdf`;
                  triggerDownload(previewBlob, fileName);
                }}
                sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
              >
                {t('Download PDF')}
              </Button>
            )}
            <IconButton onClick={handleClosePreview} size="small" aria-label={t('Close preview')}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ p: 0, bgcolor: '#f8fafc', height: '75vh', overflow: 'hidden' }}>
          {previewUrl ? (
            <Box
              component="iframe"
              src={previewUrl}
              title={t('Report PDF Preview')}
              sx={{
                width: '100%',
                height: '100%',
                border: 'none',
                display: 'block',
              }}
            />
          ) : (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#667085',
              }}
            >
              <Typography>{t('Loading preview…')}</Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 1.5, borderTop: '1px solid #eaecf0', bgcolor: '#ffffff' }}>
          <Typography variant="caption" sx={{ color: '#667085', flex: 1 }}>
            {isPublished
              ? 'This is the official published deliverable.'
              : 'Preview is rendered from the current report sections and reviewed findings.'}
          </Typography>
          <Button
            onClick={handleClosePreview}
            variant="outlined"
            size="small"
            sx={{ borderRadius: '8px', textTransform: 'none' }}
          >
            {t('Close')}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

export { EMPTY_SECTION_VALUES };