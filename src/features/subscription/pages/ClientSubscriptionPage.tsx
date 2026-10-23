import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  Checkbox,
  Chip,
  Collapse,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  Paper,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import ExpandLessRounded from '@mui/icons-material/ExpandLessRounded';
import CardMembershipRounded from '@mui/icons-material/CardMembershipRounded';
import AccountBalanceRounded from '@mui/icons-material/AccountBalanceRounded';
import HistoryRounded from '@mui/icons-material/HistoryRounded';
import GavelRounded from '@mui/icons-material/GavelRounded';
import HandshakeRounded from '@mui/icons-material/HandshakeRounded';
import TuneRounded from '@mui/icons-material/TuneRounded';
import PaymentRounded from '@mui/icons-material/PaymentRounded';
import ReceiptRounded from '@mui/icons-material/ReceiptRounded';
import DescriptionRounded from '@mui/icons-material/DescriptionRounded';
import ContractDocumentModal from '../components/ContractDocumentModal';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryState } from '@/shared/ui/QueryState';
import { StatusChip } from '@/shared/ui/StatusChip';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { useToastStore } from '@/shared/ui/Toast';
import {
  useCurrentSubscription,
  useCreateSubscription,
  useCreatePayPalOrder,
  useCapturePayPalOrder,
  useSubscriptionTransactions,
} from '../hooks/useSubscriptions';
import type { BillingPeriodMonths, Subscription } from '../api/subscriptionApi';
import { redirectToPayPalApproval } from '../utils/paypalRedirect';

