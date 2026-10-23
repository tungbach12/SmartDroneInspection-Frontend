import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded';
import DescriptionRounded from '@mui/icons-material/DescriptionRounded';
import ReceiptLongRounded from '@mui/icons-material/ReceiptLongRounded';
import HandshakeRounded from '@mui/icons-material/HandshakeRounded';
import PrintRounded from '@mui/icons-material/PrintRounded';
import ContractDocumentModal from '../components/ContractDocumentModal';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryState } from '@/shared/ui/QueryState';
import { StatusChip } from '@/shared/ui/StatusChip';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import {
  usePlatformSubscriptions,
  useConfirmSubscriptionPayment,
} from '../hooks/useSubscriptions';
import type { Subscription } from '../api/subscriptionApi';

const STATUS_FILTERS = ['ALL', 'PENDING', 'ACTIVE', 'PAST_DUE', 'EXPIRED', 'CANCELLED'] as const;

export default function PlatformSubscriptionsPage() {
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [activeTermsDialogSub, setActiveTermsDialogSub] = useState<Subscription | null>(null);
  const [activeContractModalSub, setActiveContractModalSub] = useState<Subscription | null>(null);
  const [confirmingSub, setConfirmingSub] = useState<Subscription | null>(null);
  const [externalReference, setExternalReference] = useState('');
  const [startsAtInput, setStartsAtInput] = useState('');
  const [endsAtInput, setEndsAtInput] = useState('');
  const [agreedAmountInput, setAgreedAmountInput] = useState('');
  const [adminNotesInput, setAdminNotesInput] = useState('');

  const { data, isLoading, isError, error, refetch } = usePlatformSubscriptions(
    selectedStatus === 'ALL' ? undefined : selectedStatus,
  );

  const confirmMutation = useConfirmSubscriptionPayment();

  const handleOpenConfirmDialog = (sub: Subscription) => {
    setConfirmingSub(sub);
    setExternalReference('');
    const today = new Date().toISOString().split('T')[0]!;
    setStartsAtInput(today);
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + sub.billingPeriodMonths);
    setEndsAtInput(endDate.toISOString().split('T')[0]!);

    const initialAmount =
      sub.agreedAmountUsd ??
      sub.termsSnapshot?.proposedPriceUsd ??
      sub.termsSnapshot?.standardTotalPriceUsd ??
      sub.termsSnapshot?.totalPriceUsd ??
      '';
    setAgreedAmountInput(initialAmount ? String(initialAmount) : '');
    setAdminNotesInput('');
  };

  const handleCloseConfirmDialog = () => {
    setConfirmingSub(null);
    setExternalReference('');
    setAgreedAmountInput('');
    setAdminNotesInput('');
  };

  const handleConfirmActivation = () => {
    if (!confirmingSub || !externalReference.trim()) return;
    const startsAtIso = startsAtInput ? new Date(startsAtInput).toISOString() : undefined;
    const endsAtIso = endsAtInput ? new Date(endsAtInput).toISOString() : undefined;

    confirmMutation.mutate(
      {
        id: confirmingSub.id,
        input: {
          externalReference: externalReference.trim(),
          startsAt: startsAtIso,
          endsAt: endsAtIso,
          agreedAmountUsd: agreedAmountInput.trim() ? Number(agreedAmountInput.trim()) : undefined,
          adminNotes: adminNotesInput.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          handleCloseConfirmDialog();
        },
      },
    );
  };

  const subscriptions = data ?? [];
  const pendingCount = subscriptions.filter((s) => s.status === 'PENDING').length;
  const activeCount = subscriptions.filter((s) => s.status === 'ACTIVE').length;

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: { xs: 2, sm: 3 } }}>
      <PageHeader
        title="Enterprise Subscriptions"
        subtitle="Platform-wide tenant subscriptions, contract terms snapshots, custom periods, and administrative payment verification."
      />

      {/* KPI Metric Summary Cards */}
      <Grid container spacing={2} sx={{ mt: 1, mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              bgcolor: '#ffffff',
            }}
          >
            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
              ACTIVE SUBSCRIPTIONS
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#0A968A', mt: 0.5 }}>
              {activeCount}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              Enforcing active entitlement
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              bgcolor: pendingCount > 0 ? 'rgba(217, 119, 6, 0.05)' : '#ffffff',
            }}
          >
            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
              PENDING VERIFICATION
            </Typography>
            <Typography
              variant="h4"
              sx={{ fontWeight: 800, color: pendingCount > 0 ? '#d97706' : '#0f172a', mt: 0.5 }}
            >
              {pendingCount}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              Awaiting bank statement reconciliation
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              bgcolor: '#ffffff',
            }}
          >
            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
              TOTAL RECORDS
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a', mt: 0.5 }}>
              {subscriptions.length}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              Across all customer organizations
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Filter Tabs */}
      <Paper elevation={0} sx={{ borderRadius: '12px', border: '1px solid #e2e8f0', mb: 3 }}>
        <Tabs
          value={selectedStatus}
          onChange={(_, val) => setSelectedStatus(val)}
          sx={{ px: 2, borderBottom: '1px solid #e2e8f0' }}
        >
          {STATUS_FILTERS.map((status) => (
            <Tab
              key={status}
              label={status === 'ALL' ? 'All Subscriptions' : status}
              value={status}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            />
          ))}
        </Tabs>

        {/* Content Table */}
        <QueryState
          isLoading={isLoading}
          error={isError ? error : null}
          onRetry={refetch}
          loadingLabel="Loading enterprise subscriptions…"
        >
          <Box sx={{ p: 2 }}>
            {subscriptions.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <ReceiptLongRounded sx={{ fontSize: 48, color: '#94a3b8', mb: 1 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#475467' }}>
                  No subscriptions found
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  There are no subscriptions matching the selected status filter.
                </Typography>
              </Box>
            ) : (
              <Stack spacing={2} divider={<Divider />}>
                {subscriptions.map((sub) => {
                  const hasDealProposal = Boolean(sub.termsSnapshot?.proposedPriceUsd);
                  return (
                    <Box
                      key={sub.id}
                      sx={{
                        py: 1.5,
                        display: 'flex',
                        flexDirection: { xs: 'column', md: 'row' },
                        justifyContent: 'space-between',
                        alignItems: { xs: 'flex-start', md: 'center' },
                        gap: 2,
                      }}
                    >
                      <Stack spacing={0.5} sx={{ minWidth: 240 }}>
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                            {sub.organizationName}
                          </Typography>
                          <StatusChip status={sub.status} />
                        </Stack>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                          Org ID: <code>{sub.organizationId}</code>
                        </Typography>
                      </Stack>

                      <Box sx={{ minWidth: 160 }}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {sub.planCode} · {sub.billingPeriodMonths} Months
                          </Typography>
                          {hasDealProposal && (
                            <Chip
                              icon={<HandshakeRounded sx={{ fontSize: 14 }} />}
                              label="Deal"
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }}
                            />
                          )}
                        </Stack>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                          Requested: {new Date(sub.createdAt).toLocaleDateString()}
                        </Typography>
                      </Box>

                      <Box sx={{ minWidth: 150 }}>
                        <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                          AMOUNT
                        </Typography>
                        {sub.agreedAmountUsd ? (
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#0A968A' }}>
                            ${sub.agreedAmountUsd.toLocaleString()} USD
                          </Typography>
                        ) : sub.termsSnapshot?.proposedPriceUsd ? (
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#d97706' }}>
                            Offer: ${sub.termsSnapshot.proposedPriceUsd.toLocaleString()} USD
                          </Typography>
                        ) : (
                          <Typography variant="body2" sx={{ color: '#64748b' }}>
                            Standard rate
                          </Typography>
                        )}
                      </Box>

                      <Box sx={{ minWidth: 180 }}>
                        <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                          COVERAGE WINDOW
                        </Typography>
                        {sub.startsAt && sub.endsAt ? (
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
                            {new Date(sub.startsAt).toLocaleDateString()} –{' '}
                            {new Date(sub.endsAt).toLocaleDateString()}
                          </Typography>
                        ) : (
                          <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                            Pending activation
                          </Typography>
                        )}
                      </Box>

                      <Box sx={{ minWidth: 160 }}>
                        <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                          WIRE REFERENCE
                        </Typography>
                        {sub.externalReference ? (
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#0A968A' }}>
                            <code>{sub.externalReference}</code>
                          </Typography>
                        ) : (
                          <Typography variant="caption" sx={{ color: '#d97706' }}>
                            Awaiting reference
                          </Typography>
                        )}
                      </Box>

                      <Stack direction="row" spacing={1} sx={{ mt: { xs: 1, md: 0 } }}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<PrintRounded />}
                          onClick={() => setActiveContractModalSub(sub)}
                          sx={{
                            textTransform: 'none',
                            borderRadius: '8px',
                            fontWeight: 600,
                            borderColor: '#cbd5e1',
                            color: '#334155',
                          }}
                        >
                          Contract PDF
                        </Button>

                        {sub.termsSnapshot && (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<DescriptionRounded />}
                            onClick={() => setActiveTermsDialogSub(sub)}
                            sx={{ textTransform: 'none', borderRadius: '8px', fontWeight: 600 }}
                          >
                            Terms
                          </Button>
                        )}

                        {sub.status !== 'ACTIVE' && (
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            startIcon={<CheckCircleOutlineRounded />}
                            onClick={() => handleOpenConfirmDialog(sub)}
                            sx={{
                              textTransform: 'none',
                              borderRadius: '8px',
                              fontWeight: 700,
                              bgcolor: '#0A968A',
                              '&:hover': { bgcolor: '#087f75' },
                            }}
                          >
                            Confirm & Activate
                          </Button>
                        )}
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Box>
        </QueryState>
      </Paper>

      {/* Terms Snapshot Viewer Dialog */}
      <Dialog
        open={Boolean(activeTermsDialogSub)}
        onClose={() => setActiveTermsDialogSub(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Contract Terms Snapshot — {activeTermsDialogSub?.organizationName}
        </DialogTitle>
        <DialogContent dividers>
          {activeTermsDialogSub?.termsSnapshot ? (
            <Stack spacing={2.5}>
              <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Agreement Execution Metadata
                </Typography>
                <Grid container spacing={1}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      Agreed Terms Version:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {activeTermsDialogSub.termsSnapshot.termsVersion}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      Agreement Timestamp:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {new Date(activeTermsDialogSub.termsSnapshot.agreedAt).toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      Agreed by Representative:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {activeTermsDialogSub.termsSnapshot.agreedByFullName} (
                      {activeTermsDialogSub.termsSnapshot.agreedByUserEmail})
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      Duration:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {activeTermsDialogSub.termsSnapshot.planCode} ·{' '}
                      {activeTermsDialogSub.termsSnapshot.billingPeriodMonths} Months
                    </Typography>
                  </Grid>
                </Grid>

                {/* Commercial Proposal / Deal Section */}
                {(activeTermsDialogSub.termsSnapshot.proposedPriceUsd ||
                  activeTermsDialogSub.termsSnapshot.negotiationNotes) && (
                  <Box sx={{ mt: 2, p: 1.5, bgcolor: '#ffffff', borderRadius: '8px', border: '1px dashed #0A968A' }}>
                    <Typography variant="caption" sx={{ color: '#0A968A', fontWeight: 700, display: 'block' }}>
                      COMMERCIAL PROPOSAL / NEGOTIATED DEAL DETAILS
                    </Typography>
                    {activeTermsDialogSub.termsSnapshot.proposedPriceUsd && (
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a', mt: 0.5 }}>
                        Proposed Budget: ${activeTermsDialogSub.termsSnapshot.proposedPriceUsd.toLocaleString()} USD
                        {activeTermsDialogSub.termsSnapshot.standardTotalPriceUsd && (
                          <Typography component="span" variant="caption" sx={{ color: '#64748b', ml: 1 }}>
                            (Standard rate: ${activeTermsDialogSub.termsSnapshot.standardTotalPriceUsd.toLocaleString()} USD)
                          </Typography>
                        )}
                      </Typography>
                    )}
                    {activeTermsDialogSub.termsSnapshot.negotiationNotes && (
                      <Typography variant="caption" sx={{ color: '#475467', display: 'block', mt: 0.5 }}>
                        Client Deal Note: "{activeTermsDialogSub.termsSnapshot.negotiationNotes}"
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>

              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Agreed Contractual Clauses
              </Typography>
              <Stack spacing={1.5}>
                {activeTermsDialogSub.termsSnapshot.clauses?.map((c) => (
                  <Box key={c.id}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                      {c.title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#475467', display: 'block', mt: 0.25 }}>
                      {c.text}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No snapshot data attached to this subscription record.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActiveTermsDialogSub(null)} sx={{ textTransform: 'none' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Payment & Activate Dialog */}
      <Dialog
        open={Boolean(confirmingSub)}
        onClose={handleCloseConfirmDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Confirm Payment & Activate Subscription
        </DialogTitle>
        <DialogContent dividers>
          {confirmingSub && (
            <Stack spacing={2.5}>
              <Alert severity="info" sx={{ borderRadius: '8px' }}>
                Activating this subscription enforces the single active invariant:{' '}
                any older active subscription for <strong>{confirmingSub.organizationName}</strong> will
                be seamlessly transitioned to expired.
              </Alert>

              <Box>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                  ORGANIZATION & TERM
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 700, color: '#0f172a' }}>
                  {confirmingSub.organizationName} ({confirmingSub.billingPeriodMonths} Months Enterprise)
                </Typography>
              </Box>

              <TextField
                required
                fullWidth
                label="Bank Wire Statement / Invoice Reference"
                placeholder="e.g. WIRE-20261021-CHASE-9481 or INV-2026-0089"
                value={externalReference}
                onChange={(e) => setExternalReference(e.target.value)}
                helperText="Enter the corporate wire reference from the bank statement confirming cleared funds."
              />

              <TextField
                fullWidth
                type="number"
                label="Final Agreed Contract Amount in USD (Số tiền thỏa thuận thực tế)"
                placeholder="e.g. 8500"
                value={agreedAmountInput}
                onChange={(e) => setAgreedAmountInput(e.target.value)}
                helperText="Enter the finalized contract revenue confirmed on the wire statement."
              />

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Effective Start Date"
                    slotProps={{ inputLabel: { shrink: true } }}
                    value={startsAtInput}
                    onChange={(e) => setStartsAtInput(e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Effective End Date"
                    slotProps={{ inputLabel: { shrink: true } }}
                    value={endsAtInput}
                    onChange={(e) => setEndsAtInput(e.target.value)}
                  />
                </Grid>
              </Grid>

              <TextField
                fullWidth
                label="Admin Verification / Deal Notes (Optional)"
                placeholder="e.g. Cleared wire with special 15% upfront volume discount."
                value={adminNotesInput}
                onChange={(e) => setAdminNotesInput(e.target.value)}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseConfirmDialog} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <LoadingButton
            variant="contained"
            onClick={handleConfirmActivation}
            disabled={!externalReference.trim()}
            loading={confirmMutation.isPending}
            sx={{
              bgcolor: '#0A968A',
              '&:hover': { bgcolor: '#087f75' },
              fontWeight: 700,
              textTransform: 'none',
            }}
          >
            Confirm & Activate
          </LoadingButton>
        </DialogActions>
      </Dialog>

      {/* Official Electronic Contract Document Modal */}
      <ContractDocumentModal
        open={Boolean(activeContractModalSub)}
        onClose={() => setActiveContractModalSub(null)}
        subscription={activeContractModalSub}
      />
    </Box>
  );
}
