import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Alert,
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
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded';
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded';
import HelpOutlineRounded from '@mui/icons-material/HelpOutlineRounded';
import SaveRounded from '@mui/icons-material/SaveRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import CloudUploadOutlined from '@mui/icons-material/CloudUploadOutlined';
import FmdGoodOutlined from '@mui/icons-material/FmdGoodOutlined';
import FlightTakeoffRounded from '@mui/icons-material/FlightTakeoffRounded';
import CompareArrowsRounded from '@mui/icons-material/CompareArrowsRounded';
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  if (items.length === 0) {
    return null;
  }

  const resolvedCount = items.filter((it) => it.resolutionStatus === 'RESOLVED').length;
  const unresolvedCount = items.filter((it) => it.resolutionStatus === 'UNRESOLVED').length;
  const allResolved = resolvedCount === items.length;
  const allEvaluated =
    items.length > 0 &&
    items.every((it) =>
      it.resolutionStatus === 'RESOLVED'
        ? Boolean(it.newEvidenceId)
        : Boolean(it.newEvidenceId || it.inspectorNotes?.trim()),
    );

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 2.5 },
        mb: 3,
        borderRadius: '12px',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{
          alignItems: { sm: 'center' },
          justifyContent: 'space-between',
          pb: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          mb: 2.5,
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '10px',
              bgcolor: 'action.selected',
              color: 'text.primary',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <CompareArrowsRounded sx={{ fontSize: 24 }} />
          </Box>
          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.2 }}>
                {t('Before / After Defect Verification')}
              </Typography>
              <Chip
                label={t('Before ↔ After')}
                size="small"
                variant="outlined"
                sx={{ fontWeight: 650, fontSize: '0.75rem', height: 20 }}
              />
            </Stack>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25, fontSize: '0.875rem' }}>
              {t('Compare original defect captures against fresh re-inspection drone imagery to verify resolution status.')}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Chip
            icon={<CheckCircleOutlineRounded fontSize="small" />}
            label={`${resolvedCount}/${items.length} ${t('RESOLVED')}`}
            variant="outlined"
            size="small"
            sx={{ fontWeight: 600, fontSize: '0.75rem' }}
          />
          {unresolvedCount > 0 && (
            <Chip
              icon={<ErrorOutlineRounded fontSize="small" />}
              label={`${unresolvedCount} ${t('UNRESOLVED')}`}
              variant="outlined"
              size="small"
              sx={{ fontWeight: 600, fontSize: '0.75rem' }}
            />
          )}
        </Stack>
      </Stack>

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

      <Paper
        variant="outlined"
        sx={{
          mt: 3,
          p: { xs: 2, sm: 2.25 },
          borderRadius: '12px',
          bgcolor: 'action.hover',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box sx={{ maxWidth: 650 }}>
          <Typography variant="body2" sx={{ fontWeight: 650, color: 'text.primary' }}>
            {allResolved
              ? t('All target defects verified as resolved')
              : t('Target defect evaluation in progress')}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
            {allEvaluated
              ? t('All target defects evaluated. You can proceed to author and submit the re-inspection report.')
              : t('Target defect verification pending. Record fresh evidence or verification notes for each item before submitting.')}
          </Typography>
        </Box>

        <Button
          variant="contained"
          endIcon={<ArrowForwardRounded />}
          disabled={!readOnly && !allEvaluated}
          onClick={async () => {
            if (!readOnly && (evidenceList.length > 0 || allEvaluated)) {
              try {
                await inspectionApi.confirmFindings(inspectionId, true);
                await queryClient.invalidateQueries({ queryKey: ['inspections', inspectionId] });
              } catch {
                // Already confirmed or handled on report page
              }
            }
            navigate('../report');
          }}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: '8px',
            px: 2.25,
            py: 0.75,
            boxShadow: 'none',
          }}
        >
          {t('Proceed to Verification Report')}
        </Button>
      </Paper>
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
  const [status, setStatus] = useState<'RESOLVED' | 'UNRESOLVED' | 'INCONCLUSIVE'>(
    item.resolutionStatus,
  );
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string>(
    item.newEvidenceId ?? '',
  );
  const [notes, setNotes] = useState<string>(item.inspectorNotes ?? '');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaveError(null);
    if (status === 'RESOLVED' && !selectedEvidenceId) {
      setSaveError(t('A fresh re-inspection evidence capture is required to mark a defect as RESOLVED.'));
      return;
    }
    if (status !== 'RESOLVED' && !selectedEvidenceId && !notes.trim()) {
      setSaveError(t('Attach a fresh capture or enter field verification notes before saving.'));
      return;
    }
    setSaving(true);
    try {
      await onUpdate(item.id, {
        resolutionStatus: status,
        newEvidenceId: selectedEvidenceId ? selectedEvidenceId : null,
        inspectorNotes: notes,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch {
      setSaveError(t('Could not save verification assessment.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDirectUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const uploaded = await inspectionApi.uploadEvidence(inspectionId, file);
      setSelectedEvidenceId(uploaded.id);
      await onUpdate(item.id, {
        resolutionStatus: status,
        newEvidenceId: uploaded.id,
        inspectorNotes: notes,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch {
      setUploadError(t('Could not upload evidence photo.'));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const getStatusIcon = (s: string) => {
    switch (s) {
      case 'RESOLVED':
        return <CheckCircleOutlineRounded fontSize="small" />;
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
        bgcolor: 'background.paper',
        boxShadow: 'none',
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.25 } }}>
        <Stack
          direction="row"
          spacing={1.5}
          sx={{
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
            flexWrap: 'wrap',
            gap: 1,
            pb: 1.25,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            {item.sourceSeverity && (
              <Chip
                label={item.sourceSeverity}
                size="small"
                variant="outlined"
                sx={{ height: 22, fontSize: '0.75rem', fontWeight: 600 }}
              />
            )}
            <Typography variant="body1" sx={{ fontWeight: 700, color: 'text.primary' }}>
              {item.sourceFindingCode ? `${item.sourceFindingCode} · ` : ''}
              {item.sourceDefectLabel ?? t('Target Defect')}
            </Typography>
          </Stack>

          <Chip
            icon={getStatusIcon(item.resolutionStatus)}
            label={t(item.resolutionStatus)}
            variant="outlined"
            size="small"
            sx={{ fontWeight: 650, height: 24, fontSize: '0.75rem' }}
          />
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 2,
            mb: 2,
          }}
        >
          {/* Left: Before (Prior Defect) */}
          <Box
            sx={{
              p: 1.75,
              borderRadius: '10px',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'action.hover',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 1 }}>
                {t('1. Prior Defect (Before)')}
              </Typography>
              {item.sourceEvidenceId ? (
                <AuthenticatedImage
                  src={inspectionApi.evidenceContentUrl(
                    sourceInspectionId ?? inspectionId,
                    item.sourceEvidenceId,
                  )}
                  alt="Original Defect"
                  maxHeight={180}
                  sx={{
                    width: '100%',
                    borderRadius: '8px',
                    objectFit: 'contain',
                    bgcolor: '#000000',
                  }}
                />
              ) : (
                <Box
                  sx={{
                    height: 140,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'background.paper',
                    borderRadius: '8px',
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {t('No photo')}
                  </Typography>
                </Box>
              )}
            </Box>

            <Box sx={{ mt: 1.5 }}>
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'text.secondary', mb: 0.5 }}>
                <FmdGoodOutlined sx={{ fontSize: 14 }} />
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  {item.sourceLocationDescription || t('Asset location')}
                </Typography>
              </Stack>

              {item.sourceTechnicalNotes && (
                <Box
                  sx={{
                    p: 1,
                    bgcolor: 'background.paper',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 650, color: 'text.secondary', display: 'block' }}>
                    {t('Original Technical Notes')}:
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.primary', fontSize: '0.78rem', mt: 0.25 }}>
                    {item.sourceTechnicalNotes}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>

          {/* Right: After (Drone Re-capture) */}
          <Box
            sx={{
              p: 1.75,
              borderRadius: '10px',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'action.hover',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block' }}>
                  {t('2. Drone Re-capture (After)')}
                </Typography>
                <Chip
                  icon={<FlightTakeoffRounded sx={{ fontSize: 13 }} />}
                  label={t('Re-inspection')}
                  size="small"
                  variant="outlined"
                  sx={{ height: 22, fontSize: '0.75rem' }}
                />
              </Stack>

              {selectedEvidenceId ? (
                <AuthenticatedImage
                  src={inspectionApi.evidenceContentUrl(
                    inspectionId,
                    selectedEvidenceId,
                  )}
                  alt="Re-inspection capture"
                  maxHeight={180}
                  sx={{
                    width: '100%',
                    borderRadius: '8px',
                    objectFit: 'contain',
                    bgcolor: '#000000',
                  }}
                />
              ) : (
                <Box
                  sx={{
                    height: 140,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'background.paper',
                    borderRadius: '8px',
                    p: 2,
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {t('Awaiting drone re-inspection photo')}
                  </Typography>
                </Box>
              )}
            </Box>

            {!readOnly && (
              <Stack spacing={1} sx={{ mt: 1.5 }}>
                {uploadError && (
                  <Alert severity="error" sx={{ py: 0.25, fontSize: '0.75rem', borderRadius: '8px' }}>
                    {uploadError}
                  </Alert>
                )}

                <Button
                  component="label"
                  size="small"
                  variant="outlined"
                  startIcon={<CloudUploadOutlined />}
                  disabled={uploading}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    bgcolor: 'background.paper',
                  }}
                >
                  {uploading ? t('Uploading...') : t('Upload drone photo')}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleDirectUpload}
                  />
                </Button>

                <TextField
                  select
                  size="small"
                  label={t('Or select existing capture')}
                  value={selectedEvidenceId}
                  onChange={(e) => setSelectedEvidenceId(e.target.value)}
                  slotProps={{ input: { sx: { borderRadius: '8px', fontSize: '0.82rem', bgcolor: 'background.paper' } } }}
                >
                  <MenuItem value="">
                    <em>{t('None')}</em>
                  </MenuItem>
                  {evidenceList.map((ev) => (
                    <MenuItem key={ev.id} value={ev.id} sx={{ fontSize: '0.82rem' }}>
                      {ev.fileName}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
            )}
          </Box>
        </Box>

        {!readOnly && (
          <Stack spacing={1.5} sx={{ mt: 1, p: 1.75, bgcolor: 'background.default', borderRadius: '8px', border: '1px solid', borderColor: 'divider' }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: 'center' }}>
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
                sx={{ minWidth: 220 }}
                slotProps={{ input: { sx: { borderRadius: '8px' } } }}
              >
                <MenuItem value="RESOLVED">
                  {t('RESOLVED')} ({t('Defect successfully fixed')})
                </MenuItem>
                <MenuItem value="UNRESOLVED">
                  {t('UNRESOLVED')} ({t('Remediation incomplete or failed')})
                </MenuItem>
                <MenuItem value="INCONCLUSIVE">
                  {t('INCONCLUSIVE')} ({t('Unable to verify from image')})
                </MenuItem>
              </TextField>

              <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                {status === 'RESOLVED'
                  ? t('Marking as resolved confirms the defect has been remediated.')
                  : status === 'UNRESOLVED'
                    ? t('Unresolved defects remain open and may require further remediation or another re-inspection.')
                    : t('Inconclusive items may require supplementary inspection.')}
              </Typography>
            </Stack>

            <TextField
              size="small"
              fullWidth
              multiline
              rows={2}
              label={t('Inspector field verification notes')}
              placeholder={t('e.g. Surface repaired cleanly with no remaining fissures visible...')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              slotProps={{ input: { sx: { borderRadius: '8px' } } }}
            />

            {saveError && (
              <Alert severity="error" sx={{ py: 0.25, borderRadius: '8px', fontSize: '0.82rem' }}>
                {saveError}
              </Alert>
            )}

            {savedSuccess && (
              <Alert severity="success" sx={{ py: 0.25, borderRadius: '8px', fontSize: '0.82rem' }}>
                {t('Verification assessment saved successfully!')}
              </Alert>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                size="small"
                startIcon={<SaveRounded />}
                disabled={saving}
                onClick={handleSave}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: '8px',
                  px: 2,
                  py: 0.75,
                  boxShadow: 'none',
                }}
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
