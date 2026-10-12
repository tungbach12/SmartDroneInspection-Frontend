import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import DownloadRounded from '@mui/icons-material/DownloadRounded';
import PictureAsPdfRounded from '@mui/icons-material/PictureAsPdfRounded';
import SaveRounded from '@mui/icons-material/SaveRounded';
import type {
  EvidenceItem,
  InspectionReportVersion,
  VerifiedFinding,
} from '@/features/inspections/api/inspectionApi';
import { inspectionApi } from '@/features/inspections/api/inspectionApi';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { ReportDerivedSections } from './ReportDerivedSections';
import {
  EMPTY_SECTION_VALUES,
  ReportSectionForm,
  sectionValuesFrom,
  type ReportSectionValues,
} from './ReportSectionForm';

export interface ReportAuthoringPanelProps {
  version: InspectionReportVersion;
  findings: VerifiedFinding[];
  evidenceList: EvidenceItem[];
  inspectionId: string;
  canEdit: boolean;
  onSaveSections: (sections: ReportSectionValues) => Promise<unknown>;
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
}: ReportAuthoringPanelProps) {
  const [sections, setSections] = useState<ReportSectionValues>(() =>
    sectionValuesFrom(version),
  );
  const [saved, setSaved] = useState<ReportSectionValues>(() =>
    sectionValuesFrom(version),
  );
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handlePreview = async () => {
    setPreviewing(true);
    setError(null);
    try {
      const blob = await inspectionApi.previewReport(inspectionId, version.id);
      triggerDownload(blob, `SDI-RPT-${version.id.slice(0, 8).toUpperCase()}-V${version.versionNo}-preview.pdf`);
    } catch (previewError) {
      setError(getErrorMessage(previewError, 'The report preview could not be produced.'));
    } finally {
      setPreviewing(false);
    }
  };

  const handleDownload = async () => {
    setError(null);
    try {
      const blob = await inspectionApi.downloadReport(inspectionId, version.id);
      triggerDownload(blob, `SDI-RPT-${version.id.slice(0, 8).toUpperCase()}-V${version.versionNo}.pdf`);
    } catch (downloadError) {
      setError(getErrorMessage(downloadError, 'The report document could not be downloaded.'));
    }
  };

  return (
    <Paper
      variant="outlined"
      sx={{ p: { xs: 2, sm: 3 }, borderRadius: '16px', border: '1px solid #eaecf0', bgcolor: '#ffffff' }}
    >
      <Stack direction="row" spacing={1.5} sx={{ mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <Box sx={{ flex: 1, minWidth: 240 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#101828' }}>
            Report sections
          </Typography>
          <Typography variant="body2" sx={{ color: '#667085', fontSize: '0.8125rem' }}>
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
          {canEdit && (
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
          <Button
            size="small"
            variant="outlined"
            startIcon={<DownloadRounded />}
            onClick={handleDownload}
            disabled={version.status !== 'PUBLISHED'}
            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
          >
            Download report
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>
          {error}
        </Alert>
      )}

      <ReportSectionForm
        sections={sections}
        onChange={change}
        disabled={!canEdit}
        saving={saving}
        hasChanges={hasChanges}
      />

      <Box sx={{ borderTop: '1px solid #eaecf0', pt: 3, mt: 1 }}>
        <ReportDerivedSections
          version={version}
          findings={findings}
          evidenceList={evidenceList}
          inspectionId={inspectionId}
        />
      </Box>
    </Paper>
  );
}

export { EMPTY_SECTION_VALUES };