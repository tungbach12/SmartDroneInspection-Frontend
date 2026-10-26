import { useMemo, useState, type FormEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getErrorMessage } from '@/shared/api/errorMessage';
import type {
  EvidenceItem,
  Finding,
  FindingSeverity,
  ManualFindingInput,
} from '../api/inspectionApi';
import { AiMotionFigure } from '../components/AiMotionFigure';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import {
  useAnalyzeEvidence,
  useCreateManualFinding,
  useUpdateFinding,
  useDeleteFinding,
  useConfirmFindings,
  useInspectionEvidence,
  useInspectionFindings,
  useInspectionWorkflowState,
  useReopenFindings,
  useUpdateEvidenceLocation,
  useReportVersions,
  useConfirmFinding,
  useRemovedFindings,
  useRestoreFinding,
} from '../hooks/useInspections';
import { EvidenceCaptureGroup } from '../components/EvidenceCaptureGroup';

const SEVERITIES: FindingSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function InspectionFindingsPage() {
  const { t } = useLocale();
  const { inspectionId = '' } = useParams();
  const navigate = useNavigate();
  const roles = useAuthStore((state) => state.roles);
  const isInspector = roles.includes('INSPECTOR');
  const isReviewer = roles.includes('ORG_MANAGER');

  const evidence = useInspectionEvidence(inspectionId);
  const findings = useInspectionFindings(inspectionId);
  const removedFindings = useRemovedFindings(inspectionId);
  const {
    analyzeMany,
    analysingIds,
    completedIds,
    noDetectionIds,
    isPending: isAnalysisPending,
    isError: isAnalysisError,
    error: analysisError,
  } = useAnalyzeEvidence(inspectionId);
  const confirmFinding = useConfirmFinding(inspectionId);
  const restoreFinding = useRestoreFinding(inspectionId);
  const createManualFinding = useCreateManualFinding(inspectionId);
  const updateFinding = useUpdateFinding(inspectionId);
  const deleteFinding = useDeleteFinding(inspectionId);
  const workflow = useInspectionWorkflowState(inspectionId);
  const confirmFindings = useConfirmFindings(inspectionId);
  const reopenFindings = useReopenFindings(inspectionId);
  const reportVersions = useReportVersions(inspectionId);
  const updateEvidenceLocation = useUpdateEvidenceLocation(inspectionId);
  const reportVersionsList = reportVersions.data ?? [];

  const activeEvidenceItems = useMemo(
    () => (evidence.data ?? []).filter((item) => !item.isDeleted),
    [evidence.data],
  );
  const activeEvidenceIds = useMemo(
    () => new Set(activeEvidenceItems.map((item) => item.id)),
    [activeEvidenceItems],
  );
  const isReportLocked = reportVersionsList.some((version) =>
    ['SUBMITTED', 'APPROVED', 'PUBLISHED', 'SUPERSEDED'].includes(version.status),
  );

  const [severities, setSeverities] = useState<Record<string, FindingSeverity>>({});
  const [locationDrafts, setLocationDrafts] = useState<Record<string, string>>({});
  const [locationErrors, setLocationErrors] = useState<Record<string, string>>({});
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);
  const [revisedDefectLabels, setRevisedDefectLabels] = useState<Record<string, string>>({});
  const [revisedTechnicalNotes, setRevisedTechnicalNotes] = useState<Record<string, string>>({});
  const [revisedRecommendedActions, setRevisedRecommendedActions] = useState<Record<string, string>>({});
  const [manualFindingEvidenceId, setManualFindingEvidenceId] = useState<string | null>(null);
  const [noFindingsAcknowledged, setNoFindingsAcknowledged] = useState(false);
  const [showRemovedFindings, setShowRemovedFindings] = useState(false);

  const activeFindings = useMemo(
    () =>
      (findings.data ?? []).filter(
        (finding) =>
          !finding.isDeleted && finding.evidenceId && activeEvidenceIds.has(finding.evidenceId),
      ),
    [activeEvidenceIds, findings.data],
  );
  const pendingFindings = activeFindings.filter((finding) => finding.status === 'PENDING').length;
  const reviewedItemCount = activeFindings.length;
  const noFindings = activeFindings.length === 0;
  const hasActiveEvidence = activeEvidenceItems.length > 0;
  const analysisUnlocked = workflow.data?.status === 'FIELD_COMPLETED';

  const canConfirm =
    isInspector &&
    hasActiveEvidence &&
    !findings.isLoading &&
    !workflow.isLoading &&
    !findings.isError &&
    pendingFindings === 0 &&
    (!noFindings || noFindingsAcknowledged) &&
    !isAnalysisPending &&
    !confirmFinding.isPending &&
    !createManualFinding.isPending &&
    !confirmFindings.isPending &&
    !isReportLocked &&
    !['REPORT_PUBLISHED', 'REPAIR_PENDING', 'COMPLETED'].includes(workflow.data?.status ?? '');

  const analysedEvidenceIds = useMemo(
    () => new Set([...activeFindings.map((finding) => finding.evidenceId), ...completedIds]),
    [activeFindings, completedIds],
  );
  const noDetectionEvidenceIds = useMemo(() => new Set(noDetectionIds), [noDetectionIds]);
  const analysableImageIds = useMemo(
    () =>
      activeEvidenceItems
        .filter((item) => item.contentType.startsWith('image/'))
        .map((item) => item.id),
    [activeEvidenceItems],
  );
  const analysingEvidenceIds = useMemo(() => new Set(analysingIds), [analysingIds]);

  const severityFor = (finding: Finding): FindingSeverity =>
    severities[finding.id] ?? finding.severity;

  const groupedFindings = useMemo(() => {
    const groups = new Map<
      string,
      {
        evidenceId: string;
        evidence?: EvidenceItem | undefined;
        findings: Finding[];
      }
    >();
    for (const item of activeEvidenceItems) {
      groups.set(item.id, { evidenceId: item.id, evidence: item, findings: [] });
    }
    for (const finding of activeFindings) {
      if (!finding.evidenceId) continue;
      const group = groups.get(finding.evidenceId);
      if (group) group.findings.push(finding);
    }
    return [...groups.values()];
  }, [activeFindings, activeEvidenceItems]);

  const startEditingCandidate = (finding: Finding) => {
    setEditingCandidateId(finding.id);
    setRevisedDefectLabels((prev) => ({ ...prev, [finding.id]: finding.defectLabel }));
    setSeverities((prev) => ({ ...prev, [finding.id]: finding.severity }));
    setRevisedTechnicalNotes((prev) => ({
      ...prev,
      [finding.id]: finding.technicalNotes ?? '',
    }));
    setRevisedRecommendedActions((prev) => ({
      ...prev,
      [finding.id]: finding.recommendedAction ?? '',
    }));
  };

  const saveCandidateCorrection = (finding: Finding) => {
    const defectLabel = (revisedDefectLabels[finding.id] ?? finding.defectLabel).trim();
    const technicalNotes = (revisedTechnicalNotes[finding.id] ?? finding.technicalNotes ?? '').trim();
    const recommendedAction = (
      revisedRecommendedActions[finding.id] ?? finding.recommendedAction ?? ''
    ).trim();

    updateFinding.mutate(
      {
        findingId: finding.id,
        input: {
          evidenceId: finding.evidenceId ?? '',
          defectLabel,
          severity: severityFor(finding),
          technicalNotes: technicalNotes || 'Corrected by assigned Inspector',
          recommendedAction: recommendedAction || undefined,
        },
      },
      { onSuccess: () => setEditingCandidateId(null) },
    );
  };

  const submitManualFinding = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const evidenceId = String(formData.get('evidenceId') ?? '');
    if (!evidenceId) return;
    createManualFinding.mutate({
      evidenceId,
      defectLabel: String(formData.get('defectLabel') ?? '').trim(),
      severity: String(formData.get('severity') ?? 'MEDIUM') as FindingSeverity,
      technicalNotes: String(formData.get('technicalNotes') ?? '').trim(),
      recommendedAction: String(formData.get('recommendedAction') ?? '').trim(),
    });
    event.currentTarget.reset();
  };

  if (!isInspector && !isReviewer) {
    return (
      <Alert severity="info" sx={{ borderRadius: '12px' }}>
        You are viewing this inspection as a reader. Detection review and finding decisions belong
        to the assigned Inspector and a qualified reviewer.
      </Alert>
    );
  }

  if (isReviewer && !isInspector) {
    return (
      <OrganizationFindingsOverview
        findings={(findings.data ?? []).filter((finding) => !finding.isDeleted)}
        inspectionId={inspectionId}
      />
    );
  }

  return (
    <Stack spacing={3}>
      {/* Page Header / Action Bar */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 2.5 },
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          bgcolor: '#ffffff',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between' }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                bgcolor: 'rgba(13, 148, 136, 0.1)',
                color: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <AutoAwesomeOutlined sx={{ fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                {t('Defect Analysis & Findings')}
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mt: 0.25 }}>
                {t('Run AI detection per image or batch-analyze all captures. Review, adjust, and confirm defects.')}
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            {isInspector && analysisUnlocked && (
              <Button
                variant="contained"
                startIcon={isAnalysisPending ? <AiMotionFigure name="advisoryLens" size={18} /> : <AutoAwesomeOutlined />}
                disabled={isAnalysisPending || analysableImageIds.length === 0}
                onClick={() => void analyzeMany(analysableImageIds)}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: '10px',
                  boxShadow: 'none',
                  px: 2,
                  '&:hover': { boxShadow: '0 4px 12px rgba(13, 148, 136, 0.2)' },
                }}
              >
                {isAnalysisPending
                  ? t('Analyzing…')
                  : `${t('Analyze all images')} (${analysableImageIds.length})`}
              </Button>
            )}
            {isInspector && (
              <Button
                variant="outlined"
                color={showRemovedFindings ? 'primary' : 'inherit'}
                onClick={() => setShowRemovedFindings((current) => !current)}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: '10px',
                  borderColor: '#cbd5e1',
                  color: '#475569',
                  bgcolor: showRemovedFindings ? 'action.hover' : 'transparent',
                }}
              >
                {showRemovedFindings
                  ? t('Hide removed')
                  : `${t('Audit log / Removed')} (${removedFindings.data?.length ?? 0})`}
              </Button>
            )}
          </Stack>
        </Stack>

        {isInspector && isAnalysisPending && (
          <Alert severity="info" sx={{ mt: 2, borderRadius: '10px' }}>
            {t('Advisory detection is running. Each image card shows real-time analysis status.')}
          </Alert>
        )}
        {isInspector && isAnalysisError && (
          <Alert severity="warning" sx={{ mt: 2, borderRadius: '10px' }}>
            {getErrorMessage(
              analysisError,
              'AI analysis is unavailable; existing evidence remains available.',
            )}
          </Alert>
        )}
        {isInspector && analysableImageIds.length === 0 && (
          <Alert severity="info" sx={{ mt: 2, borderRadius: '10px' }}>
            {t('Upload current image captures before running advisory detection.')}
          </Alert>
        )}
      </Paper>

      {findings.isLoading ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: '16px' }}>
          <Typography color="text.secondary">{t('Loading findings…')}</Typography>
        </Paper>
      ) : findings.isError ? (
        <Alert
          severity="error"
          sx={{ borderRadius: '12px' }}
          action={
            <Button color="inherit" onClick={() => void findings.refetch()}>
              {t('Retry')}
            </Button>
          }
        >
          {t('Could not load findings.')}
        </Alert>
      ) : (
        <Stack spacing={3}>
          {groupedFindings.map((group) => {
            const isAnalysing = analysingEvidenceIds.has(group.evidenceId);
            const isAnalysed = analysedEvidenceIds.has(group.evidenceId);
            const isNoDetection = noDetectionEvidenceIds.has(group.evidenceId);

            return (
              <EvidenceCaptureGroup
                key={group.evidenceId}
                inspectionId={inspectionId}
                evidenceId={group.evidenceId}
                evidence={group.evidence}
                findings={group.findings}
                isInspector={isInspector}
                analysisUnlocked={analysisUnlocked}
                isAnalysing={isAnalysing}
                isAnalysed={isAnalysed}
                isNoDetection={isNoDetection}
                onAnalyze={(id, replace) => void analyzeMany([id], { replace })}
                locationDraft={locationDrafts[group.evidenceId] ?? group.evidence?.locationDescription ?? ''}
                onLocationChange={(val) =>
                  setLocationDrafts((prev) => ({ ...prev, [group.evidenceId]: val }))
                }
                onLocationBlur={() => {
                  if (group.evidence) {
                    const value =
                      locationDrafts[group.evidenceId] ?? group.evidence.locationDescription ?? '';
                    if (value !== (group.evidence.locationDescription ?? '')) {
                      updateEvidenceLocation.mutate(
                        { evidenceId: group.evidenceId, locationDescription: value },
                        {
                          onError: (err) =>
                            setLocationErrors((prev) => ({
                              ...prev,
                              [group.evidenceId]: getErrorMessage(
                                err,
                                'Evidence location was not saved.',
                              ),
                            })),
                        },
                      );
                    }
                  }
                }}
                locationError={locationErrors[group.evidenceId]}
                severityFor={severityFor}
                onSeverityChange={(fid, sev) =>
                  setSeverities((prev) => ({ ...prev, [fid]: sev }))
                }
                editingCandidateId={editingCandidateId}
                onStartEdit={startEditingCandidate}
                onCancelEdit={() => setEditingCandidateId(null)}
                onSaveCorrection={saveCandidateCorrection}
                revisedDefectLabels={revisedDefectLabels}
                onDefectLabelChange={(fid, val) =>
                  setRevisedDefectLabels((prev) => ({ ...prev, [fid]: val }))
                }
                revisedTechnicalNotes={revisedTechnicalNotes}
                onTechnicalNotesChange={(fid, val) =>
                  setRevisedTechnicalNotes((prev) => ({ ...prev, [fid]: val }))
                }
                revisedRecommendedActions={revisedRecommendedActions}
                onRecommendedActionsChange={(fid, val) =>
                  setRevisedRecommendedActions((prev) => ({ ...prev, [fid]: val }))
                }
                onConfirmFinding={(finding) =>
                  confirmFinding.mutate({
                    findingId: finding.id,
                    input: {
                      severity: severityFor(finding),
                      technicalNotes: finding.technicalNotes ?? 'Confirmed by assigned Inspector',
                    },
                  })
                }
                onDeleteFinding={(fid) => deleteFinding.mutate(fid)}
                isConfirmPending={confirmFinding.isPending}
                isDeletePending={deleteFinding.isPending}
                isUpdatePending={updateFinding.isPending}
                updateError={updateFinding.error}
                isReportLocked={isReportLocked}
                manualFindingOpen={manualFindingEvidenceId === group.evidenceId}
                onOpenManualFinding={() => setManualFindingEvidenceId(group.evidenceId)}
                onCloseManualFinding={() => setManualFindingEvidenceId(null)}
                onSubmitManualFinding={(e) => {
                  submitManualFinding(e);
                  setManualFindingEvidenceId(null);
                }}
                isCreateManualPending={createManualFinding.isPending}
                createManualError={createManualFinding.error}
              />
            );
          })}

          {confirmFinding.isError && (
            <Alert severity="error" sx={{ borderRadius: '12px' }}>
              {getErrorMessage(confirmFinding.error, 'The finding was not confirmed.')}
            </Alert>
          )}
        </Stack>
      )}

      {/* Audit Log / Removed Findings */}
      {isInspector && showRemovedFindings && (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '16px' }}>
          <Stack spacing={1.5}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t('Audit Log / Removed Findings')}
            </Typography>
            {removedFindings.data?.length ? (
              <Stack spacing={1}>
                {removedFindings.data.map((finding) => (
                  <Paper key={finding.id} variant="outlined" sx={{ p: 1.5, borderRadius: '10px' }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                      <Typography sx={{ fontWeight: 600 }}>{finding.defectLabel}</Typography>
                      <Chip size="small" label={finding.severity} />
                      <Chip
                        size="small"
                        color={finding.status === 'CONFIRMED' ? 'success' : 'default'}
                        label={finding.status === 'CONFIRMED' ? 'Was confirmed' : 'Was never confirmed'}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {t('Removed')}
                      </Typography>
                      <Box sx={{ flexGrow: 1 }} />
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={restoreFinding.isPending}
                        onClick={() => restoreFinding.mutate(finding.id)}
                        sx={{ borderRadius: '8px', textTransform: 'none' }}
                      >
                        {t('Restore')}
                      </Button>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            ) : (
              <Alert severity="info" sx={{ borderRadius: '10px' }}>
                {t('No finding has been removed.')}
              </Alert>
            )}
            {restoreFinding.isError && (
              <Alert severity="error">
                {getErrorMessage(restoreFinding.error, 'The finding was not restored.')}
              </Alert>
            )}
          </Stack>
        </Paper>
      )}

      {/* Confirmation & Stage Gate */}
      {isInspector && (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '16px' }}>
          <Stack spacing={1.5}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t('Findings Confirmation Gate')}
            </Typography>
            {workflow.data?.status === 'REPORT_DRAFT' && workflow.data.findingsSnapshotHash && (
              <Alert severity="info" sx={{ borderRadius: '10px' }}>
                {t('Findings are confirmed. Reopen this stage only if you need to change the reviewed set.')}
                <Button
                  size="small"
                  sx={{ ml: 1, textTransform: 'none', fontWeight: 600 }}
                  disabled={reopenFindings.isPending}
                  onClick={() => reopenFindings.mutate()}
                >
                  {t('Reopen Findings')}
                </Button>
              </Alert>
            )}
            <Typography variant="body2" color="text.secondary">
              {pendingFindings > 0
                ? `${pendingFindings} finding${pendingFindings === 1 ? '' : 's'} still need a decision.`
                : reviewedItemCount > 0
                  ? `${reviewedItemCount} finding${reviewedItemCount === 1 ? '' : 's'} ready for the report stage.`
                  : 'No findings found yet. Confirm the inspected scope was reviewed and no finding was observed.'}
            </Typography>
            {noFindings && (
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={noFindingsAcknowledged}
                  onChange={(event) => setNoFindingsAcknowledged(event.target.checked)}
                />
                <Typography variant="body2">
                  {t('No finding was observed within the scope covered by these images.')}
                </Typography>
              </label>
            )}
            <Button
              variant="contained"
              disabled={!canConfirm}
              onClick={() =>
                confirmFindings.mutate(noFindings, {
                  onSuccess: () => navigate('../report'),
                })
              }
              sx={{ alignSelf: 'flex-start', borderRadius: '10px', textTransform: 'none', px: 2.5 }}
            >
              {confirmFindings.isPending ? 'Confirming findings…' : 'Confirm findings and continue'}
            </Button>
            {confirmFindings.isError && (
              <Alert severity="error" sx={{ borderRadius: '10px' }}>
                {getErrorMessage(
                  confirmFindings.error,
                  'Findings were not confirmed. Resolve any pending candidates and try again.',
                )}
              </Alert>
            )}
          </Stack>
        </Paper>
      )}

      <InspectorFindingRegister
        findings={(findings.data ?? []).filter((finding) => finding.modelName == null && !finding.isDeleted)}
        evidence={evidence.data ?? []}
        isEditable={isInspector && !isReportLocked}
        isPending={updateFinding.isPending || deleteFinding.isPending}
        error={updateFinding.error ?? deleteFinding.error}
        onUpdate={(findingId, input) => updateFinding.mutate({ findingId, input })}
        onDelete={(findingId) => deleteFinding.mutate(findingId)}
      />
    </Stack>
  );
}

