import { ApprovalOutlined, AssignmentReturnOutlined } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
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
import { ComplianceGateSection } from './ComplianceGateSection';
import {
  useApproveReadiness,
  useComplianceGate,
  useMyCredentials,
  useReadinessSources,
  useReturnReadiness,
} from '../hooks/useInspections';

interface ReadinessReviewPanelProps {
  inspectionId: string;
  preparationId: string;
}

/**
 * MF2-07: the reviewer's approve or return of a submitted preparation.
 *
 * <p>The reviewer picks from records the server reads for them: their own credentials, the assigned
 * Inspector's credentials and the assigned Drone's documents. Nothing here asks for a UUID, because
 * an approval nobody can complete without a UUID is not a workflow.
 *
 * <p>What this panel does not do is decide. It collects what Report 3 requires a reviewer to
 * attest — a complete applicability attestation with a traceable basis, a reason per category left
 * empty, and a basis when the gate reports human verification — and sends it. The gates themselves
 * stay server-side: a client cannot clear a mission, and approval stays disabled while a machine-
 * detectable blocker stands.
 *
 * <p>An Inspector never sees this. They are the subject of the review, not its reviewer.
 */
export default function ReadinessReviewPanel({
  inspectionId,
  preparationId,
}: ReadinessReviewPanelProps) {
  const roles = useAuthStore((state) => state.roles);
  if (!roles.includes('ORG_ADMIN')) {
    return null;
  }

  return <ReviewerView inspectionId={inspectionId} preparationId={preparationId} />;
}

/**
 * The review form itself.
 *
 * <p>Split from the exported component so the role check happens once, before any query runs: an
 * Inspector must not fetch the review sources either, and the two queries here are organization-
 * scoped reads the backend would refuse them anyway.
 */
