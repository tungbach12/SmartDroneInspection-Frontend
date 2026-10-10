import { RuleOutlined } from '@mui/icons-material';
import { Alert, Stack, Typography } from '@mui/material';
import { QueryState } from '@/shared/ui/QueryState';
import { useComplianceGate } from '../hooks/useInspections';

/**
 * MF2-05: what stands in the way of a readiness decision.
 *
 * <p>Blockers are shown as a list carrying their server codes, not as one error. MF2-07 needs every
 * blocker at once: a reviewer who sees one at a time would approve a mission that still has four
 * other problems, and the codes are what let a reason be matched to the rule that produced it.
 *
 * <p>An empty list is not clearance. It means the machine found nothing, and a named reviewer still
 * has to decide, so the empty state says exactly that rather than reading as permission to fly.
 */
export function ComplianceGateSection({ inspectionId }: { inspectionId: string }) {
  const compliance = useComplianceGate(inspectionId);

  return (
    <Stack>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
        <RuleOutlined color="primary" />
        <Typography variant="subtitle1">Compliance gate</Typography>
      </Stack>

      <QueryState
        isLoading={compliance.isLoading}
        error={compliance.error}
        onRetry={() => void compliance.refetch()}
      >
        {null}
      </QueryState>

      {compliance.data && compliance.data.blockers.length > 0 ? (
        <Stack spacing={1} sx={{ mb: 1 }}>
          {compliance.data.blockers.map((blocker) => (
            <Alert key={blocker.code} severity="warning">
              <strong>{blocker.code}</strong> — {blocker.detail}
            </Alert>
          ))}
        </Stack>
      ) : null}

      {compliance.data && compliance.data.blockers.length === 0 ? (
        <Alert severity="success" sx={{ mb: 1 }}>
          No blocker found. A named reviewer still has to decide; this is not flight clearance.
        </Alert>
      ) : null}

      {compliance.data?.requiresHumanVerification ? (
        <Alert severity="info">
          Some findings need human verification. They cannot be cleared by inference.
        </Alert>
      ) : null}
    </Stack>
  );
}
