import { AssignmentTurnedInOutlined } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState, type FormEvent } from 'react';
import { MutationProblemAlert, RefusalNotice } from '@/shared/ui/MutationProblemAlert';
import { QueryState } from '@/shared/ui/QueryState';
import { StatusChip } from '@/shared/ui/StatusChip';
import { isConflict } from '@/shared/api/problem';
import { getErrorMessage } from '@/shared/api/errorMessage';
import type { InspectionPreparation, InspectionPreparationStatus } from '../api/inspectionApi';
import {
  useInspectionPreparations,
  useInspectionWorkflowState,
  useLinkPermitReferences,
  usePrepareShotList,
  useRequestAdditionalSession,
  useSubmitPreparation,
} from '../hooks/useInspections';
import { ComplianceGateSection } from './ComplianceGateSection';

interface InspectionPreparationPanelProps {
  inspectionId: string;
  /** False for a reader such as an ORG_ADMIN: they may link permits and read blockers, not draft. */
  isInspector: boolean;
}

/**
 * MF2-03 to MF2-06: the inspector's mission preparation, and the compliance gate beside it.
 *
 * <p>The panel shows the current preparation rather than a blank form, because MF2-07 reviews a
 * specific version. Reopening a returned version means revising that one, not starting over.
 *
 * <p>Submission is offered only for a `SUBMITTED` preparation and only when a readiness decision has
 * not been made. A `READY` preparation is the reviewer's decision about a particular compliance
 * basis; letting the inspector keep editing it would leave that decision pointing at content nobody
 * reviewed.
 */
export default function InspectionPreparationPanel(props: InspectionPreparationPanelProps) {
  const preparations = useInspectionPreparations(props.inspectionId);
  // Remount the editor whenever the preparation version changes, so its fields belong to the
  // version on screen. Seeding the state from an effect instead would leave one render where the
  // previous version's text sits under the new version's label.
  return (
    <PreparationEditor
      key={`${props.inspectionId}:${preparations.data?.[0]?.updatedAt ?? 'none'}`}
      {...props}
      preparations={preparations}
    />
  );
}

