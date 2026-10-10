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
import type { InspectionPreparationStatus } from '../api/inspectionApi';
import {
  useInspectionPreparations,
  useLinkPermitReferences,
  usePrepareShotList,
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

  const current = preparations.data?.[0];

  const [shotList, setShotList] = useState(current?.shotList ?? '');
  const [evidenceTypes, setEvidenceTypes] = useState(current?.evidenceTypes ?? '');
  const [accessConstraints, setAccessConstraints] = useState(current?.accessConstraints ?? '');
  const [safetyObservations, setSafetyObservations] = useState(current?.safetyObservations ?? '');
  const [acknowledgment, setAcknowledgment] = useState('');
  const [permitId, setPermitId] = useState('');

  const saveDraft = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    prepare.mutate({
      inspectionId,
      input: {
        shotList: shotList.trim(),
        evidenceTypes: evidenceTypes.trim(),
        accessConstraints: accessConstraints.trim(),
        safetyObservations: safetyObservations.trim(),
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
            No preparation recorded yet. Add the component shot-list and the hazards below, then
            submit this mission for review.
          </Alert>
        )}
      </QueryState>

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
      </Box>

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

      <ComplianceGateSection inspectionId={inspectionId} />
    </Paper>
  );
}
