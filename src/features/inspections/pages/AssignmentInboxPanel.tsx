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
import { useState } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { isConflict } from '@/shared/api/problem';
import { MutationProblemAlert, RefusalNotice } from '@/shared/ui/MutationProblemAlert';
import { QueryState } from '@/shared/ui/QueryState';
import { StatusChip } from '@/shared/ui/StatusChip';
import type { InspectorAssignment } from '../api/inspectionApi';
import { useAssignmentInbox, useRespondToAssignment } from '../hooks/useInspections';

/**
 * MF2-01 and MF2-02: the Inspector accepts or declines the pairings an administrator opened.
 *
 * <p>This is the entry point to MF2. Without it there is no way into the flow from the browser:
 * preparation, readiness and the field session all sit downstream of a pairing the Inspector took.
 *
 * <p>Accepting is not flight clearance. MF2-02 records that the Inspector took the job; MF2-07
 * decides separately, with a named independent reviewer, whether the mission may fly. The panel
 * says so rather than letting a green "Accepted" imply more than it means.
 *
 * <p>A decline requires a written reason. The backend refuses without one, and only the Inspector
 * knows whether they lack a qualification, a date, or a willingness — the client cannot word it.
 *
 * <p>An Inspector never sees another Inspector's pairings: the server derives organization and
 * assignment scope from the token, and the role check here is navigation policy only.
 */
export default function AssignmentInboxPanel() {
  const roles = useAuthStore((state) => state.roles);
  if (!roles.includes('INSPECTOR')) {
    return null;
  }

  return <Inbox />;
}

function Inbox() {
  const inbox = useAssignmentInbox();
  const respond = useRespondToAssignment();

  const [rejectionReason, setRejectionReason] = useState('');

  const send = (
    assignment: InspectorAssignment,
    response: 'ACCEPTED' | 'REJECTED',
  ) => {
    respond.mutate({
      assignmentId: assignment.id,
      response,
      rejectionReason: response === 'REJECTED' ? rejectionReason.trim() : undefined,
    });
    if (response === 'REJECTED') {
      setRejectionReason('');
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
        <AssignmentTurnedInOutlined color="primary" />
        <Typography variant="h6">Assignments</Typography>
      </Stack>

      <Alert severity="info" sx={{ mb: 2 }}>
        Accepting records that you took the job. It does not mean the mission may fly: a named
        organization reviewer decides that separately, from the paperwork.
      </Alert>

      {respond.isError && isConflict(respond.error) ? (
        <Box sx={{ mb: 2 }}>
          <RefusalNotice
            testId="assignment-refusal"
            reason={getErrorMessage(respond.error, '')}
            fallbackMessage="The server refused this response."
          />
        </Box>
      ) : null}
      <Box sx={{ mb: 2 }}>
        <MutationProblemAlert
          error={respond.error}
          isError={respond.isError && !isConflict(respond.error)}
          fallbackMessage="Could not record this response."
        />
      </Box>

      <QueryState
        isLoading={inbox.isLoading}
        error={inbox.error}
        onRetry={() => void inbox.refetch()}
      >
        {inbox.data?.length ? (
          <Stack spacing={2.5}>
            {inbox.data.map((assignment) => (
              <Box key={assignment.id}>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'center', mb: 0.5 }}
                >
                  <Typography variant="subtitle1">{assignment.assetName}</Typography>
                  <StatusChip status={assignment.status} />
                  <StatusChip status={assignment.droneServiceability} />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Drone {assignment.droneSerialNumber} · valid from{' '}
                  {assignment.validFrom?.slice(0, 10) ?? 'unspecified'} to{' '}
                  {assignment.validUntil?.slice(0, 10) ?? 'unspecified'}
                </Typography>
                <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                  <TextField
                    label="Reason for declining"
                    value={rejectionReason}
                    onChange={(event) => setRejectionReason(event.target.value)}
                    helperText="Required only when declining, so an administrator knows what to fix."
                    size="small"
                  />
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="contained"
                      disabled={respond.isPending}
                      onClick={() => send(assignment, 'ACCEPTED')}
                    >
                      {respond.isPending ? 'Recording…' : 'Accept'}
                    </Button>
                    <Button
                      variant="outlined"
                      disabled={respond.isPending || rejectionReason.trim().length === 0}
                      onClick={() => send(assignment, 'REJECTED')}
                    >
                      Decline
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            ))}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Nothing to answer. An organization administrator pairs an Inspector with a Drone before
            preparation can start.
          </Typography>
        )}
      </QueryState>
    </Paper>
  );
}
