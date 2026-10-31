import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import CloseRounded from '@mui/icons-material/CloseRounded';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import type {
  EvidenceItem,
  InspectionReport,
  Finding,
  ReinspectionVerificationItem,
} from '@/features/inspections/api/inspectionApi';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { inspectionApi } from '@/features/inspections/api/inspectionApi';
import { useLocale } from '@/shared/i18n/LocaleProvider';

export interface ReportDerivedSectionsProps {
  version: InspectionReport;
  findings: Finding[];
  evidenceList: EvidenceItem[];
  inspectionId: string;
  reinspectionVerifications?: ReinspectionVerificationItem[] | undefined;
  executiveSummary?: React.ReactNode;
  limitations?: React.ReactNode;
  conclusions?: React.ReactNode;
}

function formatDateTime(
  value: string | null | undefined,
  format: (input: Date | string | number, options?: Intl.DateTimeFormatOptions) => string,
  fallback: string,
): string {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return format(parsed);
}

function ReadOnlySection({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <Box component="section" sx={{ mb: 3 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.25 }}>
        <Typography component="h2" sx={{ fontSize: '0.9375rem', fontWeight: 700, color: 'text.primary' }}>
          {title}
        </Typography>
        {typeof count === 'number' && (
          <Chip size="small" label={count} sx={{ height: 20, fontSize: '0.75rem', fontWeight: 700 }} />
        )}
      </Stack>
      {children}
    </Box>
  );
}

function SummaryItem({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value?.trim()) return null;
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500, fontSize: '0.8125rem', wordBreak: 'break-word' }}>
        {value}
      </Typography>
    </Box>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  const { t } = useLocale();
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, py: 0.4, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.75rem', flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.primary', fontSize: '0.75rem', textAlign: 'right', wordBreak: 'break-word' }}>
        {value?.trim() ? value : <Box component="span" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>{t('Not supplied')}</Box>}
      </Typography>
    </Box>
  );
}