function InspectorFindingRegister({
  findings,
  evidence,
  isEditable,
  isPending,
  error,
  onUpdate,
  onDelete,
}: {
  findings: Finding[];
  evidence: EvidenceItem[];
  isEditable: boolean;
  isPending: boolean;
  error: unknown;
  onUpdate: (findingId: string, input: ManualFindingInput) => void;
  onDelete: (findingId: string) => void;
}) {
  const { t } = useLocale();
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!isEditable || findings.length === 0) return null;
  const activeEvidence = evidence.filter((item) => !item.isDeleted);

  const submitEdit = (event: FormEvent<HTMLFormElement>, finding: Finding) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onUpdate(finding.id, {
      evidenceId: String(data.get('evidenceId') ?? finding.evidenceId ?? ''),
      defectLabel: String(data.get('defectLabel') ?? '').trim(),
      severity: String(data.get('severity') ?? finding.severity) as FindingSeverity,
      technicalNotes: String(data.get('technicalNotes') ?? '').trim(),
      recommendedAction: String(data.get('recommendedAction') ?? '').trim() || undefined,
    });
    setEditingId(null);
  };

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: '16px' }}>
      <Stack spacing={1.5}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>{t('Inspector findings')}</Typography>
        <Typography variant="body2" color="text.secondary">
          {t('While the report is not submitted, correct or remove a finding. Removing it keeps an audit record; retired evidence remains preserved.')}
        </Typography>
        {findings.map((finding) => (
          <Paper key={finding.id} variant="outlined" sx={{ p: 1.75, borderRadius: '12px' }}>
            {editingId === finding.id ? (
              <Box component="form" onSubmit={(event) => submitEdit(event, finding)} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.25 }}>
                <TextField select name="evidenceId" label={t('Evidence')} size="small" defaultValue={finding.evidenceId ?? ''} required>
                  {activeEvidence.map((item) => <MenuItem key={item.id} value={item.id}>{item.fileName}</MenuItem>)}
                </TextField>
                <TextField name="defectLabel" label={t('Defect label')} size="small" defaultValue={finding.defectLabel} required />
                <TextField select name="severity" label={t('Severity')} size="small" defaultValue={finding.severity}>
                  {SEVERITIES.map((level) => <MenuItem key={level} value={level}>{level}</MenuItem>)}
                </TextField>
                <TextField name="technicalNotes" label={t('Technical notes')} size="small" multiline minRows={2} defaultValue={finding.technicalNotes} required sx={{ gridColumn: '1 / -1' }} />
                <TextField name="recommendedAction" label={t('Recommended action')} size="small" multiline minRows={2} defaultValue={finding.recommendedAction ?? ''} sx={{ gridColumn: '1 / -1' }} />
                <Stack direction="row" spacing={1} sx={{ gridColumn: '1 / -1' }}>
                  <Button type="submit" variant="contained" size="small" disabled={isPending || activeEvidence.length === 0}>{t('Save finding')}</Button>
                  <Button size="small" onClick={() => setEditingId(null)}>{t('Cancel')}</Button>
                </Stack>
              </Box>
            ) : (
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  <Typography sx={{ fontWeight: 700 }}>{finding.defectLabel}</Typography>
                  <Chip size="small" label={finding.severity} />
                  {finding.status === 'CONFIRMED' && <Chip size="small" color="success" label={t('Included in report')} />}
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {evidence.find((item) => item.id === finding.evidenceId)?.locationDescription || 'Location not supplied'}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button size="small" onClick={() => setEditingId(finding.id)}>{t('Edit')}</Button>
                  <Button size="small" color="error" disabled={isPending} onClick={() => onDelete(finding.id)}>
                    {t('Remove')}
                  </Button>
                </Stack>
              </Stack>
            )}
          </Paper>
        ))}
        {error != null && <Alert severity="error">{getErrorMessage(error, 'The finding change was not saved.')}</Alert>}
      </Stack>
    </Paper>
  );
}

