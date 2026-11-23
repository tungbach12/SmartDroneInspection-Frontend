import { useState, type FormEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import CropFreeRounded from '@mui/icons-material/CropFreeRounded';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { AuthenticatedMedia } from '@/shared/ui/AuthenticatedMedia';
import { AiMotionFigure } from '../components/AiMotionFigure';
import { EvidenceGpsMapDialog } from './EvidenceGpsMapDialog';
import { inspectionApi } from '../api/inspectionApi';
import type {
  DraftFindingNoteResult,
  EvidenceItem,
  Finding,
  FindingSeverity,
} from '../api/inspectionApi';
import { parseBoundingBox } from '../utils/boundingBox';

const SEVERITIES: FindingSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export interface EvidenceCaptureGroupProps {
  inspectionId: string;
  evidenceId: string;
  evidence?: EvidenceItem | undefined;
  findings: Finding[];
  isInspector: boolean;
  analysisUnlocked: boolean;
  isAnalysing: boolean;
  isAnalysed: boolean;
  isNoDetection: boolean;
  onAnalyze: (evidenceId: string, replace: boolean) => void;
  locationDraft: string;
  onLocationChange: (val: string) => void;
  onLocationBlur: () => void;
  locationError?: string | undefined;
  severityFor: (finding: Finding) => FindingSeverity;
  onSeverityChange: (findingId: string, severity: FindingSeverity) => void;
  editingCandidateId: string | null;
  onStartEdit: (finding: Finding) => void;
  onCancelEdit: () => void;
  onSaveCorrection: (finding: Finding) => void;
  revisedDefectLabels: Record<string, string>;
  onDefectLabelChange: (findingId: string, val: string) => void;
  revisedTechnicalNotes: Record<string, string>;
  onTechnicalNotesChange: (findingId: string, val: string) => void;
  revisedBoundingBoxes?: Record<string, string | null> | undefined;
  onEditBoundingBox?: ((finding: Finding) => void) | undefined;
  onClearBoundingBox?: ((findingId: string) => void) | undefined;
  onConfirmFinding: (finding: Finding) => void;
  onDeleteFinding: (findingId: string) => void;
  /** One crisp AI-draft action replaces the old expandable cases/standards strip. */
  draftingNoteId?: string | null | undefined;
  draftingNoteIds?: ReadonlySet<string> | undefined;
  draftedNotes?: Record<string, DraftFindingNoteResult> | undefined;
  onDraftNote?: ((finding: Finding) => void) | undefined;
  onRestoreFinding?: (findingId: string) => void;
  isRestorePending?: boolean;
  isConfirmPending: boolean;
  isDeletePending: boolean;
  isUpdatePending: boolean;
  updateError: unknown;
  isReportLocked: boolean;
  manualFindingOpen: boolean;
  onOpenManualFinding: () => void;
  onCloseManualFinding: () => void;
  onSubmitManualFinding: (event: FormEvent<HTMLFormElement>) => void;
  manualBoundingBox?: string | null | undefined;
  onEditManualBoundingBox?: ((evidenceId: string) => void) | undefined;
  onClearManualBoundingBox?: (() => void) | undefined;
  isCreateManualPending: boolean;
  createManualError: unknown;
}

export function EvidenceCaptureGroup(props: EvidenceCaptureGroupProps) {
  const { t } = useLocale();
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [hoveredCandidateId, setHoveredCandidateId] = useState<string | null>(null);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);

  const hasFindings = props.findings.length > 0;
  const isImage = props.evidence?.contentType.startsWith('image/');
  const lat = props.evidence?.latitude;
  const lon = props.evidence?.longitude;
  const hasGps =
    lat != null && lon != null && Number.isFinite(Number(lat)) && Number.isFinite(Number(lon));

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: '10px',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        boxShadow: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Group Header */}
      <Box
        sx={{
          p: 2,
          bgcolor: 'background.default',
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'flex-start', md: 'center' },
          justifyContent: 'space-between',
          gap: 1.5,
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0, flexWrap: 'wrap', gap: 0.75 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary' }}>
            {props.evidence?.fileName ?? `Evidence ${props.evidenceId.slice(0, 8)}…`}
          </Typography>
          <Chip
            size="small"
            variant="outlined"
            label={
              hasFindings
                ? `${props.findings.length} ${props.findings.length === 1 ? 'finding' : 'findings'}`
                : t('No findings')
            }
            sx={{ fontWeight: 600, fontSize: '0.75rem', bgcolor: 'background.paper', color: 'text.secondary' }}
          />
          {hasGps && (
            <Chip
              size="small"
              variant="outlined"
              color="primary"
              icon={<PlaceOutlined sx={{ fontSize: 15 }} />}
              label={t('View on map')}
              onClick={() => setMapDialogOpen(true)}
              sx={{ fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}
            />
          )}
        </Stack>

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          {props.isAnalysing && (
            <AiMotionFigure
              name="advisoryLens"
              size={22}
              alt={`Analysing ${props.evidence?.fileName}`}
            />
          )}
          {props.isAnalysed && !props.isAnalysing && (
            <Chip
              size="small"
              variant="outlined"
              color="success"
              label={props.isNoDetection ? t('No defects detected') : t('Detection complete')}
              sx={{ fontWeight: 600, fontSize: '0.75rem' }}
            />
          )}
          {isImage && props.isInspector && props.analysisUnlocked && (
            <Button
              size="small"
              variant="outlined"
              disabled={props.isAnalysing}
              onClick={() => props.onAnalyze(props.evidenceId, props.isAnalysed)}
              sx={{
                textTransform: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.875rem',
                bgcolor: 'background.paper',
              }}
            >
              {props.isAnalysing
                ? t('Analyzing…')
                : props.isAnalysed
                  ? t('Analyze again')
                  : t('Analyze image')}
            </Button>
          )}
        </Stack>
      </Box>

      {/* Group Body */}
      <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
        {/* Shared Asset Area Location */}
        {props.evidence && props.isInspector && (
          <Box sx={{ mb: 2.5 }}>
            <TextField
              size="small"
              fullWidth
              disabled={props.isReportLocked}
              label={t('Capture location / zone for this photo')}
              placeholder={t('e.g., Main span Pier T1, downstream face, 12m elevation')}
              value={props.locationDraft}
              onChange={(e) => props.onLocationChange(e.target.value)}
              onBlur={props.onLocationBlur}
              helperText={
                props.isReportLocked
                  ? t('Location description is locked while the report is submitted or after publication.')
                  : props.locationError
              }
              error={Boolean(props.locationError)}
              slotProps={{
                htmlInput: { maxLength: 1000 },
                input: { sx: { borderRadius: '8px', bgcolor: 'background.default' } },
              }}
            />
          </Box>
        )}

        {/* 2-Column Split: Image on Left, Defect List on Right */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '420px 1fr' },
            gap: 3,
            alignItems: 'start',
          }}
        >
          {/* Left Column: Image & Region Switch */}
          <Box sx={{ position: { lg: 'sticky' }, top: 16 }}>
            {props.evidence && isImage && (
              <Box
                sx={{
                  borderRadius: '10px',
                  border: '1px solid',
                  borderColor: 'divider',
                  overflow: 'hidden',
                  p: 1.25,
                  bgcolor: 'background.default',
                }}
              >
                <Box sx={{ position: 'relative', width: '100%', lineHeight: 0 }}>
                  <AuthenticatedMedia
                    src={inspectionApi.evidenceContentUrl(props.inspectionId, props.evidence.id)}
                    alt={`Inspection evidence ${props.evidence.fileName}`}
                    contentType={props.evidence.contentType}
                    maxHeight={420}
                    sx={{ borderRadius: '8px', width: '100%' }}
                  />
                  {showBoundingBoxes &&
                    props.findings.map((finding, index) => {
                      const rawBox =
                        props.editingCandidateId === finding.id &&
                        props.revisedBoundingBoxes &&
                        finding.id in props.revisedBoundingBoxes
                          ? props.revisedBoundingBoxes[finding.id]
                          : finding.boundingBox;
                      const box = parseBoundingBox(rawBox ?? undefined);
                      if (!box) return null;
                      const active =
                        hoveredCandidateId === finding.id || props.editingCandidateId === finding.id;
                      const color = ['#d32f2f', '#1976d2', '#2e7d32', '#ed6c02'][index % 4];
                      const hasConfidence = finding.confidence !== null && finding.confidence !== undefined;
                      const boxTag = hasConfidence
                        ? `${finding.defectLabel} · ${Math.round(finding.confidence! * 100)}%`
                        : finding.defectLabel;
                      const boxAria = hasConfidence
                        ? `${finding.defectLabel}, ${Math.round(finding.confidence! * 100)} percent confidence`
                        : finding.defectLabel;
                      return (
                        <Box
                          key={finding.id}
                          role="img"
                          aria-label={boxAria}
                          sx={{
                            position: 'absolute',
                            left: `${box.xMin * 100}%`,
                            top: `${box.yMin * 100}%`,
                            width: `${(box.xMax - box.xMin) * 100}%`,
                            height: `${(box.yMax - box.yMin) * 100}%`,
                            border: `2px solid ${color}`,
                            boxShadow: active ? `0 0 0 3px ${color}66` : 'none',
                            pointerEvents: 'none',
                            zIndex: 2,
                            '&::before': {
                              content: `"${boxTag}"`,
                              position: 'absolute',
                              top: -22,
                              left: -2,
                              px: 0.5,
                              py: 0.25,
                              color: '#fff',
                              bgcolor: color,
                              fontSize: 10,
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                              lineHeight: 1.2,
                            },
                          }}
                        />
                      );
                    })}
                </Box>

                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={showBoundingBoxes}
                        onChange={(_e, checked) => setShowBoundingBoxes(checked)}
                      />
                    }
                    label={
                      <Typography variant="body2" sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                        {t('Show detected regions')}
                      </Typography>
                    }
                  />
                </Box>
              </Box>
            )}

            {props.evidence && !isImage && props.evidence.contentType.startsWith('video/') && (
              <Box
                sx={{
                  borderRadius: '10px',
                  border: '1px solid',
                  borderColor: 'divider',
                  overflow: 'hidden',
                  p: 1.25,
                  bgcolor: 'background.default',
                }}
              >
                <Box sx={{ width: '100%', lineHeight: 0 }}>
                  <AuthenticatedMedia
                    src={inspectionApi.evidenceContentUrl(props.inspectionId, props.evidence.id)}
                    posterSrc={
                      props.evidence.hasThumbnail
                        ? inspectionApi.evidenceContentUrl(
                            props.inspectionId,
                            props.evidence.id,
                            'thumb',
                          )
                        : undefined
                    }
                    alt={`Inspection evidence ${props.evidence.fileName}`}
                    contentType={props.evidence.contentType}
                    maxHeight={420}
                    sx={{ borderRadius: '8px', width: '100%' }}
                  />
                </Box>
              </Box>
            )}
          </Box>

          {/* Right Column: Findings Cards */}
          <Stack spacing={2}>
            {!hasFindings ? (
              <Box
                sx={{
                  p: 3,
                  textAlign: 'center',
                  borderRadius: '10px',
                  border: '1px dashed',
                  borderColor: 'divider',
                  bgcolor: 'background.default',
                }}
              >
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                  {t('No findings recorded for this capture.')}
                </Typography>
              </Box>
            ) : (
              props.findings.map((finding, fIdx) => {
                const confirmed = finding.status === 'CONFIRMED';
                const isEditing = props.editingCandidateId === finding.id;

                return (
                  <Box
                    key={finding.id}
                    onMouseEnter={() => setHoveredCandidateId(finding.id)}
                    onMouseLeave={() => setHoveredCandidateId(null)}
                    onFocus={() => setHoveredCandidateId(null)}
                    onBlur={() => setHoveredCandidateId(null)}
                  >
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: '10px',
                        borderTop: fIdx > 0 ? '1px solid' : 'none',
                        borderColor: isEditing
                          ? 'primary.main'
                          : hoveredCandidateId === finding.id
                            ? 'primary.light'
                            : 'divider',
                        bgcolor: isEditing ? 'background.default' : 'background.paper',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <Box>
                        {isEditing && props.isInspector && !props.isReportLocked ? (
                          /* In-place Editable Form */
                          <Stack spacing={1.5}>
                            <Stack
                              direction="row"
                              sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                            >
                              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                ✏️ {t('Edit Defect Details')} ({finding.findingCode})
                              </Typography>
                              <Button
                                size="small"
                                onClick={props.onCancelEdit}
                                sx={{ textTransform: 'none', color: 'text.secondary' }}
                              >
                                {t('Cancel')}
                              </Button>
                            </Stack>

                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                              <TextField
                                size="small"
                                label={t('Defect label')}
                                value={props.revisedDefectLabels[finding.id] ?? finding.defectLabel}
                                onChange={(e) => props.onDefectLabelChange(finding.id, e.target.value)}
                                slotProps={{
                                  htmlInput: { maxLength: 160 },
                                  input: { sx: { borderRadius: '8px', bgcolor: 'background.paper' } },
                                }}
                                sx={{ flexGrow: 1 }}
                              />
                              <TextField
                                select
                                size="small"
                                label={t('Severity')}
                                value={props.severityFor(finding)}
                                onChange={(e) =>
                                  props.onSeverityChange(finding.id, e.target.value as FindingSeverity)
                                }
                                slotProps={{
                                  input: { sx: { borderRadius: '8px', bgcolor: 'background.paper' } },
                                }}
                                sx={{ minWidth: 140 }}
                              >
                                {SEVERITIES.map((level) => (
                                  <MenuItem key={level} value={level}>
                                    {level}
                                  </MenuItem>
                                ))}
                              </TextField>
                            </Stack>

                            <TextField
                              size="small"
                              label={t('Note')}
                              multiline
                              minRows={2}
                              value={
                                props.revisedTechnicalNotes[finding.id] ?? finding.technicalNotes ?? ''
                              }
                              onChange={(e) =>
                                props.onTechnicalNotesChange(finding.id, e.target.value)
                              }
                              slotProps={{
                                htmlInput: { maxLength: 4000 },
                                input: { sx: { borderRadius: '8px', bgcolor: 'background.paper' } },
                              }}
                              required
                            />

                            <DraftNoteAction
                              finding={finding}
                              canDraft={
                                props.isInspector && !props.isReportLocked && !finding.isDeleted
                              }
                              isDrafting={
                                Boolean(props.draftingNoteIds?.has(finding.id)) ||
                                props.draftingNoteId === finding.id
                              }
                              result={props.draftedNotes?.[finding.id]}
                              onDraft={props.onDraftNote}
                            />

                            {isImage && props.onEditBoundingBox && (
                              <Stack
                                direction="row"
                                spacing={1}
                                sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}
                              >
                                {(() => {
                                  const raw =
                                    props.revisedBoundingBoxes &&
                                    finding.id in props.revisedBoundingBoxes
                                      ? props.revisedBoundingBoxes[finding.id]
                                      : finding.boundingBox;
                                  const parsed = parseBoundingBox(raw);
                                  return parsed ? (
                                    <>
                                      <Chip
                                        size="small"
                                        color="primary"
                                        variant="outlined"
                                        label={`${t('Region:')} ${Math.round((parsed.xMax - parsed.xMin) * 100)}% × ${Math.round((parsed.yMax - parsed.yMin) * 100)}%`}
                                      />
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<CropFreeRounded fontSize="small" />}
                                        onClick={() => props.onEditBoundingBox?.(finding)}
                                        sx={{ borderRadius: '8px', textTransform: 'none' }}
                                      >
                                        {t('Adjust box on photo')}
                                      </Button>
                                      {props.onClearBoundingBox && (
                                        <Button
                                          size="small"
                                          color="error"
                                          variant="text"
                                          onClick={() => props.onClearBoundingBox?.(finding.id)}
                                          sx={{ borderRadius: '8px', textTransform: 'none' }}
                                        >
                                          {t('Clear region')}
                                        </Button>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      <Chip size="small" variant="outlined" label={t('No region box')} />
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<CropFreeRounded fontSize="small" />}
                                        onClick={() => props.onEditBoundingBox?.(finding)}
                                        sx={{ borderRadius: '8px', textTransform: 'none' }}
                                      >
                                        {t('Mark region on photo')}
                                      </Button>
                                    </>
                                  );
                                })()}
                              </Stack>
                            )}

                            <Stack direction="row" spacing={1} sx={{ pt: 0.5 }}>
                              <Button
                                size="small"
                                variant="contained"
                                disabled={props.isUpdatePending}
                                onClick={() => props.onSaveCorrection(finding)}
                                sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                              >
                                {t('Save correction')}
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={props.onCancelEdit}
                                sx={{ borderRadius: '8px', textTransform: 'none' }}
                              >
                                {t('Cancel')}
                              </Button>
                            </Stack>

                            {Boolean(props.updateError) && (
                              <Alert severity="error" sx={{ borderRadius: '8px' }}>
                                {getErrorMessage(props.updateError, 'The correction was not saved.')}
                              </Alert>
                            )}
                          </Stack>
                        ) : (
                          /* Clean Viewing Card */
                          <Stack spacing={1.25}>
                            <Stack
                              direction="row"
                              spacing={1}
                              sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}
                            >
                              <Chip
                                size="small"
                                label={finding.findingCode}
                                sx={{ fontWeight: 700, bgcolor: 'action.hover', color: 'text.primary' }}
                              />
                              <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary' }}>
                                {finding.defectLabel}
                              </Typography>
                              {finding.confidence !== null && (
                                <Chip
                                  size="small"
                                  label={`${Math.round(finding.confidence * 100)}% confidence`}
                                  sx={{ fontSize: '0.75rem', color: 'text.primary', fontWeight: 600 }}
                                />
                              )}
                              <Chip
                                size="small"
                                variant="outlined"
                                label={confirmed ? t('Confirmed') : t('Awaiting review')}
                                sx={{
                                  fontWeight: 600,
                                  fontSize: '0.75rem',
                                  ...(confirmed
                                    ? {
                                        bgcolor: '#f0fdf4',
                                        color: '#166534',
                                        borderColor: '#bbf7d0',
                                      }
                                    : {
                                        bgcolor: '#fffbeb',
                                        color: '#b45309',
                                        borderColor: '#fde68a',
                                      }),
                                }}
                              />
                            </Stack>

                            {(() => {
                              const note = (
                                props.revisedTechnicalNotes[finding.id] ?? finding.technicalNotes
                              )?.trim();
                              return (
                                <Typography
                                  variant="body2"
                                  sx={{
                                    color: note ? 'text.primary' : 'text.secondary',
                                    fontStyle: note ? 'normal' : 'italic',
                                    lineHeight: 1.5,
                                  }}
                                >
                                  <strong>{t('Note')}:</strong> {note || t('None')}
                                </Typography>
                              );
                            })()}

                            <DraftNoteAction
                              finding={finding}
                              canDraft={
                                props.isInspector && !props.isReportLocked && !finding.isDeleted
                              }
                              isDrafting={
                                Boolean(props.draftingNoteIds?.has(finding.id)) ||
                                props.draftingNoteId === finding.id
                              }
                              result={props.draftedNotes?.[finding.id]}
                              onDraft={props.onDraftNote}
                            />

                            {/* Card Footer Actions */}
                            {finding.isDeleted ? (
                              <Box sx={{ pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                                <Stack
                                  direction="row"
                                  spacing={1}
                                  sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}
                                >
                                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                    <Chip
                                      size="small"
                                      color="error"
                                      variant="outlined"
                                      label={t('Removed')}
                                      sx={{ fontWeight: 700 }}
                                    />
                                    <Chip size="small" label={finding.severity} />
                                  </Stack>
                                  {props.isInspector && !props.isReportLocked && props.onRestoreFinding && (
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="primary"
                                      disabled={props.isRestorePending}
                                      onClick={() => props.onRestoreFinding?.(finding.id)}
                                      sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                                    >
                                      {t('Restore Finding')}
                                    </Button>
                                  )}
                                </Stack>
                              </Box>
                            ) : !confirmed && props.isInspector && !props.isReportLocked ? (
                              <Box sx={{ pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                                <Stack
                                  direction={{ xs: 'column', sm: 'row' }}
                                  spacing={1.25}
                                  sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
                                >
                                  <TextField
                                    select
                                    size="small"
                                    label={t('Severity')}
                                    value={props.severityFor(finding)}
                                    onChange={(e) =>
                                      props.onSeverityChange(finding.id, e.target.value as FindingSeverity)
                                    }
                                    slotProps={{
                                      input: { sx: { borderRadius: '8px', fontSize: '0.875rem' } },
                                    }}
                                    sx={{ width: { xs: '100%', sm: 130 } }}
                                  >
                                    {SEVERITIES.map((level) => (
                                      <MenuItem key={level} value={level}>
                                        {level}
                                      </MenuItem>
                                    ))}
                                  </TextField>

                                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                    <Button
                                      size="small"
                                      variant="contained"
                                      disabled={props.isConfirmPending}
                                      onClick={() => props.onConfirmFinding(finding)}
                                      sx={{
                                        borderRadius: '8px',
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        px: 2,
                                      }}
                                    >
                                      {t('Confirm')}
                                    </Button>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      onClick={() => props.onStartEdit(finding)}
                                      sx={{
                                        borderRadius: '8px',
                                        textTransform: 'none',
                                        color: 'text.secondary',
                                        borderColor: 'divider',
                                      }}
                                    >
                                      {t('Edit / Change defect')}
                                    </Button>
                                    <Button
                                      size="small"
                                      color="error"
                                      disabled={props.isDeletePending}
                                      onClick={() => props.onDeleteFinding(finding.id)}
                                      sx={{ borderRadius: '8px', textTransform: 'none' }}
                                    >
                                      {t('Remove')}
                                    </Button>
                                  </Stack>
                                </Stack>
                              </Box>
                            ) : null}

                            {confirmed && !finding.isDeleted && (
                              <Box sx={{ pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                                <Stack
                                  direction="row"
                                  spacing={1}
                                  sx={{
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                  }}
                                >
                                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                    <Chip
                                      size="small"
                                      label={finding.severity}
                                      color={
                                        finding.severity === 'CRITICAL' || finding.severity === 'HIGH'
                                          ? 'error'
                                          : 'default'
                                      }
                                      sx={{ fontWeight: 700 }}
                                    />
                                  </Stack>

                                  {props.isInspector && !props.isReportLocked && (
                                    <Stack direction="row" spacing={0.5}>
                                      <Button
                                        size="small"
                                        variant="text"
                                        onClick={() => props.onStartEdit(finding)}
                                        sx={{ textTransform: 'none', borderRadius: '8px' }}
                                      >
                                        {t('Edit / Change defect')}
                                      </Button>
                                      <Button
                                        size="small"
                                        color="error"
                                        disabled={props.isDeletePending}
                                        onClick={() => props.onDeleteFinding(finding.id)}
                                        sx={{ textTransform: 'none', borderRadius: '8px' }}
                                      >
                                        {t('Remove')}
                                      </Button>
                                    </Stack>
                                  )}
                                </Stack>
                              </Box>
                            )}
                          </Stack>
                        )}
                      </Box>
                    </Box>
                  </Box>
                );
              })
            )}
          </Stack>
        </Box>

        {/* Manual Finding Trigger */}
        {props.isInspector && !props.isReportLocked && props.evidence ? (
          <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            {props.manualFindingOpen ? (
              <Box
                component="form"
                onSubmit={props.onSubmitManualFinding}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 1.5,
                  p: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '10px',
                  bgcolor: 'background.default',
                }}
              >
                <Stack
                  direction="row"
                  sx={{ alignItems: 'center', justifyContent: 'space-between', gridColumn: '1 / -1' }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {t('Add manual finding')}
                  </Typography>
                  <Button size="small" onClick={props.onCloseManualFinding}>
                    {t('Cancel')}
                  </Button>
                </Stack>
                <input type="hidden" name="evidenceId" value={props.evidenceId} />
                <TextField
                  name="defectLabel"
                  label={t('Defect label')}
                  required
                  size="small"
                  slotProps={{ htmlInput: { maxLength: 160 } }}
                />
                <TextField select name="severity" label={t('Severity')} defaultValue="MEDIUM" size="small">
                  {SEVERITIES.map((level) => (
                    <MenuItem key={level} value={level}>
                      {level}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  name="technicalNotes"
                  label={t('Note')}
                  required
                  multiline
                  minRows={2}
                  size="small"
                  sx={{ gridColumn: '1 / -1' }}
                  slotProps={{ htmlInput: { maxLength: 4000 } }}
                />
                <input type="hidden" name="boundingBox" value={props.manualBoundingBox ?? ''} />
                {isImage && props.onEditManualBoundingBox && (
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ gridColumn: '1 / -1', alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}
                  >
                    {(() => {
                      const manualBox = parseBoundingBox(props.manualBoundingBox);
                      return manualBox ? (
                        <>
                          <Chip
                            size="small"
                            color="primary"
                            variant="outlined"
                            label={`${t('Region:')} ${Math.round((manualBox.xMax - manualBox.xMin) * 100)}% × ${Math.round((manualBox.yMax - manualBox.yMin) * 100)}%`}
                          />
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<CropFreeRounded fontSize="small" />}
                            onClick={() => props.onEditManualBoundingBox?.(props.evidenceId)}
                            sx={{ borderRadius: '8px', textTransform: 'none' }}
                          >
                            {t('Adjust box on photo')}
                          </Button>
                          {props.onClearManualBoundingBox && (
                            <Button
                              size="small"
                              color="error"
                              variant="text"
                              onClick={() => props.onClearManualBoundingBox?.()}
                              sx={{ borderRadius: '8px', textTransform: 'none' }}
                            >
                              {t('Clear region')}
                            </Button>
                          )}
                        </>
                      ) : (
                        <>
                          <Chip size="small" variant="outlined" label={t('No region box')} />
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<CropFreeRounded fontSize="small" />}
                            onClick={() => props.onEditManualBoundingBox?.(props.evidenceId)}
                            sx={{ borderRadius: '8px', textTransform: 'none' }}
                          >
                            {t('Mark region on photo')}
                          </Button>
                        </>
                      );
                    })()}
                  </Stack>
                )}
                <Button
                  type="submit"
                  variant="contained"
                  size="small"
                  disabled={props.isCreateManualPending}
                  sx={{ justifySelf: 'start', borderRadius: '8px', textTransform: 'none' }}
                >
                  {props.isCreateManualPending ? 'Saving finding…' : 'Save manual finding'}
                </Button>
                {Boolean(props.createManualError) && (
                  <Alert severity="error" sx={{ mt: 1, gridColumn: '1 / -1' }}>
                    {getErrorMessage(props.createManualError, 'Manual finding was not saved.')}
                  </Alert>
                )}
              </Box>
            ) : (
              <Button
                size="small"
                variant="outlined"
                onClick={props.onOpenManualFinding}
                sx={{
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontWeight: 600,
                  borderColor: 'divider',
                  color: 'text.secondary',
                }}
              >
                {t('Add manual finding')}
              </Button>
            )}
          </Box>
        ) : null}
      </Box>

      {hasGps && props.evidence && (
        <EvidenceGpsMapDialog
          open={mapDialogOpen}
          onClose={() => setMapDialogOpen(false)}
          fileName={props.evidence.fileName}
          latitude={Number(lat)}
          longitude={Number(lon)}
          captureTime={props.evidence.captureTime}
          locationDescription={props.evidence.locationDescription}
        />
      )}
    </Paper>
  );
}

