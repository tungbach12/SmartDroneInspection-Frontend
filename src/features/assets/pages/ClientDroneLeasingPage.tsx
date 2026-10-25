import { useCallback, useEffect, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  MenuItem,
  Pagination,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AccountBalanceRounded from '@mui/icons-material/AccountBalanceRounded';
import FlightRounded from '@mui/icons-material/FlightRounded';
import HandshakeRounded from '@mui/icons-material/HandshakeRounded';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import PaymentRounded from '@mui/icons-material/PaymentRounded';
import { redirectToPayPalApproval } from '@/features/subscription/utils/paypalRedirect';
import { EmptyState } from '@/shared/ui/EmptyState';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryState } from '@/shared/ui/QueryState';
import { StatusChip } from '@/shared/ui/StatusChip';
import { useToastStore } from '@/shared/ui/Toast';
import {
  useAvailableLeasableDrones,
  useCaptureDroneLeasePayPalOrder,
  useCreateDroneLeasePayPalOrder,
  useOrganizationDroneLeases,
  useRequestDroneLease,
} from '../hooks/useDroneLeases';
import type { PlatformDrone } from '../api/droneLeaseApi';

export default function ClientDroneLeasingPage() {
  const showToast = useToastStore((s) => s.showToast);
  const availableQuery = useAvailableLeasableDrones();
  const leasesQuery = useOrganizationDroneLeases();
  const requestLeaseMutation = useRequestDroneLease();
  const createPayPalOrderMutation = useCreateDroneLeasePayPalOrder();
  const capturePayPalOrderMutation = useCaptureDroneLeasePayPalOrder();

  const [selectedDrone, setSelectedDrone] = useState<PlatformDrone | null>(null);
  const [leasePeriodMonths, setLeasePeriodMonths] = useState<number>(6);
  const [requestNotes, setRequestNotes] = useState('');

  // Search & filter for available drones
  const [availableSearch, setAvailableSearch] = useState('');
  const [maxMonthlyRate, setMaxMonthlyRate] = useState<string>('ALL');

  // Pagination for available drones
  const [page, setPage] = useState(0);
  const rowsPerPage = 6;

  const paypalReturnHandled = useRef(false);

  const rawAvailableDrones = availableQuery.data ?? [];
  const organizationLeases = leasesQuery.data ?? [];

  // PayPal return capture effect
  const paypalParams = new URLSearchParams(window.location.search);
  const approvedOrderId = paypalParams.get('token') ?? paypalParams.get('paypal_order_id');
  const paymentResult = paypalParams.get('payment') ?? (approvedOrderId ? 'approved' : null);

  const finishPayPalCapture = useCallback(() => {
    window.sessionStorage.removeItem('sdi-paypal-drone-lease');
    window.history.replaceState({}, '', window.location.pathname);
  }, []);

  useEffect(() => {
    if (paymentResult === 'cancelled') {
      if (!paypalReturnHandled.current) {
        paypalReturnHandled.current = true;
        showToast('Payment was cancelled. No charge was captured.', 'info');
        finishPayPalCapture();
      }
      return;
    }
    if (paymentResult !== 'approved' || !approvedOrderId || paypalReturnHandled.current) {
      return;
    }
    paypalReturnHandled.current = true;
    const stored = window.sessionStorage.getItem('sdi-paypal-drone-lease');
    if (!stored) {
      showToast('Payment order could not be verified. Please contact support.', 'error');
      finishPayPalCapture();
      return;
    }
    try {
      const { leaseId, orderId } = JSON.parse(stored) as { leaseId: string; orderId: string };
      capturePayPalOrderMutation.mutate(
        { leaseId, input: { paypalOrderId: approvedOrderId || orderId } },
        {
          onSuccess: () => {
            showToast('Drone lease payment confirmed and drone provisioned into fleet!', 'success');
            finishPayPalCapture();
          },
          onError: () => {
            showToast('Could not complete PayPal capture. Please retry or contact support.', 'error');
            finishPayPalCapture();
          },
        },
      );
    } catch {
      finishPayPalCapture();
    }
  }, [paymentResult, approvedOrderId, capturePayPalOrderMutation, finishPayPalCapture, showToast]);

  const availableDrones = rawAvailableDrones.filter((drone) => {
    if (maxMonthlyRate !== 'ALL') {
      const cap = Number(maxMonthlyRate);
      if (Number(drone.monthlyRateUsd) > cap) return false;
    }
    if (availableSearch.trim()) {
      const q = availableSearch.trim().toLowerCase();
      const match =
        drone.serialNumber.toLowerCase().includes(q) ||
        drone.model.toLowerCase().includes(q) ||
        Boolean(drone.manufacturer && drone.manufacturer.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const pagedAvailableDrones = availableDrones.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  const calculatedTotal = selectedDrone
    ? Number(selectedDrone.monthlyRateUsd) * Math.max(1, Math.min(60, leasePeriodMonths || 1))
    : 0;

  const handleOpenRequestDialog = (drone: PlatformDrone) => {
    setSelectedDrone(drone);
    setLeasePeriodMonths(6);
    setRequestNotes('');
  };

  const handleSubmitLeaseRequest = () => {
    if (!selectedDrone || leasePeriodMonths < 1 || leasePeriodMonths > 60) return;
    requestLeaseMutation.mutate(
      {
        platformDroneId: selectedDrone.id,
        leasePeriodMonths,
        notes: requestNotes.trim() || undefined,
      },
      {
        onSuccess: () => {
          setSelectedDrone(null);
          setRequestNotes('');
        },
      },
    );
  };

  const handlePayWithPayPal = (leaseId: string) => {
    createPayPalOrderMutation.mutate(leaseId, {
      onSuccess: (order) => {
        if (order.approvalUrl) {
          window.sessionStorage.setItem(
            'sdi-paypal-drone-lease',
            JSON.stringify({ leaseId, orderId: order.orderId }),
          );
          redirectToPayPalApproval(order.approvalUrl);
        } else {
          showToast(
            'PayPal approval URL not available. Use the wire transfer reference code to complete payment.',
            'info',
          );
        }
      },
    });
  };

  return (
    <Box sx={{ maxWidth: 1300, mx: 'auto', p: { xs: 2, sm: 3 } }}>
      <PageHeader
        title="B2B Drone Leasing"
        subtitle="Lease serial-numbered inspection drones from the platform pool. Provisioned drones automatically appear in your organization's fleet inventory while the lease is active."
      />

      <Stack spacing={4} sx={{ mt: 3 }}>
        {/* Section 1: Available Platform Drones for Lease */}
        <Paper
          elevation={0}
          sx={{ p: 3, borderRadius: '16px', border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1 }}>
            <FlightRounded sx={{ color: '#0A968A', fontSize: 26 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>
              Available Platform Drones for Lease
            </Typography>
          </Stack>
          <Typography variant="body2" sx={{ color: '#475467', mb: 2.5 }}>
            Select an available platform drone to request a 1–60 month corporate lease contract.
          </Typography>

          {/* Search & Rate Filter */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ mb: 3, alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
          >
            <TextField
              size="small"
              placeholder="Search available drones by serial, model, or brand…"
              value={availableSearch}
              onChange={(e) => {
                setAvailableSearch(e.target.value);
                setPage(0);
              }}
              sx={{ minWidth: { xs: '100%', sm: 340 } }}
            />

            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <TextField
                select
                size="small"
                label="Max monthly rate"
                value={maxMonthlyRate}
                onChange={(e) => {
                  setMaxMonthlyRate(e.target.value);
                  setPage(0);
                }}
                sx={{ minWidth: 160 }}
              >
                <MenuItem value="ALL">Any price</MenuItem>
                <MenuItem value="300">Up to $300/mo</MenuItem>
                <MenuItem value="500">Up to $500/mo</MenuItem>
                <MenuItem value="800">Up to $800/mo</MenuItem>
                <MenuItem value="1200">Up to $1,200/mo</MenuItem>
              </TextField>

              <Typography variant="caption" sx={{ color: '#64748b' }}>
                Showing {availableDrones.length} drone{availableDrones.length === 1 ? '' : 's'}
              </Typography>
            </Stack>
          </Stack>

          <QueryState
            isLoading={availableQuery.isLoading}
            error={availableQuery.isError ? availableQuery.error : null}
            onRetry={() => void availableQuery.refetch()}
            loadingLabel="Loading available platform drones…"
            isEmpty={availableDrones.length === 0}
            empty={
              <EmptyState
                title="No platform drones currently available"
                description="No leasable drones match the selected filters or search query. Check back soon."
              />
            }
          >
            <Grid container spacing={2.5}>
              {pagedAvailableDrones.map((drone) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={drone.id}>
                  <Card
                    variant="outlined"
                    sx={{
                      borderRadius: '12px',
                      borderColor: '#e2e8f0',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <CardContent>
                      <Stack
                        direction="row"
                        sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
                      >
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a' }}>
                          {drone.serialNumber}
                        </Typography>
                        <StatusChip status={drone.status} />
                      </Stack>

                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>
                        {drone.manufacturer ? `${drone.manufacturer} · ` : ''}
                        {drone.model}
                      </Typography>

                      <Typography
                        variant="h5"
                        sx={{ fontWeight: 800, color: '#0A968A', mt: 2, mb: 1 }}
                      >
                        ${Number(drone.monthlyRateUsd).toLocaleString()}
                        <Typography
                          component="span"
                          variant="caption"
                          sx={{ color: '#64748b', ml: 0.5 }}
                        >
                          USD / month
                        </Typography>
                      </Typography>

                      {drone.notes && (
                        <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                          {drone.notes}
                        </Typography>
                      )}
                    </CardContent>

                    <Box sx={{ p: 2, pt: 0 }}>
                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<HandshakeRounded />}
                        onClick={() => handleOpenRequestDialog(drone)}
                        sx={{
                          textTransform: 'none',
                          borderRadius: '8px',
                          fontWeight: 700,
                          bgcolor: '#0A968A',
                          '&:hover': { bgcolor: '#087f75' },
                        }}
                      >
                        Request Lease
                      </Button>
                    </Box>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {availableDrones.length > rowsPerPage && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Pagination
                  count={Math.ceil(availableDrones.length / rowsPerPage)}
                  page={page + 1}
                  onChange={(_, newPage) => setPage(newPage - 1)}
                  color="primary"
                  shape="rounded"
                />
              </Box>
            )}
          </QueryState>
        </Paper>

        {/* Section 2: Organization Lease Contracts */}
        <Paper
          elevation={0}
          sx={{ p: 3, borderRadius: '16px', border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1 }}>
            <HandshakeRounded sx={{ color: '#0A968A', fontSize: 26 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>
              Organization Lease Contracts
            </Typography>
          </Stack>
          <Typography variant="body2" sx={{ color: '#475467', mb: 3 }}>
            Track your organization's pending, active, and reclaimed drone leases.
          </Typography>

          <QueryState
            isLoading={leasesQuery.isLoading}
            error={leasesQuery.isError ? leasesQuery.error : null}
            onRetry={() => void leasesQuery.refetch()}
            loadingLabel="Loading organization lease contracts…"
            isEmpty={organizationLeases.length === 0}
            empty={
              <EmptyState
                title="No drone lease contracts yet"
                description="Request a drone lease from the available platform pool above to provision a leased drone."
              />
            }
          >
            <Stack spacing={2.5} divider={<Divider />}>
              {organizationLeases.map((lease) => {
                const serial = lease.serialNumber ?? lease.droneSerialNumber ?? '—';
                const modelName = lease.model ?? lease.droneModel ?? '—';
                const wireRef =
                  lease.wireReferenceCode ?? `SDI-LEASE-${lease.id.slice(0, 8).toUpperCase()}`;

                return (
                  <Box key={lease.id} sx={{ py: 1 }}>
                    <Stack
                      direction={{ xs: 'column', md: 'row' }}
                      spacing={2}
                      sx={{
                        justifyContent: 'space-between',
                        alignItems: { xs: 'flex-start', md: 'center' },
                      }}
                    >
                      <Stack spacing={0.5}>
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a' }}>
                            {serial} · {modelName}
                          </Typography>
                          <StatusChip status={lease.status} />
                          <Chip
                            size="small"
                            label={`${lease.leasePeriodMonths} Months`}
                            variant="outlined"
                          />
                        </Stack>
                        <Typography variant="body2" sx={{ color: '#475467' }}>
                          Contract Total:{' '}
                          <strong>${Number(lease.agreedAmountUsd).toLocaleString()} USD</strong>
                          {lease.startsAt && lease.endsAt && (
                            <>
                              {' '}
                              · Active Window: {new Date(lease.startsAt).toLocaleDateString()} –{' '}
                              <strong>
                                Expires {new Date(lease.endsAt).toLocaleDateString()}
                              </strong>
                            </>
                          )}
                        </Typography>
                      </Stack>

                      {lease.status === 'PENDING' && (
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          spacing={1.5}
                          sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}
                        >
                          <Box
                            sx={{
                              px: 1.5,
                              py: 0.75,
                              bgcolor: '#f8fafc',
                              border: '1px dashed #0A968A',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                            }}
                          >
                            <AccountBalanceRounded sx={{ fontSize: 18, color: '#0A968A' }} />
                            <Typography variant="caption" sx={{ color: '#0f172a' }}>
                              Wire Ref: <strong>{wireRef}</strong>
                            </Typography>
                          </Box>

                          <LoadingButton
                            size="small"
                            variant="contained"
                            startIcon={<PaymentRounded />}
                            loading={createPayPalOrderMutation.isPending}
                            onClick={() => handlePayWithPayPal(lease.id)}
                            sx={{
                              textTransform: 'none',
                              borderRadius: '8px',
                              fontWeight: 700,
                              bgcolor: '#0070BA',
                              '&:hover': { bgcolor: '#005ea6' },
                            }}
                          >
                            Pay with PayPal
                          </LoadingButton>
                        </Stack>
                      )}

                      {lease.status === 'ACTIVE' && (
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                          {lease.endsAt && (
                            <Chip
                              size="small"
                              color="success"
                              label={`Active until ${new Date(lease.endsAt).toLocaleDateString()}`}
                            />
                          )}
                          <Button
                            size="small"
                            variant="outlined"
                            component={RouterLink}
                            to="/client/assets"
                            endIcon={<OpenInNewRounded sx={{ fontSize: 16 }} />}
                            sx={{ textTransform: 'none', borderRadius: '8px', fontWeight: 600 }}
                          >
                            View in Fleet Inventory
                          </Button>
                        </Stack>
                      )}

                      {lease.status === 'RECLAIMED' && (
                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                          Reclaimed to platform pool
                          {lease.reclaimedAt
                            ? ` on ${new Date(lease.reclaimedAt).toLocaleDateString()}`
                            : ''}
                        </Typography>
                      )}
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          </QueryState>
        </Paper>
      </Stack>

      {/* Request Lease Dialog */}
      <Dialog
        open={Boolean(selectedDrone)}
        onClose={() => setSelectedDrone(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Request Drone Lease — {selectedDrone?.serialNumber}
        </DialogTitle>
        <DialogContent dividers>
          {selectedDrone && (
            <Stack spacing={2.5} sx={{ mt: 0.5 }}>
              <Alert severity="info">
                Model: <strong>{selectedDrone.model}</strong> · Monthly rate:{' '}
                <strong>${Number(selectedDrone.monthlyRateUsd).toLocaleString()} USD/mo</strong>
              </Alert>

              <TextField
                label="Lease Duration (Months)"
                type="number"
                required
                fullWidth
                value={leasePeriodMonths}
                onChange={(e) => setLeasePeriodMonths(Number(e.target.value))}
                slotProps={{ htmlInput: { min: 1, max: 60 } }}
                helperText="Select between 1 and 60 months."
              />

              <Box
                sx={{
                  p: 2,
                  bgcolor: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                  CALCULATED LEASE CONTRACT TOTAL
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#0A968A', mt: 0.5 }}>
                  ${calculatedTotal.toLocaleString()} USD
                </Typography>
              </Box>

              <TextField
                label="Notes (Optional)"
                fullWidth
                multiline
                minRows={2}
                value={requestNotes}
                onChange={(e) => setRequestNotes(e.target.value)}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSelectedDrone(null)}>Cancel</Button>
          <LoadingButton
            variant="contained"
            loading={requestLeaseMutation.isPending}
            disabled={leasePeriodMonths < 1 || leasePeriodMonths > 60}
            onClick={handleSubmitLeaseRequest}
            sx={{ bgcolor: '#0A968A', '&:hover': { bgcolor: '#087f75' } }}
          >
            Submit Lease Request
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