function PreparationEditor({
  inspectionId,
  isInspector,
  preparations,
}: InspectionPreparationPanelProps & {
  preparations: ReturnType<typeof useInspectionPreparations>;
}) {
  const prepare = usePrepareShotList();
  const submit = useSubmitPreparation();
  const linkPermits = useLinkPermitReferences();
  const requestAdditionalSession = useRequestAdditionalSession(inspectionId);

  const current = preparations.data?.[0];
  const workflow = useInspectionWorkflowState(inspectionId);

  const [shotList, setShotList] = useState(current?.shotList ?? '');
  const [evidenceTypes, setEvidenceTypes] = useState(current?.evidenceTypes ?? '');
  const [accessConstraints, setAccessConstraints] = useState(current?.accessConstraints ?? '');
  const [safetyObservations, setSafetyObservations] = useState(current?.safetyObservations ?? '');
  const [plannedStartAt, setPlannedStartAt] = useState(
    current?.plannedStartAt?.slice(0, 16) ?? '',
  );
  const [plannedEndAt, setPlannedEndAt] = useState(current?.plannedEndAt?.slice(0, 16) ?? '');
  const [acknowledgment, setAcknowledgment] = useState('');
  const [permitId, setPermitId] = useState('');
  const [additionalSessionReason, setAdditionalSessionReason] = useState('');

  const saveDraft = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    prepare.mutate({
      inspectionId,
      input: {
        shotList: shotList.trim(),
        evidenceTypes: evidenceTypes.trim(),
        accessConstraints: accessConstraints.trim(),
        safetyObservations: safetyObservations.trim(),
        // An additional-session version must carry a window, so the fields are sent only when the
        // Inspector has set them; the server refuses the draft with a clear reason otherwise.
        ...(current && current.preparationVersion > 1
          ? {
              ...(plannedStartAt ? { plannedStartAt: new Date(plannedStartAt).toISOString() } : {}),
              ...(plannedEndAt ? { plannedEndAt: new Date(plannedEndAt).toISOString() } : {}),
            }
          : {}),
      },
    });
  };

  const submitPreparation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!current) return;
    submit.mutate({ inspectionId, preparationId: current.id, acknowledgment });
    setAcknowledgment('');
  };

  const linkPermit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = permitId.trim();
    if (!trimmed) return;
    linkPermits.mutate({ inspectionId, permitIds: [trimmed] });
    setPermitId('');
  };

  const status: InspectionPreparationStatus = current?.status ?? 'DRAFT';
  const reviewed = status === 'READY';
  const canSubmit = Boolean(current) && status === 'SUBMITTED';
  const canRequestAdditionalSession = Boolean(
    isInspector &&
      workflow.data?.status === 'FIELD_COMPLETED' &&
      current?.status === 'READY',
  );

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
        <AssignmentTurnedInOutlined color="primary" />
        <Typography variant="h6">Mission preparation</Typography>
        <Box sx={{ flexGrow: 1 }} />
        <StatusChip status={status} />
      </Stack>

      <QueryState
        isLoading={preparations.isLoading}
        error={preparations.error}
        onRetry={() => void preparations.refetch()}
      >
        {current ? (
          <Typography variant="body2" color="text.secondary">
            Version {current.preparationVersion} ·{' '}
            {current.submittedAt ? 'submitted' : 'not yet submitted'}
          </Typography>
        ) : (
          <Alert severity="info" sx={{ mb: 2 }}>
            {isInspector
              ? 'No preparation recorded yet. Add the component shot-list and the hazards below, then submit this mission for review.'
              : 'No preparation has been recorded for this inspection yet.'}
          </Alert>
        )}
      </QueryState>

      {/* A reviewer judges a submitted preparation, so they have to be able to read it. The editor
          is the author's alone, so the reviewer's copy of the content is a separate, read-only
          rendering rather than a disabled form. */}
      {!isInspector && current ? <PreparationSummary preparation={current} /> : null}

      {reviewed ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          A readiness decision has been made on this preparation. Further edits are refused until the
          inspection goes back for rework.
        </Alert>
      ) : null}

      <Box sx={{ mb: 2 }}>
        {prepare.isError && isConflict(prepare.error) ? (
          // The server's own wording stands alone: a 409 may be "not editable", "not allowed in this
          // state" or "inspection is not preparing", and a client heading would assert a reason the
          // client cannot know.
          <RefusalNotice
            testId="draft-refusal"
            reason={getErrorMessage(prepare.error, '')}
            fallbackMessage="The server refused this draft change."
          />
        ) : null}
        <MutationProblemAlert
          error={prepare.error}
          isError={prepare.isError && !isConflict(prepare.error)}
          fallbackMessage="Could not save the preparation draft."
        />
      </Box>

      <Box sx={{ mb: 2 }}>
        <MutationProblemAlert
          error={submit.error}
          isError={submit.isError}
          fallbackMessage="Could not submit the preparation."
        />
        <MutationProblemAlert
          error={requestAdditionalSession.error}
          isError={requestAdditionalSession.isError}
          fallbackMessage="Could not request another field session."
        />
      </Box>

      {canRequestAdditionalSession ? (
        <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'action.hover' }}>
          <Stack spacing={1.5}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Another field session needed?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Explain what the completed visit did not cover. The current readiness approval will be
              invalidated and a new preparation draft will be opened for planning and independent
              review.
            </Typography>
            <TextField
              label="Why is another field session needed?"
              value={additionalSessionReason}
              onChange={(event) => setAdditionalSessionReason(event.target.value)}
              required
              multiline
              minRows={2}
              slotProps={{ htmlInput: { maxLength: 2000 } }}
            />
            <Box>
              <Button
                variant="outlined"
                disabled={requestAdditionalSession.isPending || !additionalSessionReason.trim()}
                onClick={() =>
                  requestAdditionalSession.mutate(additionalSessionReason.trim(), {
                    onSuccess: () => setAdditionalSessionReason(''),
                  })
                }
              >
                {requestAdditionalSession.isPending ? 'Requesting…' : 'Additional session needed'}
              </Button>
            </Box>
          </Stack>
        </Paper>
      ) : null}

      {isInspector ? (
        <Stack
          component="form"
          onSubmit={saveDraft}
          spacing={2}
          sx={{ mb: 2 }}
          aria-label="Preparation draft"
        >
          <TextField
            label="Component shot-list (JSON)"
            value={shotList}
            onChange={(event) => setShotList(event.target.value)}
            multiline
            minRows={3}
            disabled={reviewed}
            helperText="One entry per component, for example [{&quot;component&quot;:&quot;Span P4&quot;,&quot;modality&quot;:&quot;RGB&quot;}]."
          />
          <TextField
            label="Evidence types (JSON)"
            value={evidenceTypes}
            onChange={(event) => setEvidenceTypes(event.target.value)}
            disabled={reviewed}
            helperText="Modalities the inspection needs, for example [&quot;RGB&quot;]."
          />
          <TextField
            label="Access constraints"
            value={accessConstraints}
            onChange={(event) => setAccessConstraints(event.target.value)}
            multiline
            minRows={2}
            disabled={reviewed}
          />
          {(current?.preparationVersion ?? 1) > 1 && (
            <>
              <TextField
                label="Planned session start"
                type="datetime-local"
                value={plannedStartAt}
                onChange={(event) => setPlannedStartAt(event.target.value)}
                disabled={reviewed}
                helperText="The readiness reviewer rechecks permit and credential validity against this time."
              />
              <TextField
                label="Planned session end"
                type="datetime-local"
                value={plannedEndAt}
                onChange={(event) => setPlannedEndAt(event.target.value)}
                disabled={reviewed}
                slotProps={{ htmlInput: { min: plannedStartAt || undefined } }}
              />
            </>
          )}
          <TextField
            label="Safety observations"
            value={safetyObservations}
            onChange={(event) => setSafetyObservations(event.target.value)}
            multiline
            minRows={2}
            disabled={reviewed}
            helperText="Required before submission, so the reviewer sees the hazards you recorded."
          />
          <Box>
            <Button type="submit" variant="contained" disabled={reviewed || prepare.isPending}>
              {prepare.isPending ? 'Saving…' : 'Save draft'}
            </Button>
          </Box>
        </Stack>
      ) : null}

      {isInspector && canSubmit ? (
        <Stack
          component="form"
          onSubmit={submitPreparation}
          spacing={2}
          sx={{ mb: 2 }}
          aria-label="Preparation submission"
        >
          <TextField
            label="Safety acknowledgment"
            value={acknowledgment}
            onChange={(event) => setAcknowledgment(event.target.value)}
            helperText="Records that you read the restrictions. It is not a statutory licence."
          />
          <Box>
            <Button type="submit" variant="contained" disabled={submit.isPending}>
              {submit.isPending ? 'Submitting…' : 'Submit preparation'}
            </Button>
          </Box>
        </Stack>
      ) : null}

      {!isInspector ? (
        <Stack
          component="form"
          onSubmit={linkPermit}
          spacing={1.5}
          sx={{ mb: 2 }}
          aria-label="Permit reference"
        >
          <TextField
            label="Permit ID"
            value={permitId}
            onChange={(event) => setPermitId(event.target.value)}
            helperText="A permit your organization holds. A permit from another tenant is refused."
          />
          <Box>
            <Button
              type="submit"
              variant="outlined"
              disabled={linkPermits.isPending || !permitId.trim()}
            >
              {linkPermits.isPending ? 'Linking…' : 'Link permit'}
            </Button>
          </Box>
        </Stack>
      ) : null}

      <Box sx={{ mb: 2 }}>
        <MutationProblemAlert
          error={linkPermits.error}
          isError={linkPermits.isError}
          fallbackMessage="Could not link the permit."
        />
      </Box>

      {/* The gate is a compliance officer's view: the backend scopes it to ORG_ADMIN, so an
          Inspector asking for it would only collect a 403. */}
      {!isInspector ? <ComplianceGateSection inspectionId={inspectionId} /> : null}
    </Paper>
  );
}

