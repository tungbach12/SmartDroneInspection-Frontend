import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded';
import HelpOutlineRounded from '@mui/icons-material/HelpOutlineRounded';
import SaveRounded from '@mui/icons-material/SaveRounded';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { inspectionApi } from '../api/inspectionApi';
import type {
  EvidenceItem,
  ReinspectionVerificationItem,
  UpdateDefectVerificationPayload,
} from '../api/inspectionApi';

interface ReinspectionVerificationSectionProps {
  inspectionId: string;
  sourceInspectionId?: string | null | undefined;
  items: ReinspectionVerificationItem[];
  evidenceList: EvidenceItem[];
  onUpdate: (
    verificationId: string,
    payload: UpdateDefectVerificationPayload,
  ) => Promise<unknown>;
  readOnly?: boolean;
}

export function ReinspectionVerificationSection({
  inspectionId,
  sourceInspectionId,
  items,
  evidenceList,
  onUpdate,
  readOnly = false,
}: ReinspectionVerificationSectionProps) {
  const { t } = useLocale();

  if (items.length === 0) {
    return null;
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 3 },
        mb: 4,
        borderRadius: '16px',
        border: '1px solid',
        borderColor: 'secondary.main',
        bgcolor: 'background.paper',
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1 }}>
        <Chip
          label={t('Re-inspection')}
          color="secondary"
          size="small"
          sx={{ fontWeight: 700, fontSize: '0.75rem' }}
        />
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
          {t('Target defect verifications')}
        </Typography>
      </Stack>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        {t(
          'Verify repaired defects from the prior inspection against fresh evidence captured during this flight session.',
        )}
      </Typography>

      <Stack spacing={2.5}>
        {items.map((item) => (
          <DefectVerificationCard
            key={item.id}
            item={item}
            inspectionId={inspectionId}
            sourceInspectionId={sourceInspectionId}
            evidenceList={evidenceList}
            onUpdate={onUpdate}
            readOnly={readOnly}
          />
        ))}
      </Stack>
    </Paper>
  );
}