export function ReportDerivedSections({
  version,
  findings,
  evidenceList,
  inspectionId,
  reinspectionVerifications,
  executiveSummary,
  limitations,
  conclusions,
}: ReportDerivedSectionsProps) {
  const { t, formatDateTime: formatDateTimeValue } = useLocale();
  const [selectedModalEvidence, setSelectedModalEvidence] = useState<EvidenceItem | null>(null);

  const reportableFindings = findings.filter((finding) => finding.status === 'CONFIRMED');
  const context = version.reportContext;
  const droneSummary = [
    context?.assignedDrone?.manufacturer,
    context?.assignedDrone?.model,
    context?.assignedDrone?.serialNumber,
  ]
    .filter(Boolean)
    .join(' · ');

  const modalFindings = selectedModalEvidence
    ? reportableFindings.filter((finding) => finding.evidenceId === selectedModalEvidence.id)
    : [];

  const unlinkedFindings = reportableFindings.filter(
    (finding) => !evidenceList.some((item) => item.id === finding.evidenceId),
  );

  return (
    <Box>
      <ReadOnlySection title={t('Identification')}>
        <Box
          sx={{
            p: 1.75,
            borderRadius: '10px',
            bgcolor: 'action.hover',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
              gap: 1.5,
            }}
          >
            <SummaryItem
              label={t('Report reference')}
              value={`SDI-RPT-${version.id.slice(0, 8).toUpperCase()}-V${version.versionNo}`}
            />
            <SummaryItem
              label={t('Version / status')}
              value={`v${version.versionNo} · ${version.status}`}
            />
            <SummaryItem label={t('Organization')} value={context?.organizationName} />
            <SummaryItem
              label={t('Asset')}
              value={[context?.assetName, context?.assetCode].filter(Boolean).join(' · ')}
            />
            <SummaryItem label={t('Asset location')} value={context?.assetLocation} />
            <SummaryItem label={t('Asset category')} value={context?.assetCategory} />
            <SummaryItem label={t('Assigned Drone')} value={droneSummary} />
            {context?.findingsConfirmedAt && (
              <SummaryItem
                label={t('Findings confirmation')}
                value={formatDateTime(context.findingsConfirmedAt, formatDateTimeValue, '')}
              />
            )}
            {version.submittedAt && (
              <SummaryItem
                label={t('Submitted')}
                value={formatDateTime(version.submittedAt, formatDateTimeValue, '')}
              />
            )}
            {version.reviewedAt && (
              <SummaryItem
                label={t('Review decision')}
                value={formatDateTime(version.reviewedAt, formatDateTimeValue, '')}
              />
            )}
            {version.publishedAt && (
              <SummaryItem
                label={t('Published')}
                value={formatDateTime(version.publishedAt, formatDateTimeValue, '')}
              />
            )}
            {version.returnReason && (
              <SummaryItem label={t('Return rationale')} value={version.returnReason} />
            )}
          </Box>

          {context?.fieldSessions && context.fieldSessions.length > 0 && (
            <Stack spacing={1} sx={{ mt: 1.5, pt: 1.25, borderTop: '1px solid', borderColor: 'divider' }}>
              {context.fieldSessions.map((session) => (
                <Stack
                  key={session.id}
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={{ xs: 0.5, sm: 2 }}
                  sx={{ fontSize: '0.75rem', color: 'text.secondary', flexWrap: 'wrap' }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {t('Field session ·')} {session.status}
                  </Typography>
                  {session.startedAt && (
                    <Typography variant="caption">
                      {t('Started')}: {formatDateTime(session.startedAt, formatDateTimeValue, '')}
                    </Typography>
                  )}
                  {session.endedAt && (
                    <Typography variant="caption">
                      {t('Ended')}: {formatDateTime(session.endedAt, formatDateTimeValue, '')}
                    </Typography>
                  )}
                  {session.preFlightChecklistNote && (
                    <Typography variant="caption">
                      {t('Pre-flight checklist note')}: {session.preFlightChecklistNote}
                    </Typography>
                  )}
                  {session.outcomeNotes && (
                    <Typography variant="caption">
                      {t('Outcome notes')}: {session.outcomeNotes}
                    </Typography>
                  )}
                  {session.postponementReason && (
                    <Typography variant="caption">
                      {t('Postponement reason')}: {session.postponementReason}
                    </Typography>
                  )}
                  {session.abortReason && (
                    <Typography variant="caption">
                      {t('Abort reason')}: {session.abortReason}
                    </Typography>
                  )}
                </Stack>
              ))}
            </Stack>
          )}
        </Box>
      </ReadOnlySection>

      {executiveSummary}
      {limitations}
      {conclusions}

      {/* Target Defect Verifications (for Re-inspection) */}
      {reinspectionVerifications && reinspectionVerifications.length > 0 && (
        <ReadOnlySection
          title={t('Target defect verifications')}
          count={reinspectionVerifications.length}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
              gap: 1.5,
              mb: 3,
            }}
          >
            {reinspectionVerifications.map((item) => (
              <Box
                key={item.id}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '10px',
                  p: 1.5,
                  bgcolor: 'background.paper',
                }}
              >
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {item.sourceFindingCode ? `${item.sourceFindingCode} · ` : ''}
                    {item.sourceDefectLabel}
                  </Typography>
                  <Chip
                    size="small"
                    label={t(item.resolutionStatus)}
                    color={
                      item.resolutionStatus === 'RESOLVED'
                        ? 'success'
                        : item.resolutionStatus === 'UNRESOLVED'
                          ? 'error'
                          : 'warning'
                    }
                    sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }}
                  />
                </Stack>
                {item.sourceSeverity && (
                  <Field label={t('Original Severity')} value={item.sourceSeverity} />
                )}
                {item.inspectorNotes && (
                  <Field label={t('Inspector Notes')} value={item.inspectorNotes} />
                )}
                {item.newEvidenceId && (
                  <Box sx={{ mt: 1 }}>
                    <AuthenticatedImage
                      src={inspectionApi.evidenceContentUrl(inspectionId, item.newEvidenceId)}
                      alt="Verified Evidence"
                      maxHeight={140}
                      sx={{ borderRadius: '6px', border: '1px solid', borderColor: 'divider' }}
                    />
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        </ReadOnlySection>
      )}

      <ReadOnlySection title={t('Evidence register')} count={evidenceList.length}>
        {evidenceList.length === 0 && unlinkedFindings.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic', fontSize: '0.8125rem' }}>
            {t('No evidence was linked to this version.')}
          </Typography>
        ) : (
          <Box>
            {evidenceList.length > 0 && (
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                  {reportableFindings.length} {t('confirmed findings across')} {evidenceList.length} {t('captures')}
                </Typography>
              </Box>
            )}

            {evidenceList.length > 0 && (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                  gap: 2,
                }}
              >
                {evidenceList.map((item) => {
                  const linkedFindings = reportableFindings.filter((finding) => finding.evidenceId === item.id);

                  return (
                    <Box
                      key={item.id}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: '10px',
                        p: 1.5,
                        bgcolor: 'background.paper',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      {item.contentType.startsWith('image/') && (
                        <AuthenticatedImage
                          src={inspectionApi.evidenceContentUrl(inspectionId, item.id)}
                          alt={item.fileName}
                          maxHeight={160}
                          sx={{ borderRadius: '6px', border: '1px solid', borderColor: 'divider', mb: 1.25 }}
                        />
                      )}
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 650,
                          fontSize: '0.8125rem',
                          mb: 0.5,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={item.fileName}
                      >
                        {item.fileName}
                      </Typography>
                      <Field label={t('Asset location')} value={item.locationDescription} />
                      {item.captureTime && (
                        <Field
                          label={t('Capture time')}
                          value={formatDateTime(item.captureTime, formatDateTimeValue, '')}
                        />
                      )}
                      {item.latitude != null && item.longitude != null && (
                        <Field label="GPS" value={`${item.latitude}, ${item.longitude}`} />
                      )}

                      {/* Findings Preview Area */}
                      <Box
                        sx={{
                          mt: 1.25,
                          pt: 1,
                          borderTop: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Stack
                          direction="row"
                          spacing={0.75}
                          sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}
                        >
                          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                            {t('Findings preview')}
                          </Typography>
                          {linkedFindings.length > 0 && (
                            <Chip
                              size="small"
                              color="success"
                              variant="outlined"
                              label={`${linkedFindings.length} ${t('confirmed')}`}
                              sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }}
                            />
                          )}
                        </Stack>

                        {linkedFindings.length === 0 ? (
                          <Typography
                            variant="caption"
                            sx={{ color: 'text.disabled', fontStyle: 'italic', display: 'block', mb: 0.5 }}
                          >
                            {t('No confirmed findings')}
                          </Typography>
                        ) : (
                          <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5, mb: 0.75 }}>
                            {linkedFindings.map((finding) => (
                              <Chip
                                key={finding.id}
                                size="small"
                                label={`${finding.defectLabel} · ${finding.severity}`}
                                color={
                                  finding.severity === 'CRITICAL' || finding.severity === 'HIGH'
                                    ? 'error'
                                    : finding.severity === 'MEDIUM'
                                      ? 'warning'
                                      : 'default'
                                }
                                sx={{ height: 20, fontSize: '0.6875rem', fontWeight: 600 }}
                              />
                            ))}
                          </Stack>
                        )}

                        {/* Open modal link */}
                        {linkedFindings.length > 0 && (
                          <Box sx={{ mt: 0.5, display: 'flex', justifyContent: 'flex-start' }}>
                            <Button
                              size="small"
                              variant="text"
                              onClick={() => setSelectedModalEvidence(item)}
                              endIcon={<OpenInNewRounded sx={{ fontSize: '0.85rem !important' }} />}
                              sx={{
                                p: 0,
                                minWidth: 0,
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: 'primary.main',
                                textTransform: 'none',
                                '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
                              }}
                            >
                              {t('View finding details')}
                            </Button>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}

            {/* Unlinked Confirmed Findings (if evidenceList is empty or findings not assigned to evidence) */}
            {unlinkedFindings.length > 0 && (
              <Box sx={{ mt: 2, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: '10px' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  {t('Additional confirmed findings')} ({unlinkedFindings.length})
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                    gap: 1.5,
                  }}
                >
                  {unlinkedFindings.map((finding) => (
                    <Box
                      key={finding.id}
                      sx={{
                        p: 1.25,
                        borderRadius: '8px',
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                      }}
                    >
                      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mb: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.8125rem' }}>{finding.defectLabel}</Typography>
                        <Chip size="small" label={finding.severity} sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }} />
                        <Chip size="small" color="success" label={t('Inspector-confirmed')} sx={{ height: 18, fontSize: '0.65rem' }} />
                      </Stack>
                      <Typography variant="caption" sx={{ display: 'block', color: finding.technicalNotes?.trim() ? 'text.secondary' : 'text.disabled', fontStyle: finding.technicalNotes?.trim() ? 'normal' : 'italic' }}>
                        <b>{t('Technical notes')}:</b> {finding.technicalNotes?.trim() ? finding.technicalNotes : t('None')}
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block', color: finding.recommendedAction?.trim() ? 'text.secondary' : 'text.disabled', fontStyle: finding.recommendedAction?.trim() ? 'normal' : 'italic' }}>
                        <b>{t('Recommended action')}:</b> {finding.recommendedAction?.trim() ? finding.recommendedAction : t('None')}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        )}
      </ReadOnlySection>

      {/* Modal Dialog for Focused Finding Details */}
      <Dialog
        open={Boolean(selectedModalEvidence)}
        onClose={() => setSelectedModalEvidence(null)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '12px' } } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, wordBreak: 'break-word' }}>
              {selectedModalEvidence?.fileName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {modalFindings.length} {t('confirmed findings on this capture')}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setSelectedModalEvidence(null)} aria-label={t('Close')}>
            <CloseRounded fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2.5 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '280px 1fr' }, gap: 2.5, alignItems: 'start' }}>
            {selectedModalEvidence && selectedModalEvidence.contentType.startsWith('image/') && (
              <Box sx={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                <AuthenticatedImage
                  src={inspectionApi.evidenceContentUrl(inspectionId, selectedModalEvidence.id)}
                  alt={selectedModalEvidence.fileName}
                  maxHeight={260}
                />
              </Box>
            )}
            <Stack spacing={1.5}>
              <Box sx={{ p: 1.5, borderRadius: '8px', bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                  {t('Asset location')}: {selectedModalEvidence?.locationDescription || t('Not supplied')}
                </Typography>
                {selectedModalEvidence?.captureTime && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                    {t('Capture time')}: {formatDateTime(selectedModalEvidence.captureTime, formatDateTimeValue, '')}
                  </Typography>
                )}
              </Box>

              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {t('Findings details')}:
              </Typography>

              <Stack spacing={1.25}>
                {modalFindings.map((finding) => (
                  <Box
                    key={finding.id}
                    sx={{
                      p: 1.5,
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'background.paper',
                    }}
                  >
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.75, flexWrap: 'wrap', gap: 0.5 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>
                        {finding.defectLabel}
                      </Typography>
                      <Chip size="small" label={finding.severity} sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }} />
                      {finding.status === 'CONFIRMED' && (
                        <Chip
                          size="small"
                          color="success"
                          label={t('Inspector-confirmed')}
                          sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
                        />
                      )}
                    </Stack>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        color: finding.technicalNotes?.trim() ? 'text.secondary' : 'text.disabled',
                        fontStyle: finding.technicalNotes?.trim() ? 'normal' : 'italic',
                        mt: 0.5,
                        fontSize: '0.75rem',
                      }}
                    >
                      <b>{t('Technical notes')}:</b>{' '}
                      {finding.technicalNotes?.trim() ? finding.technicalNotes : t('None')}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        color: finding.recommendedAction?.trim() ? 'text.secondary' : 'text.disabled',
                        fontStyle: finding.recommendedAction?.trim() ? 'normal' : 'italic',
                        mt: 0.25,
                        fontSize: '0.75rem',
                      }}
                    >
                      <b>{t('Recommended action')}:</b>{' '}
                      {finding.recommendedAction?.trim() ? finding.recommendedAction : t('None')}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, py: 1.5 }}>
          <Button onClick={() => setSelectedModalEvidence(null)} sx={{ textTransform: 'none', fontWeight: 600 }}>
            {t('Close')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