/**
 * The only knowledge affordance left on a finding card: one small outlined button that asks the
 * Backend AI to write the note. Citations stay collapsed behind a muted toggle and render as single
 * compact chips, never as the old multi-paragraph cases/standards panel.
 */
function DraftNoteAction({
  finding,
  canDraft,
  isDrafting,
  result,
  onDraft,
}: {
  finding: Finding;
  canDraft: boolean;
  isDrafting: boolean;
  result: DraftFindingNoteResult | undefined;
  onDraft: ((finding: Finding) => void) | undefined;
}) {
  const { t } = useLocale();
  const [referencesOpen, setReferencesOpen] = useState(false);
  const citationCount =
    (result?.citedCases?.length ?? 0) + (result?.citedGuidelines?.length ?? 0);

  if (finding.status === 'CONFIRMED' || (!canDraft && citationCount === 0)) return null;

  return (
    <Box sx={{ mt: 0.5 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
        {canDraft && onDraft && (
          <Button
            size="small"
            variant="outlined"
            disabled={isDrafting}
            onClick={() => onDraft(finding)}
            sx={{
              minHeight: 28,
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.8rem',
            }}
          >
            {isDrafting ? (
              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                <CircularProgress size={14} />
                <span>{t('Drafting note…')}</span>
              </Stack>
            ) : (
              t('Draft note with AI')
            )}
          </Button>
        )}
        {citationCount > 0 && (
          <Button
            size="small"
            variant="text"
            aria-expanded={referencesOpen}
            onClick={() => setReferencesOpen((value) => !value)}
            sx={{
              minHeight: 28,
              textTransform: 'none',
              fontSize: '0.75rem',
              color: 'text.secondary',
            }}
          >
            {t('References')} ({citationCount})
          </Button>
        )}
      </Stack>
      {citationCount > 0 && referencesOpen && (
        <Stack
          direction="row"
          spacing={0.5}
          sx={{ mt: 0.5, alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}
        >
          {result?.citedCases?.map((item) => (
            <Chip
              key={`case-${item.id}`}
              size="small"
              variant="outlined"
              label={`${item.defectLabel} · ${Math.round(item.similarity * 100)}% match`}
              sx={{
                height: 22,
                fontSize: '0.7rem',
                '& .MuiChip-label': { px: 0.75 },
              }}
            />
          ))}
          {result?.citedGuidelines?.map((item) => (
            <Chip
              key={`guideline-${item.id}`}
              size="small"
              variant="outlined"
              label={`${item.standardCode} · ${Math.round(item.similarity * 100)}% match`}
              sx={{
                height: 22,
                fontSize: '0.7rem',
                '& .MuiChip-label': { px: 0.75 },
              }}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}
