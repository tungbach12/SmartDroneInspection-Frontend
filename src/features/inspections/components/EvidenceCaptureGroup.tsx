import { useState, type FormEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { AiMotionFigure } from '../components/AiMotionFigure';
import { inspectionApi } from '../api/inspectionApi';
import type { EvidenceItem, Finding, FindingSeverity } from '../api/inspectionApi';

const SEVERITIES: FindingSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

interface BoundingBoxCoords {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
}

function parseBoundingBox(raw?: string): BoundingBoxCoords | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed.xMin === 'number' &&
      typeof parsed.yMin === 'number' &&
      typeof parsed.xMax === 'number' &&
      typeof parsed.yMax === 'number' &&
      parsed.xMin >= 0 && parsed.yMin >= 0 &&
      parsed.xMax <= 1 && parsed.yMax <= 1 &&
      parsed.xMin < parsed.xMax && parsed.yMin < parsed.yMax
    ) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

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
  revisedRecommendedActions: Record<string, string>;
  onRecommendedActionsChange: (findingId: string, val: string) => void;
  onConfirmFinding: (finding: Finding) => void;
  onDeleteFinding: (findingId: string) => void;
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
  isCreateManualPending: boolean;
  createManualError: unknown;
}

export function EvidenceCaptureGroup(props: EvidenceCaptureGroupProps) {
  const { t } = useLocale();
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [hoveredCandidateId, setHoveredCandidateId] = useState<string | null>(null);

  const hasFindings = props.findings.length > 0;
  const isImage = props.evidence?.contentType.startsWith('image/');

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: '16px',
        borderColor: '#e2e8f0',
        bgcolor: '#ffffff',
        boxShadow: '0 2px 8px -2px rgba(15, 23, 42, 0.05)',
        overflow: 'hidden',
      }}
    >
      {/* Group Header */}
      <Box
        sx={{
          p: 2,
          bgcolor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'flex-start', md: 'center' },
          justifyContent: 'space-between',
          gap: 1.5,
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0f172a' }}>
            📸 {props.evidence?.fileName ?? `Evidence ${props.evidenceId.slice(0, 8)}…`}
          </Typography>
          <Chip
            size="small"
            color={hasFindings ? 'primary' : 'default'}
            variant={hasFindings ? 'filled' : 'outlined'}
            label={
              hasFindings
                ? `${props.findings.length} ${props.findings.length === 1 ? 'defect finding' : 'defect findings'}`
                : t('No findings yet')
            }
            sx={{ fontWeight: 600, fontSize: '11px' }}
          />
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
              sx={{ fontWeight: 600, fontSize: '11px' }}
            />
          )}
          {isImage && props.isInspector && props.analysisUnlocked && (
            <Button
              size="small"
              variant="outlined"
              startIcon={props.isAnalysing ? undefined : <AutoAwesomeOutlined sx={{ fontSize: 16 }} />}
              disabled={props.isAnalysing}
              onClick={() => props.onAnalyze(props.evidenceId, props.isAnalysed)}
              sx={{
                textTransform: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.8125rem',
                bgcolor: '#ffffff',
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
              label={t('Asset location description for this photo')}
              placeholder={t('e.g., Main span Pier T1, downstream face, 12m elevation')}
              value={props.locationDraft}
              onChange={(e) => props.onLocationChange(e.target.value)}
              onBlur={props.onLocationBlur}
              helperText={
                props.isReportLocked
                  ? t('Location description is locked while drafting or reviewing report.')
                  : props.locationError ??
                    t('Applies as the contextual inspection zone for all defects identified on this photo.')
              }
              error={Boolean(props.locationError)}
              slotProps={{
                htmlInput: { maxLength: 1000 },
                input: { sx: { borderRadius: '8px', bgcolor: props.isReportLocked ? '#f8fafc' : '#fbfcfd' } },
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
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 0.75 }}
                >
                  {t('Defect photo capture ·')} {props.evidence.fileName}
                </Typography>
                <Box sx={{ position: 'relative', width: '100%', lineHeight: 0 }}>
                  <AuthenticatedImage
                    src={inspectionApi.evidenceContentUrl(props.inspectionId, props.evidence.id)}
                    alt={`Inspection evidence ${props.evidence.fileName}`}
                    maxHeight={420}
                    sx={{ borderRadius: '6px', width: '100%' }}
                  />
                  {showBoundingBoxes &&
                    props.findings.map((finding, index) => {
                      const box = parseBoundingBox(finding.boundingBox ?? undefined);
                      if (!box) return null;
                      const active = hoveredCandidateId === finding.id;
                      const color = ['#d32f2f', '#1976d2', '#2e7d32', '#ed6c02'][index % 4];
                      return (
                        <Box
                          key={finding.id}
                          aria-label={`${finding.defectLabel}, ${Math.round((finding.confidence ?? 0) * 100)} percent confidence`}
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
                              content: `"${finding.defectLabel} · ${Math.round((finding.confidence ?? 0) * 100)}%"`,
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
              </Box>
            )}

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
                  <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: '#475569' }}>
                    {t('Show detected regions')}
                  </Typography>
                }
              />
            </Box>
          </Box>

          {/* Right Column: Findings Cards */}
          <Stack spacing={2}>
            {!hasFindings ? (
              <Paper
                variant="outlined"
                sx={{
                  p: 3,
                  textAlign: 'center',
                  borderRadius: '12px',
                  borderStyle: 'dashed',
                  bgcolor: '#f8fafc',
                }}
              >
                <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
                  {t('No defects identified on this capture.')}
                </Typography>
                <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mt: 0.5 }}>
                  {t('Click "Analyze image" above for AI assistance, or add a manual finding below.')}
                </Typography>
              </Paper>
            ) : (
              props.findings.map((finding) => {
                const box = parseBoundingBox(finding.boundingBox ?? undefined);
                const confirmed = finding.status === 'CONFIRMED';
                const isEditing = props.editingCandidateId === finding.id;

                return (
                  <Box
                    key={finding.id}
                    onMouseEnter={() => setHoveredCandidateId(finding.id)}
                    onMouseLeave={() => setHoveredCandidateId(null)}
                    onFocus={() => setHoveredCandidateId(finding.id)}
                    onBlur={() => setHoveredCandidateId(null)}
                  >
                    <Card
                      variant="outlined"
                      sx={{
                        borderRadius: '12px',
                        borderColor: isEditing
                          ? 'primary.main'
                          : hoveredCandidateId === finding.id
                            ? 'primary.light'
                            : '#e2e8f0',
                        bgcolor: isEditing ? '#f8fafc' : '#ffffff',
                        boxShadow:
                          hoveredCandidateId === finding.id
                            ? '0 4px 12px rgba(15, 23, 42, 0.08)'
                            : '0 1px 3px rgba(0,0,0,0.02)',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
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
                                sx={{ textTransform: 'none', color: '#64748b' }}
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
                                  input: { sx: { borderRadius: '8px', bgcolor: '#fff' } },
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
                                  input: { sx: { borderRadius: '8px', bgcolor: '#fff' } },
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
                              label={t('Technical notes')}
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
                                input: { sx: { borderRadius: '8px', bgcolor: '#fff' } },
                              }}
                              required
                            />

                            <TextField
                              size="small"
                              label={t('Recommended action')}
                              multiline
                              minRows={2}
                              value={
                                props.revisedRecommendedActions[finding.id] ??
                                finding.recommendedAction ??
                                ''
                              }
                              onChange={(e) =>
                                props.onRecommendedActionsChange(finding.id, e.target.value)
                              }
                              slotProps={{
                                htmlInput: { maxLength: 4000 },
                                input: { sx: { borderRadius: '8px', bgcolor: '#fff' } },
                              }}
                            />

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
                                sx={{ fontWeight: 700, bgcolor: '#f1f5f9', color: '#334155' }}
                              />
                              <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0f172a' }}>
                                {finding.defectLabel}
                              </Typography>
                              {finding.confidence !== null && (
                                <Chip
                                  size="small"
                                  label={`${Math.round(finding.confidence * 100)}% confidence`}
                                  sx={{ fontSize: '11px', color: '#475569' }}
                                />
                              )}
                              <Chip
                                size="small"
                                color={confirmed ? 'success' : 'warning'}
                                label={confirmed ? t('Confirmed') : t('Awaiting review')}
                                sx={{ fontWeight: 600, fontSize: '11px' }}
                              />
                              {box && (
                                <Chip
                                  size="small"
                                  variant="outlined"
                                  label={`[${Math.round(box.xMin * 100)}%, ${Math.round(box.yMin * 100)}%] → [${Math.round(box.xMax * 100)}%, ${Math.round(box.yMax * 100)}%]`}
                                  sx={{ fontFamily: 'monospace', fontSize: '10px', color: '#64748b' }}
                                />
                              )}
                            </Stack>

                            <Typography variant="body2" sx={{ color: '#334155', lineHeight: 1.5 }}>
                              {finding.technicalNotes}
                            </Typography>
                            {finding.recommendedAction && (
                              <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.8125rem' }}>
                                <strong style={{ color: '#0f172a' }}>{t('Recommended action:')}</strong>{' '}
                                {finding.recommendedAction}
                              </Typography>
                            )}
                            {finding.modelName && (
                              <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                                Detected via {finding.modelName}
                              </Typography>
                            )}

                            {/* Card Footer Actions */}
                            {finding.isDeleted ? (
                              <Box sx={{ pt: 1, borderTop: '1px solid #f1f5f9' }}>
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
                              <Box sx={{ pt: 1, borderTop: '1px solid #f1f5f9' }}>
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
                                      input: { sx: { borderRadius: '8px', fontSize: '0.8125rem' } },
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
                                        color: '#475569',
                                        borderColor: '#cbd5e1',
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
                              <Box sx={{ pt: 1, borderTop: '1px solid #f1f5f9' }}>
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
                                    <Chip
                                      size="small"
                                      color="success"
                                      label={t('Inspector confirmed')}
                                      sx={{ fontWeight: 600 }}
                                    />
                                  </Stack>

                                  {props.isInspector && !props.isReportLocked && (
                                    <Stack direction="row" spacing={0.5}>
                                      <Button
                                        size="small"
                                        variant="text"
                                        onClick={() => props.onStartEdit(finding)}
                                        sx={{ textTransform: 'none', borderRadius: '6px' }}
                                      >
                                        {t('Edit / Change defect')}
                                      </Button>
                                      <Button
                                        size="small"
                                        color="error"
                                        disabled={props.isDeletePending}
                                        onClick={() => props.onDeleteFinding(finding.id)}
                                        sx={{ textTransform: 'none', borderRadius: '6px' }}
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
                      </CardContent>
                    </Card>
                  </Box>
                );
              })
            )}
          </Stack>
        </Box>

        {/* Manual Finding Trigger */}
        {props.isInspector && !props.isReportLocked && props.evidence ? (
          <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px solid #f1f5f9' }}>
            {props.manualFindingOpen ? (
              <Box
                component="form"
                onSubmit={props.onSubmitManualFinding}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 1.5,
                  p: 2,
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  bgcolor: '#f8fafc',
                }}
              >
                <Stack
                  direction="row"
                  sx={{ alignItems: 'center', justifyContent: 'space-between', gridColumn: '1 / -1' }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {t('Add manual defect for')} {props.evidence.fileName}
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
                  label={t('Technical notes')}
                  required
                  multiline
                  minRows={2}
                  size="small"
                  sx={{ gridColumn: '1 / -1' }}
                  slotProps={{ htmlInput: { maxLength: 4000 } }}
                />
                <TextField
                  name="recommendedAction"
                  label={t('Recommended action')}
                  multiline
                  minRows={2}
                  size="small"
                  sx={{ gridColumn: '1 / -1' }}
                  slotProps={{ htmlInput: { maxLength: 4000 } }}
                />
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
                  borderColor: '#cbd5e1',
                  color: '#475569',
                }}
              >
                {t('+ Add manual finding for')} {props.evidence.fileName}
              </Button>
            )}
          </Box>
        ) : null}
      </Box>
    </Paper>
  );
}