function DefectVerificationCard({
  item,
  inspectionId,
  sourceInspectionId,
  evidenceList,
  onUpdate,
  readOnly,
}: {
  item: ReinspectionVerificationItem;
  inspectionId: string;
  sourceInspectionId?: string | null | undefined;
  evidenceList: EvidenceItem[];
  onUpdate: (
    verificationId: string,
    payload: UpdateDefectVerificationPayload,
  ) => Promise<unknown>;
  readOnly?: boolean | undefined;
}) {
  const { t } = useLocale();
  const [status, setStatus] = useState<
    'RESOLVED' | 'UNRESOLVED' | 'INCONCLUSIVE'
  >(item.resolutionStatus);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string>(
    item.newEvidenceId ?? '',
  );
  const [notes, setNotes] = useState<string>(item.inspectorNotes ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(item.id, {
        resolutionStatus: status,
        newEvidenceId: selectedEvidenceId ? selectedEvidenceId : null,
        inspectorNotes: notes,
      });
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'RESOLVED':
        return 'success';
      case 'UNRESOLVED':
        return 'error';
      case 'INCONCLUSIVE':
      default:
        return 'warning';
    }
  };

  const getStatusIcon = (s: string) => {
    switch (s) {
      case 'RESOLVED':
        return <CheckCircleRounded fontSize="small" />;
      case 'UNRESOLVED':
        return <ErrorOutlineRounded fontSize="small" />;
      case 'INCONCLUSIVE':
      default:
        return <HelpOutlineRounded fontSize="small" />;
    }
  };

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: '12px',
        borderColor: 'divider',
        bgcolor: 'background.default',
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Stack
          direction="row"
          spacing={1.5}
          sx={{
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            {item.sourceSeverity && (
              <Chip
                label={item.sourceSeverity}
                size="small"
                color={
                  item.sourceSeverity === 'CRITICAL' || item.sourceSeverity === 'HIGH'
                    ? 'error'
                    : 'warning'
                }
                variant="outlined"
                sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700 }}
              />
            )}
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {item.sourceFindingCode ? `${item.sourceFindingCode} · ` : ''}
              {item.sourceDefectLabel ?? t('Target Defect')}
            </Typography>
          </Stack>

          <Chip
            icon={getStatusIcon(item.resolutionStatus)}
            label={t(item.resolutionStatus)}
            color={getStatusColor(item.resolutionStatus)}
            size="small"
            sx={{ fontWeight: 700 }}
          />
        </Stack>

        {item.sourceTechnicalNotes && (
          <Typography
            variant="body2"
            sx={{ color: 'text.secondary', mb: 2, fontStyle: 'italic' }}
          >
            {item.sourceTechnicalNotes}
          </Typography>
        )}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 2,
            mb: 2,
          }}
        >
          {/* Original Before Photo */}
          <Box
            sx={{
              p: 1.5,
              borderRadius: '8px',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 1 }}
            >
              {t('Original Defect Photo')}
            </Typography>
            {item.sourceEvidenceId ? (
              <AuthenticatedImage
                src={inspectionApi.evidenceContentUrl(
                  sourceInspectionId ?? inspectionId,
                  item.sourceEvidenceId,
                )}
                alt="Original Defect"
                maxHeight={220}
                sx={{ width: '100%', borderRadius: '6px', objectFit: 'contain' }}
              />
            ) : (
              <Box
                sx={{
                  height: 140,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'action.hover',
                  borderRadius: '6px',
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {t('No original photo linked')}
                </Typography>
              </Box>
            )}
          </Box>

          {/* New Re-inspection Evidence Photo */}
          <Box
            sx={{
              p: 1.5,
              borderRadius: '8px',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 1 }}
            >
              {t('Post-Maintenance Re-inspection Capture')}
            </Typography>
            {selectedEvidenceId ? (
              <AuthenticatedImage
                src={inspectionApi.evidenceContentUrl(
                  inspectionId,
                  selectedEvidenceId,
                )}
                alt="Post-maintenance capture"
                maxHeight={220}
                sx={{ width: '100%', borderRadius: '6px', objectFit: 'contain' }}
              />
            ) : (
              <Box
                sx={{
                  height: 140,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'action.hover',
                  borderRadius: '6px',
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {t('Select an evidence capture below')}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        {!readOnly && (
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                select
                size="small"
                label={t('Verification resolution')}
                value={status}
                onChange={(e) =>
                  setStatus(
                    e.target.value as 'RESOLVED' | 'UNRESOLVED' | 'INCONCLUSIVE',
                  )
                }
                sx={{ minWidth: 200 }}
              >
                <MenuItem value="RESOLVED">{t('RESOLVED')}</MenuItem>
                <MenuItem value="UNRESOLVED">{t('UNRESOLVED')}</MenuItem>
                <MenuItem value="INCONCLUSIVE">{t('INCONCLUSIVE')}</MenuItem>
              </TextField>

              <TextField
                select
                size="small"
                label={t('Link re-inspection photo')}
                value={selectedEvidenceId}
                onChange={(e) => setSelectedEvidenceId(e.target.value)}
                sx={{ flex: 1 }}
              >
                <MenuItem value="">
                  <em>{t('None')}</em>
                </MenuItem>
                {evidenceList.map((ev) => (
                  <MenuItem key={ev.id} value={ev.id}>
                    {ev.fileName}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <TextField
              size="small"
              fullWidth
              multiline
              rows={2}
              label={t('Inspector field verification notes')}
              placeholder={t('Describe observed condition after repair...')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                size="small"
                startIcon={<SaveRounded />}
                disabled={saving}
                onClick={handleSave}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                {saving ? t('Saving...') : t('Save verification')}
              </Button>
            </Box>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
