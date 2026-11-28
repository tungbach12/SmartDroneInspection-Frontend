import { useState, type ReactNode } from 'react';
import {
  Alert,
  Button,
  Stack,
  Tooltip,
  Typography,
  Paper,
} from '@mui/material';
import DownloadRounded from '@mui/icons-material/DownloadRounded';
import type {
  EvidenceItem,
  FieldSession,
  InspectionReport,
  Finding,
  ReinspectionVerificationItem,
} from '@/features/inspections/api/inspectionApi';
import { inspectionApi } from '@/features/inspections/api/inspectionApi';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { ReportDerivedSections } from './ReportDerivedSections';
import { useLocale } from '@/shared/i18n/LocaleProvider';

export interface ReportAuthoringPanelProps {
  version: InspectionReport;
  findings: Finding[];
  evidenceList: EvidenceItem[];
  fieldSessions?: FieldSession[] | undefined;
  reinspectionVerifications?: ReinspectionVerificationItem[] | undefined;
  inspectionId: string;
  canEdit?: boolean;
  onDirtyChange?: ((dirty: boolean) => void) | undefined;
  droneSummary?: string | null | undefined;
  flightPermitFileName?: string | null | undefined;
  headerBadge?: ReactNode | undefined;
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
  fieldSessions,
  reinspectionVerifications,
  inspectionId,
  canEdit = false,
  droneSummary,
  flightPermitFileName,
  headerBadge,
}: ReportAuthoringPanelProps) {
  const { t } = useLocale();
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPublished = version.status === 'PUBLISHED';

  const canDownload = canEdit || isPublished;

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
        <Stack direction="row" spacing={1} sx={{ flex: 1, minWidth: 240, alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary' }}>
            {t('Report details')}
          </Typography>
          {headerBadge}
        </Stack>
        <Stack direction="row" spacing={1}>
          <Tooltip title={!canDownload ? t('Available once the report is published') : ''}>
            <span>
              <Button
                size="small"
                variant="outlined"
                startIcon={<DownloadRounded />}
                onClick={handleDownload}
                disabled={!canDownload || downloading}
                aria-label={!canDownload ? t('Available once the report is published') : undefined}
                sx={{ borderRadius: '8px', minHeight: 44, textTransform: 'none', fontWeight: 600 }}
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
        fieldSessions={fieldSessions}
        reinspectionVerifications={reinspectionVerifications}
        inspectionId={inspectionId}
        droneSummary={droneSummary}
        flightPermitFileName={flightPermitFileName}
        canRegenerateSummary={canEdit}
      />
    </Paper>
  );
}
