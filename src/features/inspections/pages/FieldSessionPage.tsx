import { useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import FlightTakeoffRounded from '@mui/icons-material/FlightTakeoffRounded';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { MutationProblemAlert } from '@/shared/ui/MutationProblemAlert';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryState } from '@/shared/ui/QueryState';
import { StatusChip } from '@/shared/ui/StatusChip';
import {
  useFieldSessionOutcome,
  useFieldSessions,
  useStartFieldSession,
} from '../hooks/useInspections';
import type { FieldSession } from '../api/fieldSessionApi';
import { useLocale } from '@/shared/i18n/LocaleProvider';

/**
 * MF2-09 to MF2-12: the Inspector's field session for one inspection.
 *
 * Starting a session records that the software agreed the paperwork and the pre-flight checklist
 * were in order. It does not arm the aircraft and the startedAt instant is the software's session
 * start, not hardware flight time.
 */
export default function FieldSessionPage() {
  const { formatDateTime, t } = useLocale();
  const { inspectionId = '' } = useParams();
  const sessions = useFieldSessions(inspectionId);
  const startSession = useStartFieldSession(inspectionId);
  const outcome = useFieldSessionOutcome(inspectionId);

  const [startOpen, setStartOpen] = useState(false);
  const [preFlightNote, setPreFlightNote] = useState('');
  const [outcomeTarget, setOutcomeTarget] = useState<{
    session: FieldSession;
    kind: 'postpone' | 'abort';
  } | null>(null);
  const [outcomeReason, setOutcomeReason] = useState('');

  const items = sessions.data ?? [];
  const openSession = items.find(
    (session) => session.status === 'IN_PROGRESS' || session.status === 'PLANNED',
  );

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
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#101828' }}>
                  {t('Sessions')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  A session starts only after the pre-flight checklist is recorded and readiness
                  holds.
                </Typography>
              </Box>
            </Stack>
            <LoadingButton
              size="small"
              variant="contained"
              loading={startSession.isPending}
              disabled={Boolean(openSession)}
              onClick={() => setStartOpen(true)}
            >
              {openSession ? 'Session already open' : 'Start session'}
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

          {items.length > 0 ? (
            <Stack spacing={1.5}>
              {items.map((session) => (
                <Box
                  key={session.id}
                  sx={{ p: 1.5, border: '1px solid #e2e8f0', borderRadius: 1.5 }}
                >
                  <Stack
                    direction="row"
                    spacing={1.5}
                    sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#101828' }}>
                        {session.startedAt
                          ? `Started ${formatDateTime(new Date(session.startedAt))}`
                          : 'Not started'}
                      </Typography>
                      {session.endedAt ? (
                        <Typography variant="caption" sx={{ color: '#667085' }}>
                          {t('Ended')} {formatDateTime(new Date(session.endedAt))}
                        </Typography>
                      ) : null}
                    </Box>
                    <StatusChip status={session.status} />
                  </Stack>

                  {session.postponementReason ? (
                    <Typography variant="caption" sx={{ color: '#b54708', display: 'block', mt: 0.5 }}>
                      {t('Postponed:')} {session.postponementReason}
                    </Typography>
                  ) : null}
                  {session.abortReason ? (
                    <Typography variant="caption" sx={{ color: '#b42318', display: 'block', mt: 0.5 }}>
                      {t('Aborted:')} {session.abortReason}
                    </Typography>
                  ) : null}

                  {session.status === 'IN_PROGRESS' ? (
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
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
            Starting a session records the software's agreement that the paperwork and the
            pre-flight checklist were in order. It does not arm the aircraft, and the recorded start
            time is not hardware flight time.
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
                This note is your own record of the check. It is stored with the session and read by
                the reviewer.
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
            {outcomeTarget?.kind === 'abort' ? 'Abort the session' : 'Postpone the session'}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <MutationProblemAlert
                error={outcome.error}
                isError={outcome.isError}
                fallbackMessage={t('Could not record the session outcome.')}
              />
              <TextField
                label={t('Reason')}
                required
                multiline
                minRows={3}
                value={outcomeReason}
                onChange={(event) => setOutcomeReason(event.target.value)}
                helperText={
                  outcomeTarget?.kind === 'abort'
                    ? 'Why this session cannot continue and will not resume under this record.'
                    : 'Why the work stopped for now. The inspection stays startable.'
                }
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOutcomeTarget(null)}>{t('Cancel')}</Button>
            <Button
              type="submit"
              variant="contained"
              color={outcomeTarget?.kind === 'abort' ? 'error' : 'primary'}
              disabled={!outcomeReason.trim()}
            >
              {outcomeTarget?.kind === 'abort' ? 'Abort session' : 'Postpone session'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Stack>
  );
}