function ReviewerView({
  inspectionId,
  preparationId,
}: ReadinessReviewPanelProps) {
  const roles = useMyCredentials().data;
  const sources = useReadinessSources(inspectionId);
  const compliance = useComplianceGate(inspectionId);
  const approve = useApproveReadiness();
  const returnPreparation = useReturnReadiness();

  const [reviewerCredentialId, setReviewerCredentialId] = useState('');
  const [inspectorCredentialIds, setInspectorCredentialIds] = useState<string[]>([]);
  const [droneDocumentIds, setDroneDocumentIds] = useState<string[]>([]);
  const [applicabilityComplete, setApplicabilityComplete] = useState(false);
  const [applicabilityBasisReference, setApplicabilityBasisReference] = useState('');
  const [noInspectorCredentialReason, setNoInspectorCredentialReason] = useState('');
  const [noDroneDocumentReason, setNoDroneDocumentReason] = useState('');
  const [humanVerificationBasis, setHumanVerificationBasis] = useState('');
  const [returnReason, setReturnReason] = useState('');

  const toggle = (ids: string[], id: string) =>
    ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id];

  const approveReadiness = () => {
    approve.mutate({
      inspectionId,
      preparationId,
      input: {
        reviewerCredentialId,
        inspectorCredentialIds,
        droneDocumentIds,
        applicabilityComplete,
        applicabilityBasisReference,
        noInspectorCredentialReason: noInspectorCredentialReason || undefined,
        noDroneDocumentReason: noDroneDocumentReason || undefined,
        humanVerificationBasis: humanVerificationBasis || undefined,
      },
    });
  };

  const sendBack = () => {
    returnPreparation.mutate({
      inspectionId,
      preparationId,
      input: {
        reviewerCredentialId,
        inspectorCredentialIdsObserved: inspectorCredentialIds,
        droneDocumentIdsObserved: droneDocumentIds,
        reason: returnReason,
      },
    });
  };

  // The approval button stays disabled while a machine-detectable blocker stands, and while a
  // human-verification basis is outstanding. This is a usability guard, not an authorization one: the
  // server refuses the same approval either way, so a client that ignored it would gain nothing.
  const blockers = compliance.data?.blockers.length ?? 0;
  const needsHumanBasis = compliance.data?.requiresHumanVerification === true;
  const canApprove =
    blockers === 0 &&
    Boolean(reviewerCredentialId) &&
    (!needsHumanBasis || humanVerificationBasis.trim().length > 0);

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
        <ApprovalOutlined color="primary" />
        <Typography variant="h6">Readiness review</Typography>
      </Stack>

      <Alert severity="info" sx={{ mb: 2 }}>
        This records an internal human decision. It is not a statutory licence and not flight
        clearance.
      </Alert>

      <QueryState
        isLoading={sources.isLoading}
        error={sources.error}
        onRetry={() => void sources.refetch()}
      >
        <Stack spacing={2}>
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Your credential
            </Typography>
            {(roles ?? []).map((credential) => (
              <FormControlLabel
                key={credential.id}
                control={
                  <Checkbox
                    checked={reviewerCredentialId === credential.id}
                    onChange={() => setReviewerCredentialId(credential.id)}
                  />
                }
                label={`${credential.credentialReference} — ${credential.credentialType}, ${credential.issuer}`}
              />
            ))}
          </Box>

          <Box>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Assigned Inspector credentials
            </Typography>
            {(sources.data?.inspectorCredentials ?? []).map((credential) => (
              <FormControlLabel
                key={credential.id}
                control={
                  <Checkbox
                    checked={inspectorCredentialIds.includes(credential.id)}
                    onChange={() => setInspectorCredentialIds(toggle(inspectorCredentialIds, credential.id))}
                  />
                }
                label={`${credential.credentialReference} — ${credential.credentialType}, ${credential.issuer}`}
              />
            ))}
            {sources.data?.inspectorCredentials.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                The assigned Inspector holds no credential record.
              </Typography>
            ) : null}
            {inspectorCredentialIds.length === 0 ? (
              <TextField
                label="No Inspector credential reason"
                value={noInspectorCredentialReason}
                onChange={(event) => setNoInspectorCredentialReason(event.target.value)}
                helperText="Required because no credential was selected, so 'nothing applies' is recorded rather than omitted."
                sx={{ mt: 1 }}
              />
            ) : null}
          </Box>

          <Box>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Drone documents
            </Typography>
            {(sources.data?.droneDocuments ?? []).map((document) => (
              <FormControlLabel
                key={document.id}
                control={
                  <Checkbox
                    checked={droneDocumentIds.includes(document.id)}
                    onChange={() => setDroneDocumentIds(toggle(droneDocumentIds, document.id))}
                  />
                }
                label={`${document.documentReference} — ${document.documentType}, ${document.issuer}`}
              />
            ))}
            {sources.data?.droneDocuments.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                The assigned Drone holds no document record.
              </Typography>
            ) : null}
            {droneDocumentIds.length === 0 ? (
              <TextField
                label="No Drone document reason"
                value={noDroneDocumentReason}
                onChange={(event) => setNoDroneDocumentReason(event.target.value)}
                helperText="Required because no document was selected."
                sx={{ mt: 1 }}
              />
            ) : null}
          </Box>

          <Stack spacing={2}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={applicabilityComplete}
                  onChange={(event) => setApplicabilityComplete(event.target.checked)}
                />
              }
              label="Applicability attestation complete"
            />
            <TextField
              label="Applicability basis reference"
              value={applicabilityBasisReference}
              onChange={(event) => setApplicabilityBasisReference(event.target.value)}
              helperText="A traceable reference. SRS requires one; free text is not a basis."
            />
            <TextField
              label="Human verification basis"
              value={humanVerificationBasis}
              onChange={(event) => setHumanVerificationBasis(event.target.value)}
              helperText="Required only when the compliance gate reports human verification."
            />
          </Stack>

          <Box>
            <Button
              variant="contained"
              onClick={approveReadiness}
              disabled={approve.isPending || !canApprove}
            >
              {approve.isPending ? 'Recording…' : 'Approve readiness'}
            </Button>
          </Box>

          {approve.isError && isConflict(approve.error) ? (
            <RefusalNotice
              testId="approval-refusal"
              reason={getErrorMessage(approve.error, '')}
              fallbackMessage="The server refused this approval."
            />
          ) : null}
          <MutationProblemAlert
            error={approve.error}
            isError={approve.isError && !isConflict(approve.error)}
            fallbackMessage="Could not record the approval."
          />

          <Box sx={{ pt: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Return for rework
            </Typography>
            <TextField
              label="Return reason"
              value={returnReason}
              onChange={(event) => setReturnReason(event.target.value)}
              multiline
              minRows={2}
              helperText="A reason is required. A rejection nobody can read is not a usable instruction."
              sx={{ mb: 1.5 }}
            />
            <Button
              variant="outlined"
              startIcon={<AssignmentReturnOutlined />}
              onClick={sendBack}
              disabled={returnPreparation.isPending || !returnReason.trim() || !reviewerCredentialId}
            >
              {returnPreparation.isPending ? 'Returning…' : 'Return preparation'}
            </Button>
          </Box>

          <MutationProblemAlert
            error={returnPreparation.error}
            isError={returnPreparation.isError}
            fallbackMessage="Could not return the preparation."
          />
        </Stack>
      </QueryState>

      <ComplianceGateSection inspectionId={inspectionId} />
    </Paper>
  );
}
