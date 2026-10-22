import { RuleOutlined } from '@mui/icons-material';
import { Alert, Box, Stack, Typography } from '@mui/material';
import { QueryState } from '@/shared/ui/QueryState';
import { StatusChip } from '@/shared/ui/StatusChip';
import { useComplianceGate } from '../hooks/useInspections';
import { useLocale } from '@/shared/i18n/LocaleProvider';

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
  const { formatDate, t } = useLocale();
  const compliance = useComplianceGate(inspectionId);

  return (
    <Stack>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
        <RuleOutlined color="primary" />
        <Typography variant="subtitle1">{t('Compliance gate')}</Typography>
      </Stack>

      <QueryState
        isLoading={compliance.isLoading}
        error={compliance.error}
        onRetry={() => void compliance.refetch()}
      >
        {null}
      </QueryState>

      {compliance.data?.permits && compliance.data.permits.length > 0 ? (
        <Box sx={{ mb: 1.5, p: 1.5, bgcolor: '#f8fafc', borderRadius: 1.5, border: '1px solid #e2e8f0' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#334155', mb: 1 }}>
            {t('Applicable Flight Permits (')}{compliance.data.permits.length})
          </Typography>
          <Stack spacing={1}>
            {compliance.data.permits.map((permit) => (
              <Box
                key={permit.id}
                sx={{
                  p: 1.5,
                  bgcolor: '#ffffff',
                  borderRadius: 1,
                  border: '1px solid #cbd5e1',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 1,
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
                    📜 {permit.permitReference ?? 'Unnamed Permit'} ({permit.permitType ?? 'FLIGHT'})
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    {t('Authority:')} {permit.issuingAuthority ?? 'Cục Tác chiến'} {t('· Window:')}{' '}
                    {permit.validFrom ? formatDate(new Date(permit.validFrom)) : '—'} {t('to')}{' '}
                    {permit.validUntil ? formatDate(new Date(permit.validUntil)) : '—'}
                  </Typography>
                </Box>
                <StatusChip status={permit.status} />
              </Box>
            ))}
          </Stack>
        </Box>
      ) : null}

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
          {t('No blocker found. A named reviewer still has to decide; this is not flight clearance.')}
        </Alert>
      ) : null}

      {compliance.data?.requiresHumanVerification ? (
        <Alert severity="info">
          {t('Some findings need human verification. They cannot be cleared by inference.')}
        </Alert>
      ) : null}
    </Stack>
  );
}