/**
 * The submitted preparation as a reviewer reads it.
 *
 * <p>MF2-07 is a judgement about a specific version's content: the shot-list, the modalities, the
 * access limits, the hazards and the window the permits are checked against. A reviewer who sees
 * only a version number has nothing to judge, so the content is shown read-only here.
 */
function PreparationSummary({ preparation }: { preparation: InspectionPreparation }) {
  const rows = [
    { label: 'Component shot-list', value: preparation.shotList },
    { label: 'Evidence types', value: preparation.evidenceTypes },
    { label: 'Access constraints', value: preparation.accessConstraints },
    { label: 'Safety observations', value: preparation.safetyObservations },
    {
      label: 'Planned session',
      value:
        preparation.plannedStartAt && preparation.plannedEndAt
          ? `${formatMoment(preparation.plannedStartAt)} — ${formatMoment(preparation.plannedEndAt)}`
          : null,
    },
  ].filter((row) => Boolean(row.value));

  if (rows.length === 0) {
    return (
      <Alert severity="warning" sx={{ mb: 2 }}>
        This preparation records no content yet, so there is nothing to review.
      </Alert>
    );
  }

  return (
    <Stack spacing={1.5} sx={{ mb: 2 }}>
      {rows.map((row) => (
        <Box key={row.label}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {row.label}
          </Typography>
          <Typography
            variant="body2"
            component="pre"
            sx={{ m: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'text.secondary' }}
          >
            {row.value}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}

/** A moment as the reviewer reads it, without the raw ISO string. */
function formatMoment(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}