function OrganizationFindingsOverview({
  findings,
  inspectionId,
}: {
  findings: Finding[];
  inspectionId: string;
}) {
  const { t } = useLocale();
  const evidence = useInspectionEvidence(inspectionId);
  const officialFindings = findings.filter((finding) => finding.status === 'CONFIRMED');
  const pendingFindings = findings.filter((finding) => finding.status === 'PENDING');
  const severityOrder: FindingSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const severitySummary = severityOrder
    .map((severity) => ({ severity, count: officialFindings.filter((finding) => finding.severity === severity).length }))
    .filter((item) => item.count > 0);

  return (
    <Stack spacing={2}>
      <Alert severity="info">
        This is the Inspector’s findings overview, not a reviewer decision screen. A finding the
        Inspector has not confirmed is not official; the submitted report is reviewed as a whole on
        the Review report tab.
      </Alert>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <Chip label={`${officialFindings.length} Inspector-confirmed finding(s)`} color="primary" variant="outlined" />
        <Chip label={`${pendingFindings.length} awaiting Inspector review`} color={pendingFindings.length ? 'warning' : 'default'} variant="outlined" />
        {severitySummary.map(({ severity, count }) => <Chip key={severity} label={`${severity}: ${count}`} size="small" />)}
      </Stack>
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: '16px' }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>{t('Inspector findings')}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Only findings the Inspector confirmed are presented as official report findings. The rest
          are shown separately and cannot be accepted or edited here.
        </Typography>
        {officialFindings.length === 0 ? (
          <Alert severity="info">{t('The Inspector has not confirmed any report findings for this inspection.')}</Alert>
        ) : (
          <Stack spacing={1.5}>
            {officialFindings.map((finding) => (
              <Paper key={finding.id} variant="outlined" sx={{ p: 1.75, borderRadius: '12px' }}>
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <Typography sx={{ fontWeight: 700 }}>{finding.defectLabel}</Typography>
                    <Chip size="small" label={finding.severity} />
                    <Chip size="small" color="success" label={t('Inspector-confirmed')} />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {(evidence.data ?? []).find((item) => item.id === finding.evidenceId)?.locationDescription ?? 'Location not recorded'}
                  </Typography>
                  {finding.technicalNotes && <Typography variant="body2" color="text.secondary">{finding.technicalNotes}</Typography>}
                  {finding.recommendedAction && <Typography variant="body2"><strong>{t('Recommended action:')}</strong> {finding.recommendedAction}</Typography>}
                  {finding.evidenceId && <Typography variant="caption" color="text.secondary">{t('Linked evidence ·')} {finding.evidenceId.slice(0, 8)}…</Typography>}
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Paper>
      {pendingFindings.length > 0 && (
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: '16px' }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>{t('Awaiting Inspector review')}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {t('These are not official findings. The assigned Inspector confirms or removes them.')}
          </Typography>
          <Stack spacing={1}>
            {pendingFindings.map((finding) => (
              <Paper key={finding.id} variant="outlined" sx={{ p: 1.5, borderRadius: '12px' }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  <Typography sx={{ fontWeight: 600 }}>{finding.defectLabel}</Typography>
                  {finding.confidence !== null && (
                    <Chip size="small" label={`${Math.round(finding.confidence * 100)}% confidence`} />
                  )}
                  <Chip size="small" color="warning" label={t('Pending Inspector review')} />
                  {finding.modelName && (
                    <Typography variant="caption" color="text.secondary">
                      {finding.modelName}
                    </Typography>
                  )}
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
