import { useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import PlaylistAddCheckRounded from '@mui/icons-material/PlaylistAddCheckRounded';
import { useIsDarkMode } from '@/app/layouts/ColorModeContext';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import FlightTakeoffRounded from '@mui/icons-material/FlightTakeoffRounded';
import UploadFile from '@mui/icons-material/UploadFile';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { MutationProblemAlert } from '@/shared/ui/MutationProblemAlert';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryState } from '@/shared/ui/QueryState';
import { StatusChip } from '@/shared/ui/StatusChip';
import {
  useFieldSessionOutcome,
  useFieldSessions,
  useInspection,
  useStartFieldSession,
  useUploadFlightPermit,
} from '../hooks/useInspections';
import type { FieldSession } from '../api/fieldSessionApi';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { AirspaceNoFlyMap } from '@/shared/airspace/AirspaceNoFlyMap';

/**
 * MF2-09 to MF2-12: the Inspector's field session for one inspection.
 *
 * Starting a session records that the software agreed the paperwork and the pre-flight checklist
 * were in order. It does not arm the aircraft and the startedAt instant is the software's session
 * start, not hardware flight time.
 */
export default function FieldSessionPage() {
  const { formatDateTime, t } = useLocale();
  const isDark = useIsDarkMode();
  const navigate = useNavigate();
  const { inspectionId = '' } = useParams();
  const inspectionQuery = useInspection(inspectionId);
  const inspection = inspectionQuery.data;
  const sessions = useFieldSessions(inspectionId);
  const startSession = useStartFieldSession(inspectionId);
  const outcome = useFieldSessionOutcome(inspectionId);
  const uploadPermit = useUploadFlightPermit(inspectionId);

  const [permitFile, setPermitFile] = useState<File | null>(null);
  const [startOpen, setStartOpen] = useState(false);
  const [preFlightNote, setPreFlightNote] = useState('');
  const [outcomeTarget, setOutcomeTarget] = useState<{
    session: FieldSession;
    kind: 'postpone' | 'abort' | 'complete';
  } | null>(null);
  const [outcomeReason, setOutcomeReason] = useState('');

  // Checklist verification state
  const rawItems = inspection?.inspectionItems ?? [];
  const checklistItems = rawItems.length > 0 ? rawItems : [
    'Kiểm tra tình trạng thân vỏ & cánh quạt Drone',
    'Kiểm tra dung lượng Pin & hệ thống truyền tín hiệu',
    'Kiểm tra không phận & bán kính an toàn khu vực bay',
    'Khảo sát các điểm xung yếu của công trình theo kế hoạch'
  ];

  const storageKey = `inspection_checked_items_${inspectionId}`;
  const confirmedKey = `inspection_checklist_confirmed_${inspectionId}`;

  const [checkedMap, setCheckedMap] = useState<Record<number, boolean>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [checklistConfirmed, setChecklistConfirmed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(confirmedKey) === 'true';
    } catch {
      return false;
    }
  });

  const allItemsChecked = checklistItems.every((_, idx) => Boolean(checkedMap[idx]));

  const toggleCheckItem = (idx: number) => {
    const next = { ...checkedMap, [idx]: !checkedMap[idx] };
    setCheckedMap(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {}
  };

  const handleConfirmAndProceed = () => {
    try {
      localStorage.setItem(confirmedKey, 'true');
    } catch {}
    setChecklistConfirmed(true);
    navigate('../evidence');
  };

  const items = sessions.data ?? [];
  const openSession = items.find(
    (session) => session.status === 'IN_PROGRESS' || session.status === 'PLANNED',
  );

  const isAssigned = inspection?.status === 'ASSIGNED';
  const canStart = !isAssigned;

  return (
    <Stack spacing={2}>
      <Button
        component={RouterLink}
        to=".."
        startIcon={<ArrowBackRounded />}
        sx={{
          alignSelf: 'flex-start',
          color: 'text.secondary',
          fontWeight: 500,
          fontSize: '0.875rem',
          textTransform: 'none',
          borderRadius: '8px',
        }}
      >
        {t('Back to inspection')}
      </Button>

      <PageHeader
        title={t('Field session')}
        subtitle={t('Record the on-site work: the pre-flight checklist, the session itself, and why it stopped.')}
      />

      <AirspaceNoFlyMap
        assetName={inspection?.assetName}
        locationText={inspection?.locationText}
        latitude={inspection?.assetLatitude}
        longitude={inspection?.assetLongitude}
      />

      {isAssigned && (
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 2, sm: 2.5 },
            borderRadius: '16px',
            bgcolor: isDark ? 'rgba(245, 158, 11, 0.12)' : '#fffbeb',
            borderColor: isDark ? 'rgba(245, 158, 11, 0.35)' : '#fde68a',
          }}
        >
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <FlightTakeoffRounded sx={{ color: isDark ? '#fbbf24' : '#d97706' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: isDark ? '#fde68a' : '#92400e' }}>
                {t('Flight Permit Required')}
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ color: isDark ? '#fef3c7' : '#78350f' }}>
              {t('Upload an approved flight permit to authorize field flight operations. Uploading unlocks session startup and moves inspection to Ready for Flight.')}
            </Typography>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<UploadFile />}
                sx={{ bgcolor: 'background.paper' }}
              >
                {permitFile ? permitFile.name : t('Choose permit file')}
                <input
                  type="file"
                  hidden
                  accept=".pdf,image/png,image/jpeg,image/webp"
                  onChange={(e) => setPermitFile(e.target.files?.[0] ?? null)}
                />
              </Button>
              <LoadingButton
                variant="contained"
                disabled={!permitFile}
                loading={uploadPermit.isPending}
                onClick={() => {
                  if (permitFile) {
                    uploadPermit.mutate(permitFile, {
                      onSuccess: () => setPermitFile(null),
                    });
                  }
                }}
              >
                {t('Upload flight permit')}
              </LoadingButton>
            </Stack>
            <MutationProblemAlert
              error={uploadPermit.error}
              isError={uploadPermit.isError}
              fallbackMessage={t('Could not upload flight permit.')}
            />
          </Stack>
        </Paper>
      )}

      {inspection?.flightPermitFileName && (
        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            borderRadius: '12px',
            bgcolor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#f0fdf4',
            borderColor: isDark ? 'rgba(16, 185, 129, 0.35)' : '#bbf7d0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Typography variant="body2" sx={{ color: isDark ? '#6ee7b7' : '#166534', fontWeight: 600 }}>
            {t('Active Flight Permit:')} {inspection.flightPermitFileName}
          </Typography>
          {inspection.flightPermitUploadedAt && (
            <Typography variant="caption" sx={{ color: isDark ? '#a7f3d0' : '#15803d' }}>
              {t('Uploaded')} {formatDateTime(new Date(inspection.flightPermitUploadedAt))}
            </Typography>
          )}
        </Paper>
      )}

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: '16px' }}>
        <Stack spacing={2}>
          <Stack
            direction="row"
            spacing={1.5}
            sx={{ alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <FlightTakeoffRounded color="primary" />
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  {t('Sessions')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('A session starts only after the pre-flight checklist is recorded and readiness holds.')}
                </Typography>
              </Box>
            </Stack>
            <LoadingButton
              size="small"
              variant="contained"
              loading={startSession.isPending}
              disabled={Boolean(openSession) || !canStart}
              onClick={() => setStartOpen(true)}
            >
              {openSession
                ? t('Session already open')
                : !canStart
                  ? t('Flight permit required')
                  : t('Start session')}
            </LoadingButton>
          </Stack>

          <MutationProblemAlert
            error={startSession.error}
            isError={startSession.isError}
            fallbackMessage={t('Could not start the field session.')}
          />
          <MutationProblemAlert
            error={outcome.error}
            isError={outcome.isError}
            fallbackMessage={t('Could not record the session outcome.')}
          />

          <QueryState
            isLoading={sessions.isLoading}
            error={sessions.error}
            onRetry={() => void sessions.refetch()}
            isEmpty={items.length === 0}
            loadingLabel={t('Loading field sessions…')}
            empty={
              <Typography variant="body2" color="text.secondary">
                {t('No field session yet. Complete the pre-flight checklist on site, then start one.')}
              </Typography>
            }
          >
            {null}
          </QueryState>

          {/* Dedicated Interactive Checkpoints / Checklist Section */}
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderRadius: '14px',
              bgcolor: isDark ? 'rgba(30, 41, 59, 0.4)' : '#f8fafc',
              borderColor: isDark ? 'rgba(99, 102, 241, 0.25)' : '#e2e8f0',
            }}
          >
            <Stack spacing={2}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                  <PlaylistAddCheckRounded color="primary" sx={{ fontSize: 28 }} />
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      {t('Asset Inspection Checkpoints & Pre-Flight Checklist')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t('Inspectors must verify and mark all structural checkpoints before completing Step 1 and proceeding to Step 2 (Evidence Intake).')}
                    </Typography>
                  </Box>
                </Stack>
                {checklistConfirmed ? (
                  <Chip
                    icon={<CheckCircleRounded />}
                    label={t('Checklist Confirmed & Verified')}
                    color="success"
                    variant="filled"
                    sx={{ fontWeight: 700 }}
                  />
                ) : (
                  <Chip
                    label={`${Object.values(checkedMap).filter(Boolean).length} / ${checklistItems.length} ${t('Checked')}`}
                    color={allItemsChecked ? 'primary' : 'default'}
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                  />
                )}
              </Stack>

              <Divider />

              <Stack spacing={1}>
                {checklistItems.map((item, idx) => {
                  const isChecked = Boolean(checkedMap[idx]);
                  return (
                    <Box
                      key={idx}
                      onClick={() => !checklistConfirmed && toggleCheckItem(idx)}
                      sx={{
                        p: 1.25,
                        px: 1.5,
                        borderRadius: 1.5,
                        border: '1px solid',
                        borderColor: isChecked
                          ? isDark ? 'rgba(16, 185, 129, 0.4)' : '#86efac'
                          : 'divider',
                        bgcolor: isChecked
                          ? isDark ? 'rgba(16, 185, 129, 0.1)' : '#f0fdf4'
                          : 'background.paper',
                        cursor: checklistConfirmed ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: checklistConfirmed ? undefined : isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9',
                        },
                      }}
                    >
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                        <Checkbox
                          checked={isChecked}
                          disabled={checklistConfirmed}
                          onChange={() => toggleCheckItem(idx)}
                          color="success"
                          sx={{ p: 0.5 }}
                        />
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: isChecked ? 600 : 500,
                            color: isChecked ? (isDark ? '#6ee7b7' : '#166534') : 'text.primary',
                            textDecoration: isChecked && checklistConfirmed ? 'none' : 'none',
                          }}
                        >
                          {idx + 1}. {item}
                        </Typography>
                      </Stack>
                      <Chip
                        label={isChecked ? t('Verified') : t('Pending')}
                        size="small"
                        color={isChecked ? 'success' : 'default'}
                        variant={isChecked ? 'filled' : 'outlined'}
                        sx={{ height: 22, fontSize: '0.75rem', fontWeight: 600 }}
                      />
                    </Box>
                  );
                })}
              </Stack>

              <Box sx={{ pt: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
                {!checklistConfirmed ? (
                  <Button
                    variant="contained"
                    color="primary"
                    size="medium"
                    endIcon={<ArrowForwardRounded />}
                    disabled={!allItemsChecked}
                    onClick={handleConfirmAndProceed}
                    sx={{ fontWeight: 700, px: 2.5 }}
                  >
                    {t('Confirm Checklist Done & Proceed to Step 2 (Upload Evidence)')}
                  </Button>
                ) : (
                  <Button
                    variant="outlined"
                    color="primary"
                    size="medium"
                    endIcon={<ArrowForwardRounded />}
                    onClick={() => navigate('../evidence')}
                    sx={{ fontWeight: 700 }}
                  >
                    {t('Go to Step 2 (Upload Evidence)')}
                  </Button>
                )}
              </Box>
            </Stack>
          </Paper>

          {items.length > 0 ? (
            <Stack spacing={1.5}>
              {items.map((session) => (
                <Box
                  key={session.id}
                  sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}
                >
                  <Stack
                    direction="row"
                    spacing={1.5}
                    sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                        {session.startedAt
                          ? `${t('Started')} ${formatDateTime(new Date(session.startedAt))}`
                          : t('Not started')}
                      </Typography>
                      {session.endedAt ? (
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {t('Ended')} {formatDateTime(new Date(session.endedAt))}
                        </Typography>
                      ) : null}
                    </Box>
                    <StatusChip status={session.status} />
                  </Stack>

                  {session.postponementReason ? (
                    <Typography variant="caption" sx={{ color: 'warning.main', display: 'block', mt: 0.5 }}>
                      {t('Postponed:')} {session.postponementReason}
                    </Typography>
                  ) : null}
                  {session.abortReason ? (
                    <Typography variant="caption" sx={{ color: 'error.main', display: 'block', mt: 0.5 }}>
                      {t('Aborted:')} {session.abortReason}
                    </Typography>
                  ) : null}
                  {session.status === 'FIELD_COMPLETED' && session.outcomeNotes ? (
                    <Typography variant="caption" sx={{ color: 'success.main', display: 'block', mt: 0.5 }}>
                      {t('Outcome notes:')} {session.outcomeNotes}
                    </Typography>
                  ) : null}

                  {session.status === 'IN_PROGRESS' ? (
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        onClick={() => {
                          setOutcomeReason('');
                          setOutcomeTarget({ session, kind: 'complete' });
                        }}
                      >
                        {t('Complete session')}
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          setOutcomeReason('');
                          setOutcomeTarget({ session, kind: 'postpone' });
                        }}
                      >
                        {t('Postpone')}
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() => {
                          setOutcomeReason('');
                          setOutcomeTarget({ session, kind: 'abort' });
                        }}
                      >
                        {t('Abort')}
                      </Button>
                    </Stack>
                  ) : null}
                </Box>
              ))}
            </Stack>
          ) : null}

          <Alert severity="info">
            {t("Starting a session records the software's agreement that the paperwork and the pre-flight checklist were in order. It does not arm the aircraft, and the recorded start time is not hardware flight time.")}
          </Alert>
        </Stack>
      </Paper>

      <Dialog open={startOpen} onClose={() => setStartOpen(false)} fullWidth maxWidth="sm">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            startSession.mutate(preFlightNote.trim(), {
              onSuccess: () => {
                setStartOpen(false);
                setPreFlightNote('');
              },
            });
          }}
        >
          <DialogTitle sx={{ fontWeight: 700 }}>{t('Start the field session')}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <MutationProblemAlert
                error={startSession.error}
                isError={startSession.isError}
                fallbackMessage={t('Could not start the field session.')}
              />
              <TextField
                label={t('Pre-flight checklist note')}
                required
                multiline
                minRows={4}
                value={preFlightNote}
                onChange={(event) => setPreFlightNote(event.target.value)}
                helperText={t('Record what you checked on site: the assigned drone, its condition, the site access and the weather.')}
              />
              <Alert severity="warning">
                {t('This note is your own record of the check. It is stored with the session and read by the reviewer.')}
              </Alert>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setStartOpen(false)}>{t('Cancel')}</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={!preFlightNote.trim()}
            >
              {t('Start session')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(outcomeTarget)}
        onClose={() => setOutcomeTarget(null)}
        fullWidth maxWidth="sm"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!outcomeTarget) return;
            outcome.mutate(
              {
                sessionId: outcomeTarget.session.id,
                outcome: outcomeTarget.kind,
                reason: outcomeReason.trim(),
              },
              { onSuccess: () => setOutcomeTarget(null) },
            );
          }}
        >
          <DialogTitle sx={{ fontWeight: 700 }}>
            {outcomeTarget?.kind === 'abort'
              ? t('Abort the session')
              : outcomeTarget?.kind === 'complete'
                ? t('Complete the session')
                : t('Postpone the session')}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <MutationProblemAlert
                error={outcome.error}
                isError={outcome.isError}
                fallbackMessage={t('Could not record the session outcome.')}
              />
              <TextField
                label={outcomeTarget?.kind === 'complete' ? t('Outcome notes') : t('Reason')}
                required
                multiline
                minRows={3}
                value={outcomeReason}
                onChange={(event) => setOutcomeReason(event.target.value)}
                helperText={
                  outcomeTarget?.kind === 'abort'
                    ? t('Why this session cannot continue and will not resume under this record.')
                    : outcomeTarget?.kind === 'complete'
                      ? t('Summarize the on-site coverage and any field observations recorded during this session.')
                      : t('Why the work stopped for now. The inspection stays startable.')
                }
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOutcomeTarget(null)}>{t('Cancel')}</Button>
            <Button
              type="submit"
              variant="contained"
              color={
                outcomeTarget?.kind === 'abort'
                  ? 'error'
                  : outcomeTarget?.kind === 'complete'
                    ? 'success'
                    : 'primary'
              }
              disabled={!outcomeReason.trim()}
            >
              {outcomeTarget?.kind === 'abort'
                ? t('Abort session')
                : outcomeTarget?.kind === 'complete'
                  ? t('Complete session')
                  : t('Postpone session')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Stack>
  );
}
