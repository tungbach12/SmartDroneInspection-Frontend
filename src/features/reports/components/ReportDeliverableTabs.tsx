import { useState, type ReactNode } from 'react';
import { Box, Chip, Paper, Stack, Tab, Tabs, Typography } from '@mui/material';
import FlightTakeoffRounded from '@mui/icons-material/FlightTakeoffRounded';
import PictureAsPdfRounded from '@mui/icons-material/PictureAsPdfRounded';
import type {
  EvidenceItem,
  FieldSession,
  Finding,
  InspectionReport,
  ReinspectionVerificationItem,
} from '@/features/inspections/api/inspectionApi';
import { ReportAuthoringPanel } from './ReportAuthoringPanel';
import { FlightOperationsReportView } from './FlightOperationsReportView';
import { useLocale } from '@/shared/i18n/LocaleProvider';

export interface ReportDeliverableTabsProps {
  inspectionId: string;
  versions?: InspectionReport[] | undefined;
  openVersion: InspectionReport;
  onSelectVersion?: ((versionId: string) => void) | undefined;
  findings: Finding[];
  evidenceList: EvidenceItem[];
  fieldSessions?: FieldSession[] | undefined;
  reinspectionVerifications?: ReinspectionVerificationItem[] | undefined;
  canEdit?: boolean;
  assetName?: string | null | undefined;
  droneSummary?: string | null | undefined;
  flightPermitFileName?: string | null | undefined;
  headerBadge?: ReactNode | undefined;
}

export function ReportDeliverableTabs({
  inspectionId,
  versions,
  openVersion,
  onSelectVersion,
  findings,
  evidenceList,
  fieldSessions,
  reinspectionVerifications,
  canEdit = false,
  assetName,
  droneSummary,
  flightPermitFileName,
  headerBadge,
}: ReportDeliverableTabsProps) {
  const { t } = useLocale();
  const [activeDocTab, setActiveDocTab] = useState<'inspection' | 'flight'>('inspection');

  return (
    <Stack spacing={3}>
      {versions && versions.length > 1 && onSelectVersion && (
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: '16px',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              {t('Versions:')}
            </Typography>
            {versions.map((version) => {
              const isSelected = openVersion.id === version.id;
              return (
                <Chip
                  key={version.id}
                  label={`v${version.versionNo} · ${version.status}`}
                  variant={isSelected ? 'filled' : 'outlined'}
                  color={isSelected ? 'primary' : 'default'}
                  onClick={() => onSelectVersion(version.id)}
                  sx={{
                    cursor: 'pointer',
                    fontWeight: 600,
                    borderRadius: '8px',
                  }}
                />
              );
            })}
          </Stack>
        </Paper>
      )}

      <Box>
        <Paper
          variant="outlined"
          sx={{
            px: 2,
            pt: 1,
            borderRadius: '12px 12px 0 0',
            borderBottom: 0,
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Tabs
            value={activeDocTab}
            onChange={(_, val: 'inspection' | 'flight') => setActiveDocTab(val)}
          >
            <Tab
              value="inspection"
              icon={<PictureAsPdfRounded fontSize="small" />}
              iconPosition="start"
              label={t('Findings report')}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            />
            <Tab
              value="flight"
              icon={<FlightTakeoffRounded fontSize="small" />}
              iconPosition="start"
              label={t('Flight operations')}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            />
          </Tabs>
        </Paper>

        <Box sx={{ '& > .MuiPaper-root': { borderTopLeftRadius: 0, borderTopRightRadius: 0 } }}>
          {activeDocTab === 'inspection' ? (
            <ReportAuthoringPanel
              version={openVersion}
              findings={findings}
              evidenceList={evidenceList}
              fieldSessions={fieldSessions}
              reinspectionVerifications={reinspectionVerifications}
              inspectionId={inspectionId}
              canEdit={canEdit}
              droneSummary={droneSummary}
              flightPermitFileName={flightPermitFileName}
              headerBadge={headerBadge}
            />
          ) : (
            <FlightOperationsReportView
              inspectionId={inspectionId}
              fieldSessionId={openVersion.reportContext?.fieldSessions?.at(-1)?.id ?? null}
              version={openVersion}
              evidenceList={evidenceList}
              assetName={openVersion.reportContext?.assetName ?? assetName}
              droneSummary={droneSummary}
              flightPermitFileName={flightPermitFileName}
            />
          )}
        </Box>
      </Box>
    </Stack>
  );
}