export default function ClientSubscriptionPage() {
  const { data, isLoading, isError, error, refetch } = useCurrentSubscription();
  const createMutation = useCreateSubscription();
  const createPayPalOrderMutation = useCreatePayPalOrder();
  const capturePayPalOrderMutation = useCapturePayPalOrder();
  const showToast = useToastStore((s) => s.showToast);

  const [selectedPeriod, setSelectedPeriod] = useState<BillingPeriodMonths>(12);
  const [isCustomPeriod, setIsCustomPeriod] = useState(false);
  const [customMonths, setCustomMonths] = useState<number>(24);
  const [enablePriceDeal, setEnablePriceDeal] = useState(false);
  const [proposedPrice, setProposedPrice] = useState('');
  const [negotiationNotes, setNegotiationNotes] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showRenewalForm, setShowRenewalForm] = useState(false);
  const [termsExpanded, setTermsExpanded] = useState(false);
  const [paymentTab, setPaymentTab] = useState<'PAYPAL' | 'WIRE'>('PAYPAL');

  // Pending order is kept client-side only to correlate PayPal's return with the server-owned
  // order. The browser never creates a capture id or supplies payment evidence.
  const [pendingPaypalOrder, setPendingPaypalOrder] = useState<{
    orderId: string;
    subscriptionId: string;
  } | null>(() => {
    try {
      const stored = window.sessionStorage.getItem('sdi-paypal-order');
      return stored
        ? (JSON.parse(stored) as { orderId: string; subscriptionId: string })
        : null;
    } catch {
      return null;
    }
  });
  const paypalReturnHandled = useRef(false);

  // Contract document modal state
  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Subscription | null>(null);

  const current = data?.currentSubscription;
  const isActive = current?.status === 'ACTIVE';
  const isPending = current?.status === 'PENDING';
  const showForm = !isActive || showRenewalForm;

  const { data: transactions } = useSubscriptionTransactions(current?.id ?? null);

  const handleCopyReference = (ref: string) => {
    void navigator.clipboard.writeText(ref);
    showToast('Payment reference copied to clipboard', 'info');
  };

  const calculateCustomRate = (months: number) => {
    if (months < 6) return { monthly: 1200, discount: 0 };
    if (months < 12) return { monthly: 1000, discount: 16.7 };
    if (months < 24) return { monthly: 850, discount: 29.2 };
    return { monthly: 750, discount: 37.5 };
  };

  const customRateInfo = calculateCustomRate(customMonths);
  const customStandardTotal = customRateInfo.monthly * customMonths;

  const handleSubmitRequest = () => {
    const finalMonths = isCustomPeriod ? customMonths : selectedPeriod;
    createMutation.mutate(
      {
        billingPeriodMonths: finalMonths,
        agreeToTerms: agreedToTerms,
        termsVersion: data?.termsPreview?.version ?? '2026.1',
        proposedPriceUsd:
          enablePriceDeal && proposedPrice.trim() ? Number(proposedPrice.trim()) : undefined,
        negotiationNotes:
          enablePriceDeal && negotiationNotes.trim() ? negotiationNotes.trim() : undefined,
      },
      {
        onSuccess: () => {
          setShowRenewalForm(false);
          setAgreedToTerms(false);
          setEnablePriceDeal(false);
          setProposedPrice('');
          setNegotiationNotes('');
        },
      },
    );
  };

  const handleStartPayPalCheckout = () => {
    if (!current) return;
    createPayPalOrderMutation.mutate(current.id, {
      onSuccess: (order) => {
        if (!order.approvalUrl) {
          showToast('PayPal did not return an approval link. Please use corporate wire transfer.', 'error');
          return;
        }
        const pending = { orderId: order.paypalOrderId, subscriptionId: current.id };
        setPendingPaypalOrder(pending);
        window.sessionStorage.setItem('sdi-paypal-order', JSON.stringify(pending));
        // PayPal order creation includes the server-controlled return and cancel URLs; this
        // location change sends the payer to PayPal's hosted approval UI.
        redirectToPayPalApproval(order.approvalUrl);
      },
    });
  };

  const capturePayPalOrder = capturePayPalOrderMutation.mutate;
  const finishPayPalCapture = useCallback(() => {
    window.sessionStorage.removeItem('sdi-paypal-order');
    setPendingPaypalOrder(null);
    window.history.replaceState({}, '', window.location.pathname);
  }, []);

  const capturePendingPayPalOrder = useCallback(
    (order: { orderId: string; subscriptionId: string }) => {
      capturePayPalOrder(
        { subscriptionId: order.subscriptionId, paypalOrderId: order.orderId },
        {
          onSuccess: finishPayPalCapture,
          onError: () => {
            showToast(
              'PayPal capture could not be confirmed. Retry the same order or contact support.',
              'error',
            );
          },
        },
      );
    },
    [capturePayPalOrder, finishPayPalCapture, showToast],
  );

  const paypalParams = new URLSearchParams(window.location.search);
  const approvedOrderId = paypalParams.get('token') ?? paypalParams.get('paypal_order_id');
  const approvedSubscriptionId = paypalParams.get('paypal_subscription_id');
  const paymentResult = paypalParams.get('payment') ?? (approvedOrderId ? 'approved' : null);

  useEffect(() => {
    if (paymentResult === 'cancelled') {
      if (!paypalReturnHandled.current) {
        paypalReturnHandled.current = true;
        showToast('Payment was cancelled. No charge was captured.', 'info');
        finishPayPalCapture();
      }
      return;
    }
    if (
      paymentResult !== 'approved' ||
      !approvedOrderId ||
      !current ||
      paypalReturnHandled.current
    ) {
      return;
    }
    paypalReturnHandled.current = true;
    const storedOrder = window.sessionStorage.getItem('sdi-paypal-order');
    if (!storedOrder) {
      showToast('Payment order could not be verified. Please contact support.', 'error');
      return;
    }
    let pending: { orderId: string; subscriptionId: string };
    try {
      pending = JSON.parse(storedOrder) as { orderId: string; subscriptionId: string };
    } catch {
      showToast('Payment order could not be verified. Please contact support.', 'error');
      return;
    }
    if (
      pending.orderId !== approvedOrderId ||
      pending.subscriptionId !== current.id ||
      (approvedSubscriptionId && approvedSubscriptionId !== current.id)
    ) {
      showToast('Returned payment does not match the pending order.', 'error');
      return;
    }
    capturePendingPayPalOrder(pending);
  }, [
    approvedOrderId,
    approvedSubscriptionId,
    capturePendingPayPalOrder,
    current,
    finishPayPalCapture,
    paymentResult,
    showToast,
  ]);

  const daysRemaining = current?.endsAt
    ? Math.max(0, Math.ceil((new Date(current.endsAt).getTime() - new Date().getTime()) / 86400000))
    : null;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, sm: 3 } }}>
      <PageHeader
        title="Enterprise Subscription"
        subtitle="Review subscription terms, submit a duration and price proposal, then settle through hosted PayPal approval or reconciled corporate wire transfer."
      />

      <QueryState
        isLoading={isLoading}
        error={isError ? error : null}
        onRetry={refetch}
        loadingLabel="Loading subscription details…"
      >
        {data && (
          <Stack spacing={3} sx={{ mt: 3 }}>
            {/* 1. Status Hero Banner */}
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                bgcolor: '#ffffff',
                boxShadow: '0 1px 3px rgba(16, 24, 40, 0.05)',
              }}
            >
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                sx={{
                  justifyContent: 'space-between',
                  alignItems: { xs: 'flex-start', sm: 'center' },
                }}
              >
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    <CardMembershipRounded sx={{ color: '#0A968A', fontSize: 28 }} />
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>
                      SmartDroneInspection Enterprise
                    </Typography>
                    <StatusChip status={current?.status ?? 'EXPIRED'} />
                  </Stack>

                  {isActive && current && (
                    <Typography variant="body2" sx={{ color: '#475467' }}>
                      Active coverage from{' '}
                      <strong>
                        {current.startsAt ? new Date(current.startsAt).toLocaleDateString() : 'N/A'}
                      </strong>{' '}
                      to{' '}
                      <strong>
                        {current.endsAt ? new Date(current.endsAt).toLocaleDateString() : 'N/A'}
                      </strong>
                      {daysRemaining !== null && (
                        <span> · <strong>{daysRemaining}</strong> days remaining</span>
                      )}
                      {current.agreedAmountUsd && (
                        <span> · Contract Amount: <strong>${current.agreedAmountUsd.toLocaleString()} USD</strong></span>
                      )}
                      {current.externalReference && (
                        <span> · Payment Ref: <code>{current.externalReference}</code></span>
                      )}
                    </Typography>
                  )}

                  {isPending && current && (
                    <Typography variant="body2" sx={{ color: '#d97706' }}>
                      Subscription request submitted for <strong>{current.billingPeriodMonths} months</strong>.
                      {current.agreedAmountUsd && (
                        <span> Proposed Deal: <strong>${current.agreedAmountUsd.toLocaleString()} USD</strong>.</span>
                      )} Complete payment using the PayPal approval flow or the corporate wire instructions below. The subscription activates only after the provider confirms payment or an administrator reconciles the wire transfer.
                    </Typography>
                  )}

                  {!isActive && !isPending && (
                    <Typography variant="body2" sx={{ color: '#b42318' }}>
                      Your organization does not have an active enterprise subscription. Platform
                      features (assets, flight operations, inspections) are currently paused.
                    </Typography>
                  )}
                </Stack>

                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  {current && (
                    <Button
                      variant="outlined"
                      startIcon={<DescriptionRounded />}
                      onClick={() => {
                        setSelectedContract(current);
                        setContractModalOpen(true);
                      }}
                      sx={{
                        borderRadius: '8px',
                        textTransform: 'none',
                        fontWeight: 600,
                        borderColor: '#cbd5e1',
                        color: '#334155',
                      }}
                    >
                      View Electronic Contract
                    </Button>
                  )}
                  {isActive && (
                    <Button
                      variant="contained"
                      onClick={() => setShowRenewalForm(!showRenewalForm)}
                      sx={{
                        borderRadius: '8px',
                        textTransform: 'none',
                        fontWeight: 600,
                        bgcolor: '#0A968A',
                        '&:hover': { bgcolor: '#087a70' },
                      }}
                    >
                      {showRenewalForm ? 'Hide Renewal' : 'Renew Subscription'}
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Paper>

            {/* 2. Plan Request / Renewal Selection */}
            {showForm && (
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  bgcolor: '#ffffff',
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: '#0f172a' }}>
                  Select Subscription Period & Commercial Terms
                </Typography>
                <Typography variant="body2" sx={{ color: '#475467', mb: 3 }}>
                  Choose a standard term or specify a custom contract duration with negotiated corporate pricing.
                </Typography>

                <Grid container spacing={2} sx={{ mb: 3 }}>
                  {data.termsPreview.pricingTiers.map((tier) => {
                    const isSelected = !isCustomPeriod && selectedPeriod === tier.billingPeriodMonths;
                    return (
                      <Grid size={{ xs: 12, sm: 6, md: 3 }} key={tier.billingPeriodMonths}>
                        <Card
                          variant="outlined"
                          sx={{
                            borderRadius: '12px',
                            borderWidth: isSelected ? '2px' : '1px',
                            borderColor: isSelected ? '#0A968A' : '#e2e8f0',
                            bgcolor: isSelected ? 'rgba(10, 150, 138, 0.04)' : '#ffffff',
                            transition: 'all 0.15s ease',
                            height: '100%',
                          }}
                        >
                          <CardActionArea
                            onClick={() => {
                              setIsCustomPeriod(false);
                              setSelectedPeriod(tier.billingPeriodMonths);
                            }}
                            sx={{ p: 2.5, height: '100%' }}
                          >
                            <Stack spacing={1}>
                              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                  {tier.billingPeriodMonths === 1
                                    ? '1 Month'
                                    : tier.billingPeriodMonths === 6
                                      ? '6 Months'
                                      : '12 Months'}
                                </Typography>
                                {tier.savingsPercent > 0 && (
                                  <Chip
                                    label={`Save ${tier.savingsPercent}%`}
                                    size="small"
                                    color="success"
                                    sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                                  />
                                )}
                              </Stack>

                              <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a' }}>
                                ${tier.monthlyPriceUsd.toLocaleString()}
                                <Typography component="span" variant="caption" sx={{ color: '#64748b' }}>
                                  /mo
                                </Typography>
                              </Typography>

                              <Typography variant="caption" sx={{ color: '#64748b' }}>
                                Total: ${tier.totalPriceUsd.toLocaleString()} USD
                              </Typography>
                            </Stack>
                          </CardActionArea>
                        </Card>
                      </Grid>
                    );
                  })}

                  {/* 4th Card: Custom Months & Deal */}
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card
                      variant="outlined"
                      sx={{
                        borderRadius: '12px',
                        borderWidth: isCustomPeriod ? '2px' : '1px',
                        borderColor: isCustomPeriod ? '#0A968A' : '#e2e8f0',
                        bgcolor: isCustomPeriod ? 'rgba(10, 150, 138, 0.04)' : '#ffffff',
                        transition: 'all 0.15s ease',
                        height: '100%',
                      }}
                    >
                      <CardActionArea
                        onClick={() => setIsCustomPeriod(true)}
                        sx={{ p: 2.5, height: '100%' }}
                      >
                        <Stack spacing={1}>
                          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                              Custom & Deal
                            </Typography>
                            <Chip
                              icon={<HandshakeRounded sx={{ fontSize: 16 }} />}
                              label="Negotiable"
                              size="small"
                              color="primary"
                              sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                            />
                          </Stack>

                          <Typography variant="h4" sx={{ fontWeight: 800, color: '#0A968A' }}>
                            Flexible
                          </Typography>

                          <Typography variant="caption" sx={{ color: '#64748b' }}>
                            Tùy chọn số tháng & đề xuất giá
                          </Typography>
                        </Stack>
                      </CardActionArea>
                    </Card>
                  </Grid>
                </Grid>

                {/* Custom Period & Deal Negotiation Controls */}
                {isCustomPeriod && (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2.5,
                      borderRadius: '12px',
                      bgcolor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      mb: 3,
                    }}
                  >
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
                      <TuneRounded sx={{ color: '#0A968A' }} />
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a' }}>
                        Custom Duration & Commercial Deal Proposal
                      </Typography>
                    </Stack>

                    <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <TextField
                          fullWidth
                          label="Contract Duration (Số tháng)"
                          type="number"
                          slotProps={{ htmlInput: { min: 1, max: 120 } }}
                          value={customMonths}
                          onChange={(e) => setCustomMonths(Math.max(1, Math.min(120, Number(e.target.value) || 1)))}
                          helperText={`Volume Rate: $${customRateInfo.monthly}/mo (Save ${customRateInfo.discount}%)`}
                        />
                      </Grid>

                      <Grid size={{ xs: 12, sm: 8 }}>
                        <Box sx={{ p: 1.5, bgcolor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                            STANDARD ESTIMATE FOR {customMonths} MONTHS
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                            ${customStandardTotal.toLocaleString()} USD
                            <Typography component="span" variant="body2" sx={{ color: '#64748b', ml: 1 }}>
                              (${customRateInfo.monthly.toLocaleString()} / month)
                            </Typography>
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>

                    <Divider sx={{ my: 2 }} />

                    {/* Toggle for Deal Giá */}
                    <FormControlLabel
                      control={
                        <Switch
                          checked={enablePriceDeal}
                          onChange={(e) => setEnablePriceDeal(e.target.checked)}
                          color="primary"
                        />
                      }
                      label={
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                          Propose Custom Budget / Request Commercial Discount (Deal giá thỏa thuận)
                        </Typography>
                      }
                    />

                    {enablePriceDeal && (
                      <Stack spacing={2} sx={{ mt: 2 }}>
                        <TextField
                          fullWidth
                          label="Proposed Total Budget in USD (Mức giá đề xuất)"
                          placeholder={`e.g. ${Math.round(customStandardTotal * 0.9)}`}
                          value={proposedPrice}
                          onChange={(e) => setProposedPrice(e.target.value)}
                          helperText="Enter your proposed enterprise budget or pre-negotiated commercial contract sum."
                        />

                        <TextField
                          fullWidth
                          multiline
                          rows={2}
                          label="Proposal Rationale / Negotiation Notes (Ghi chú lý do / đề xuất)"
                          placeholder="e.g. Multi-facility annual volume discount; upfront annual wire transfer clearance."
                          value={negotiationNotes}
                          onChange={(e) => setNegotiationNotes(e.target.value)}
                        />
                      </Stack>
                    )}
                  </Paper>
                )}

                {/* Terms Accordion */}
                <Box sx={{ mb: 3 }}>
                  <Button
                    size="small"
                    startIcon={<GavelRounded />}
                    endIcon={termsExpanded ? <ExpandLessRounded /> : <ExpandMoreRounded />}
                    onClick={() => setTermsExpanded(!termsExpanded)}
                    sx={{ textTransform: 'none', color: '#475467', fontWeight: 600, mb: 1 }}
                  >
                    Enterprise Terms of Service (Version {data.termsPreview.version})
                  </Button>

                  <Collapse in={termsExpanded}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2.5,
                        borderRadius: '10px',
                        bgcolor: '#f8fafc',
                        maxHeight: 280,
                        overflowY: 'auto',
                        mb: 2,
                      }}
                    >
                      <Stack spacing={2}>
                        {data.termsPreview.clauses.map((clause) => (
                          <Box key={clause.id}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                              {clause.title}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#475467', mt: 0.25 }}>
                              {clause.text}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    </Paper>
                  </Collapse>

                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        color="primary"
                      />
                    }
                    label={
                      <Typography variant="body2" sx={{ fontWeight: 500, color: '#0f172a' }}>
                        I confirm that I am an authorized representative of my organization and agree to the
                        Enterprise Terms of Service (Version {data.termsPreview.version}).
                      </Typography>
                    }
                  />
                </Box>

                <LoadingButton
                  variant="contained"
                  onClick={handleSubmitRequest}
                  disabled={!agreedToTerms}
                  loading={createMutation.isPending}
                  startIcon={<CheckCircleRounded />}
                  sx={{
                    bgcolor: '#0A968A',
                    '&:hover': { bgcolor: '#087f75' },
                    borderRadius: '8px',
                    fontWeight: 700,
                    textTransform: 'none',
                    px: 3,
                    py: 1,
                  }}
                >
                  {isActive ? 'Submit Renewal Request' : 'Submit Subscription Request'}
                </LoadingButton>
              </Paper>
            )}

            {/* 3. Payment Processing Panel: PayPal Online Checkout & Offline Wire */}
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                bgcolor: '#ffffff',
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>
                Payment & Entitlement Activation
              </Typography>
              <Typography variant="body2" sx={{ color: '#475467', mb: 2 }}>
                Complete payment to activate or extend your enterprise workspace entitlement.
              </Typography>

              <Tabs
                value={paymentTab}
                onChange={(_, val) => setPaymentTab(val)}
                sx={{ borderBottom: '1px solid #e2e8f0', mb: 3 }}
              >
                <Tab
                  icon={<PaymentRounded />}
                  iconPosition="start"
                  label="PayPal Online Checkout"
                  value="PAYPAL"
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                />
                <Tab
                  icon={<AccountBalanceRounded />}
                  iconPosition="start"
                  label="Corporate Wire Transfer"
                  value="WIRE"
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                />
              </Tabs>

              {paymentTab === 'PAYPAL' && (
                <Box sx={{ p: 2.5, bgcolor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <Stack spacing={2}>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                      <PaymentRounded sx={{ color: '#0070BA', fontSize: 28 }} />
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a' }}>
                          PayPal Orders v2 Hosted Approval
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                          PayPal hosts payer approval. The server captures the order and verifies the settled amount before activating the subscription.
                        </Typography>
                      </Box>
                    </Stack>

                    <Alert severity="info" sx={{ borderRadius: '8px' }}>
                      {current?.agreedAmountUsd
                        ? 'Platform-approved contract amount:'
                        : 'Standard contract amount:'}{' '}
                      <strong>
                        ${(current?.agreedAmountUsd ?? data.paymentInstructions.amountUsd).toLocaleString()} USD
                      </strong>{' '}
                      for {current?.billingPeriodMonths ?? 12} months. A customer price proposal is not an approved amount.
                    </Alert>

                    {isPending && current?.termsSnapshot?.proposedPriceUsd && !current.agreedAmountUsd ? (
                      <Alert severity="warning" sx={{ borderRadius: '8px' }}>
                        Your proposed deal price has not been approved. PayPal checkout is unavailable
                        until the platform confirms a final contract amount. Use the wire instructions
                        only after the amount is agreed through your contract process.
                      </Alert>
                    ) : isPending && current ? (
                      <Stack spacing={1.5}>
                        <LoadingButton
                          variant="contained"
                          size="large"
                          loading={createPayPalOrderMutation.isPending || capturePayPalOrderMutation.isPending}
                          onClick={() => {
                            if (pendingPaypalOrder?.subscriptionId === current.id) {
                              capturePendingPayPalOrder(pendingPaypalOrder);
                            } else {
                              handleStartPayPalCheckout();
                            }
                          }}
                          startIcon={<PaymentRounded />}
                          sx={{
                            bgcolor: '#0070BA',
                            '&:hover': { bgcolor: '#005ea6' },
                            fontWeight: 700,
                            textTransform: 'none',
                            borderRadius: '8px',
                            py: 1.25,
                            fontSize: '1rem',
                          }}
                        >
                          {pendingPaypalOrder?.subscriptionId === current.id
                            ? 'Retry PayPal Capture'
                            : `Checkout with PayPal ($${(current.agreedAmountUsd ?? data.paymentInstructions.amountUsd).toLocaleString()} USD)`}
                        </LoadingButton>
                      </Stack>
                    ) : (
                      <Typography variant="body2" sx={{ color: '#64748b' }}>
                        Your subscription is currently {current?.status}. Request a new term above to initiate checkout.
                      </Typography>
                    )}
                  </Stack>
                </Box>
              )}

              {paymentTab === 'WIRE' && (
                <Stack spacing={2}>
                  <Typography variant="body2" sx={{ color: '#475467' }}>
                    {data.paymentInstructions.instructions}
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                          BENEFICIARY BANK
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a', mt: 0.5 }}>
                          {data.paymentInstructions.bankName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5 }}>
                          SWIFT / BIC: <code>{data.paymentInstructions.swiftBic}</code>
                        </Typography>
                      </Box>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                          BENEFICIARY ACCOUNT
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a', mt: 0.5 }}>
                          {data.paymentInstructions.accountName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5 }}>
                          Account: <code>{data.paymentInstructions.accountNumber}</code>
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  <Box
                    sx={{
                      p: 2,
                      bgcolor: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px dashed #0A968A',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Box>
                      <Typography variant="caption" sx={{ color: '#0A968A', fontWeight: 700, display: 'block' }}>
                        REQUIRED PAYMENT REFERENCE CODE (NỘI DUNG CHUYỂN KHOẢN)
                      </Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', mt: 0.25 }}>
                        {data.paymentInstructions.referenceCode}
                      </Typography>
                    </Box>
                    <Tooltip title="Copy reference code">
                      <IconButton
                        onClick={() => handleCopyReference(data.paymentInstructions.referenceCode)}
                        color="primary"
                      >
                        <ContentCopyRounded />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Stack>
              )}
            </Paper>

            {/* 4. Payment Transactions & Receipts */}
            {transactions && transactions.length > 0 && (
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  bgcolor: '#ffffff',
                }}
              >
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
                  <ReceiptRounded sx={{ color: '#0070BA', fontSize: 24 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>
                    Payment Transactions & Settlement Receipts
                  </Typography>
                </Stack>

                <Stack spacing={1.5} divider={<Divider />}>
                  {transactions.map((tx) => (
                    <Box
                      key={tx.id}
                      sx={{
                        py: 1,
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        justifyContent: 'space-between',
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        gap: 1,
                      }}
                    >
                      <Box>
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            ${tx.amount.toLocaleString()} {tx.currency}
                          </Typography>
                          <Chip
                            label={tx.status}
                            size="small"
                            color={tx.status === 'COMPLETED' ? 'success' : 'default'}
                            sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                          />
                        </Stack>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                          PayPal Order ID: <code>{tx.paypalOrderId}</code>
                          {tx.paypalCaptureId && (
                            <> · Capture ID: <code>{tx.paypalCaptureId}</code></>
                          )}
                          {tx.capturedAt && <> · {new Date(tx.capturedAt).toLocaleString()}</>}
                        </Typography>
                      </Box>
                      {tx.payerEmail && (
                        <Typography variant="caption" sx={{ color: '#475467' }}>
                          Payer: {tx.payerEmail}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Stack>
              </Paper>
            )}

            {/* 5. Subscription History */}
            {data.history && data.history.length > 0 && (
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  bgcolor: '#ffffff',
                }}
              >
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
                  <HistoryRounded sx={{ color: '#475467', fontSize: 24 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>
                    Subscription History
                  </Typography>
                </Stack>

                <Stack spacing={1.5} divider={<Divider />}>
                  {data.history.map((item) => (
                    <Box
                      key={item.id}
                      sx={{
                        py: 1,
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        justifyContent: 'space-between',
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        gap: 1,
                      }}
                    >
                      <Box>
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {item.planCode} · {item.billingPeriodMonths} Months
                            {item.agreedAmountUsd && (
                              <Typography component="span" variant="body2" sx={{ color: '#0A968A', ml: 1, fontWeight: 700 }}>
                                (${item.agreedAmountUsd.toLocaleString()} USD)
                              </Typography>
                            )}
                          </Typography>
                          <StatusChip status={item.status} />
                        </Stack>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                          Created: {new Date(item.createdAt).toLocaleDateString()}
                          {item.startsAt && item.endsAt && (
                            <span>
                              {' '}· Window: {new Date(item.startsAt).toLocaleDateString()} –{' '}
                              {new Date(item.endsAt).toLocaleDateString()}
                            </span>
                          )}
                        </Typography>
                      </Box>

                      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                        {item.externalReference ? (
                          <Typography variant="caption" sx={{ color: '#475467' }}>
                            Ref: <code>{item.externalReference}</code>
                          </Typography>
                        ) : (
                          <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                            Pending payment reference
                          </Typography>
                        )}
                        <Button
                          size="small"
                          variant="text"
                          startIcon={<DescriptionRounded sx={{ fontSize: 16 }} />}
                          onClick={() => {
                            setSelectedContract(item);
                            setContractModalOpen(true);
                          }}
                          sx={{ textTransform: 'none', fontSize: '0.75rem', fontWeight: 600, color: '#0A968A' }}
                        >
                          Contract PDF
                        </Button>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </Paper>
            )}
          </Stack>
        )}
      </QueryState>

      {/* Official Electronic Contract Document Modal */}
      <ContractDocumentModal
        open={contractModalOpen}
        onClose={() => setContractModalOpen(false)}
        subscription={selectedContract ?? current ?? null}
      />
    </Box>
  );
}
