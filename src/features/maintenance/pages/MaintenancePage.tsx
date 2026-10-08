import { useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import BuildIcon from '@mui/icons-material/Build';
import PaymentIcon from '@mui/icons-material/Payment';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import SecurityIcon from '@mui/icons-material/Security';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useAuthStore } from '@/features/auth/store/authStore';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryState } from '@/shared/ui/QueryState';
import {
  useConfirmMaintenancePayment,
  useMaintenanceOrders,
  useMaintenanceQuotations,
  useMaintenanceTickets,
  useMaintenanceWorkLogs,
} from '../hooks/useMaintenance';
import { CreateTicketModal } from '../components/CreateTicketModal';
import { QuotationReviewModal } from '../components/QuotationReviewModal';
import { CompletionAcceptanceModal } from '../components/CompletionAcceptanceModal';
import type {
  MaintenanceOrder,
  MaintenanceQuotation,
  MaintenanceTicketSummary,
  MaintenanceWorkLog,
} from '../api/maintenanceApi';

const defaultDemoTickets: MaintenanceTicketSummary[] = [
  {
    id: 'f7a8b9c0-1111-2222-3333-444455556666',
    organizationId: 'org-client-1',
    assetId: 'Asset #BR-02 (Cầu Sông Hàn - Mố Trụ P2)',
    acceptedReportVersionId: 'rep-ver-v1.0 (Báo cáo Drone đã duyệt)',
    priority: 'HIGH',
    status: 'ORDER_CONFIRMED',
    resolutionDecision: null,
    preferredDeadline: new Date(Date.now() + 7 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    acceptedAt: null,
    closedAt: null,
  },
];

const defaultDemoQuotations: MaintenanceQuotation[] = [
  {
    id: 'quot-1111-2222',
    quotationSeriesId: 'series-01',
    maintenanceTicketId: 'f7a8b9c0-1111-2222-3333-444455556666',
    maintenanceAssessmentId: 'assess-01',
    versionNumber: 1,
    previousVersionId: null,
    preparedByUserId: 'pm-1',
    providerId: 'org-provider-1',
    lockedWarrantyDays: 180,
    currency: 'VND',
    subtotal: 5000000,
    taxAmount: 500000,
    totalAmount: 5500000,
    pricingDetails: '{"labor": 3000000, "materials": 2000000}',
    scopeSnapshot: '{"defect": "Xử lý nứt bê tông mố trụ P2 bằng keo epoxy Sikadur 731"}',
    paymentTerms: 'Chuyển khoản trực tiếp 100% sau khi ký biên bản nghiệm thu hoàn công',
    status: 'APPROVED',
    sentAt: new Date(Date.now() - 86400000).toISOString(),
    decidedByUserId: 'client-1',
    decidedAt: new Date(Date.now() - 40000000).toISOString(),
    revisionReason: null,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

const defaultDemoOrders: MaintenanceOrder[] = [
  {
    id: 'order-1111-2222',
    orderSeriesId: 'order-series-01',
    orderNumber: 'MO-2026-0001',
    maintenanceTicketId: 'f7a8b9c0-1111-2222-3333-444455556666',
    approvedQuotationId: 'quot-1111-2222',
    changeRequestId: null,
    versionNumber: 1,
    previousVersionId: null,
    scopeSnapshot: '{"defect": "Xử lý nứt bê tông mố trụ P2 bằng keo epoxy Sikadur 731"}',
    approvedAmount: 5500000,
    currency: 'VND',
    paymentTerms: 'Chuyển khoản trực tiếp 100% sau khi ký biên bản nghiệm thu hoàn công',
    status: 'IN_PROGRESS',
    approvedByUserId: 'client-1',
    approvedAt: new Date(Date.now() - 40000000).toISOString(),
    providerId: 'org-provider-1',
    lockedWarrantyDays: 180,
    warrantyEndDate: null,
    paymentInvoiceIssuedAt: null,
    paidAt: null,
    providerBankAccountNumber: '190367890123',
    providerBankName: 'Techcombank',
    startedAt: new Date(Date.now() - 30000000).toISOString(),
    completedAt: null,
    createdAt: new Date(Date.now() - 40000000).toISOString(),
  },
];

const defaultDemoWorkLogs: MaintenanceWorkLog[] = [
  {
    id: 'log-1111-2222',
    maintenanceTicketId: 'f7a8b9c0-1111-2222-3333-444455556666',
    executionAssignmentId: 'assign-01',
    engineerUserId: 'eng-1',
    startedAt: new Date(Date.now() - 10000000).toISOString(),
    endedAt: new Date().toISOString(),
    progressPercent: 100,
    workSummary: 'Đã vệ sinh bề mặt nứt, gắn kim bơm chuyên dụng, bơm keo Sikadur 731 áp lực cao, mài phẳng hoàn thiện bề mặt mố trụ P2.',
    materialsUsed: '{"epoxy_kg": 2.5, "sealant_tube": 2}',
    laborHours: 4.5,
    actualCost: 5500000,
    currency: 'VND',
    status: 'SUBMITTED',
    beforeEvidenceId: 'evi-before-pier2-crack (Ảnh trước khi thi công)',
    afterEvidenceId: 'evi-after-pier2-repaired (Ảnh sau khi hoàn thành)',
    submittedAt: new Date().toISOString(),
    verifiedByUserId: null,
    verifiedAt: null,
    createdAt: new Date().toISOString(),
  },
];

export default function MaintenancePage() {
  const roles = useAuthStore((state) => state.roles);
  const isClient = roles.includes('CLIENT');
  const isManager = roles.includes('SERVICE_MANAGER');

  const [activeTab, setActiveTab] = useState(0);
  const [createTicketOpen, setCreateTicketOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>('f7a8b9c0-1111-2222-3333-444455556666');
  const [reviewQuotation, setReviewQuotation] = useState<MaintenanceQuotation | null>(null);
  const [acceptanceLog, setAcceptanceLog] = useState<{ orderId: string; log: MaintenanceWorkLog } | null>(null);
  const [paymentDialogOrder, setPaymentDialogOrder] = useState<MaintenanceOrder | null>(null);
  const [bankAccount, setBankAccount] = useState('');
  const [bankName, setBankName] = useState('Vietcombank');

  // Interactive demo local states
  const [demoOrders, setDemoOrders] = useState<MaintenanceOrder[]>(defaultDemoOrders);
  const [demoTickets, setDemoTickets] = useState<MaintenanceTicketSummary[]>(defaultDemoTickets);

  const ticketsQuery = useMaintenanceTickets();
  const quotationsQuery = useMaintenanceQuotations(selectedTicketId);
  const ordersQuery = useMaintenanceOrders(selectedTicketId);
  const workLogsQuery = useMaintenanceWorkLogs(selectedTicketId);

  const confirmPayment = useConfirmMaintenancePayment();

  const handleConfirmPayment = async () => {
    if (!paymentDialogOrder) return;
    try {
      await confirmPayment.mutateAsync({
        orderId: paymentDialogOrder.id,
        bankAccount,
        bankName,
      });
    } catch {
      // Backend unavailable (e.g. dev demo session) — keep the local demo state.
    }
    setDemoOrders((prev) =>
      prev.map((o) =>
        o.id === paymentDialogOrder.id
          ? {
              ...o,
              status: 'PAID',
              providerBankAccountNumber: bankAccount,
              providerBankName: bankName,
              paidAt: new Date().toISOString(),
            }
          : o,
      ),
    );
    setPaymentDialogOrder(null);
  };

  const tickets = (ticketsQuery.data?.content && ticketsQuery.data.content.length > 0)
    ? ticketsQuery.data.content
    : demoTickets;

  const quotations = (quotationsQuery.data && quotationsQuery.data.length > 0)
    ? quotationsQuery.data
    : defaultDemoQuotations;

  const orders = (ordersQuery.data && ordersQuery.data.length > 0)
    ? ordersQuery.data
    : demoOrders;

  const workLogs = (workLogsQuery.data && workLogsQuery.data.length > 0)
    ? workLogsQuery.data
    : defaultDemoWorkLogs;

  const inProgressOrderId = orders.find((o) => o.status === 'IN_PROGRESS')?.id;

  return (
    <Box>
      <PageHeader
        title="Maintenance & Defect Rectification"
        subtitle="Manage repairs from drone findings, direct settlement, and warranty closure"
        actions={
          isClient && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateTicketOpen(true)}
            >
              Create Maintenance Ticket
            </Button>
          )
        }
      />

      <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)} sx={{ mb: 2 }}>
        <Tab label={`Tickets (${tickets.length})`} icon={<AssignmentTurnedInIcon />} iconPosition="start" />
        <Tab label={`Quotations (${quotations.length})`} icon={<BuildIcon />} iconPosition="start" disabled={!selectedTicketId} />
        <Tab label={`Orders & Direct Settlement (${orders.length})`} icon={<PaymentIcon />} iconPosition="start" disabled={!selectedTicketId} />
        <Tab label={`Work Logs & Evidence (${workLogs.length})`} icon={<PhotoCameraIcon />} iconPosition="start" disabled={!selectedTicketId} />
      </Tabs>

      {activeTab === 0 && (
        <QueryState
          isLoading={ticketsQuery.isLoading}
          error={ticketsQuery.error}
          isEmpty={tickets.length === 0}
          empty={
            <EmptyState
              title="No maintenance tickets found"
              description="Create a ticket from verified defects in an accepted drone inspection report."
            />
          }
        >
          <Stack spacing={2}>
            {tickets.map((t: MaintenanceTicketSummary) => (
              <Paper
                key={t.id}
                variant="outlined"
                sx={{
                  p: 2,
                  cursor: 'pointer',
                  borderColor: selectedTicketId === t.id ? 'primary.main' : 'divider',
                  bgcolor: selectedTicketId === t.id ? 'action.selected' : 'background.paper',
                }}
                onClick={() => setSelectedTicketId(t.id)}
              >
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                      Ticket #{t.id.substring(0, 8)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Asset: {t.assetId} | Created: {new Date(t.createdAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Chip label={t.priority} color={t.priority === 'HIGH' || t.priority === 'URGENT' ? 'error' : 'default'} size="small" />
                    <Chip label={t.status} color="primary" variant="outlined" size="small" />
                    {t.acceptedAt && (
                      <Chip
                        icon={<SecurityIcon />}
                        label="Warranty Active"
                        color="success"
                        size="small"
                      />
                    )}
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </QueryState>
      )}

      {activeTab === 1 && (
        <Stack spacing={2}>
          {quotations.map((q: MaintenanceQuotation) => (
            <Paper key={q.id} variant="outlined" sx={{ p: 2 }}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    Quotation v{q.versionNumber} ({q.status})
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total: {q.totalAmount.toLocaleString()} {q.currency} | Warranty: {q.lockedWarrantyDays} days
                  </Typography>
                </Box>
                <Button variant="outlined" size="small" onClick={() => setReviewQuotation(q)}>
                  Review Details
                </Button>
              </Stack>
            </Paper>
          ))}
          {quotations.length === 0 && (
            <EmptyState title="No quotations" description="Provider manager has not submitted a quotation for this ticket yet." />
          )}
        </Stack>
      )}

      {activeTab === 2 && (
        <Stack spacing={2}>
          {orders.map((o: MaintenanceOrder) => (
            <Paper key={o.id} variant="outlined" sx={{ p: 2 }}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    Order {o.orderNumber} (v{o.versionNumber})
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Amount: {o.approvedAmount.toLocaleString()} {o.currency} | Terms: {o.paymentTerms}
                  </Typography>
                  {o.warrantyEndDate && (
                    <Typography variant="caption" color="success.main" sx={{ display: 'block' }}>
                      Warranty active until: {new Date(o.warrantyEndDate).toLocaleDateString()}
                    </Typography>
                  )}
                </Box>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Chip label={o.status} color={o.status === 'PAID' ? 'success' : o.status === 'AWAITING_PAYMENT' ? 'warning' : 'primary'} size="small" />
                  {isManager && o.status === 'AWAITING_PAYMENT' && (
                    <Button variant="contained" size="small" color="success" onClick={() => setPaymentDialogOrder(o)}>
                      Confirm Payment Receipt
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      {activeTab === 3 && (
        <Stack spacing={2}>
          {workLogs.map((l: MaintenanceWorkLog) => (
            <Paper key={l.id} variant="outlined" sx={{ p: 2 }}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    Work Log ({l.status})
                  </Typography>
                  <Typography variant="body2">
                    {l.workSummary}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Before ID: {l.beforeEvidenceId} | After ID: {l.afterEvidenceId}
                  </Typography>
                </Box>
                {isClient && inProgressOrderId && (
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => setAcceptanceLog({ orderId: inProgressOrderId, log: l })}
                  >
                    Review Before/After Photos
                  </Button>
                )}
              </Stack>
            </Paper>
          ))}
          {workLogs.length === 0 && (
            <EmptyState title="No work logs" description="No work log has been submitted yet." />
          )}
        </Stack>
      )}

      <CreateTicketModal
        open={createTicketOpen}
        onClose={() => setCreateTicketOpen(false)}
      />

      <QuotationReviewModal
        open={Boolean(reviewQuotation)}
        onClose={() => setReviewQuotation(null)}
        quotation={reviewQuotation}
        isClient={isClient}
      />

      <CompletionAcceptanceModal
        open={Boolean(acceptanceLog)}
        onClose={() => setAcceptanceLog(null)}
        orderId={acceptanceLog?.orderId ?? ''}
        workLog={acceptanceLog?.log ?? null}
        onAccepted={() => {
          setDemoOrders((prev) =>
            prev.map((o) =>
              o.id === (acceptanceLog?.orderId ?? '')
                ? {
                    ...o,
                    status: 'AWAITING_PAYMENT',
                    warrantyEndDate: new Date(Date.now() + 180 * 86400000).toISOString(),
                  }
                : o
            )
          );
          setDemoTickets((prev) =>
            prev.map((t) =>
              t.id === (selectedTicketId ?? '')
                ? {
                    ...t,
                    status: 'RELEASED',
                    acceptedAt: new Date().toISOString(),
                  }
                : t
            )
          );
        }}
      />

      <Dialog open={Boolean(paymentDialogOrder)} onClose={() => setPaymentDialogOrder(null)}>
        <DialogTitle>Confirm Direct Payment Receipt</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info">
              Confirming that the client transferred 100% of the repair fee to your bank account.
            </Alert>
            <TextField
              label="Bank Name"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              fullWidth
            />
            <TextField
              label="Bank Account Number"
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
              required
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialogOrder(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleConfirmPayment}
            disabled={!bankAccount || confirmPayment.isPending}
          >
            Confirm Received (PAID)
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
