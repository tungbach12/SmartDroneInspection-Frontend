import { api } from '@/shared/api/client';

export interface MaintenanceTicketSummary {
  id: string;
  organizationId: string;
  assetId: string;
  acceptedReportVersionId: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status: string;
  resolutionDecision: string | null;
  preferredDeadline: string | null;
  createdAt: string;
  acceptedAt: string | null;
  closedAt: string | null;
}

export interface MaintenanceTicketDetail extends MaintenanceTicketSummary {
  createdByUserId: string;
  instructions: string | null;
  warrantyStartedAt: string | null;
  warrantyEndsAt: string | null;
  releasedAt: string | null;
  updatedAt: string;
  findingIds: string[];
}

export interface CreateTicketInput {
  assetId: string;
  acceptedReportVersionId: string;
  findingIds: string[];
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  preferredDeadline?: string | null;
  instructions?: string | null;
}

export interface MaintenanceQuotation {
  id: string;
  quotationSeriesId: string;
  maintenanceTicketId: string;
  maintenanceAssessmentId: string;
  versionNumber: number;
  previousVersionId: string | null;
  preparedByUserId: string;
  providerId: string | null;
  lockedWarrantyDays: number;
  currency: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  pricingDetails: string;
  scopeSnapshot: string;
  paymentTerms: string;
  status: 'DRAFT' | 'SENT' | 'REVISION_REQUESTED' | 'APPROVED' | 'REJECTED' | 'SUPERSEDED';
  sentAt: string | null;
  decidedByUserId: string | null;
  decidedAt: string | null;
  revisionReason: string | null;
  createdAt: string;
}

export interface CreateQuotationInput {
  assessmentMode: 'REMOTE' | 'ON_SITE';
  requiredWork: string;
  materialsEstimate: string;
  laborHoursEstimate: number;
  durationHoursEstimate: number;
  riskNotes?: string;
  assumptions?: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  pricingDetails: string;
  scopeSnapshot: string;
  paymentTerms: string;
  lockedWarrantyDays: number;
}

export interface MaintenanceOrder {
  id: string;
  orderSeriesId: string;
  orderNumber: string;
  maintenanceTicketId: string;
  approvedQuotationId: string | null;
  changeRequestId: string | null;
  versionNumber: number;
  previousVersionId: string | null;
  scopeSnapshot: string;
  approvedAmount: number;
  currency: string;
  paymentTerms: string;
  status: 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'SUPERSEDED' | 'CANCELLED' | 'AWAITING_PAYMENT' | 'PAID' | 'DISPUTED';
  approvedByUserId: string;
  approvedAt: string;
  providerId: string | null;
  lockedWarrantyDays: number | null;
  warrantyEndDate: string | null;
  paymentInvoiceIssuedAt: string | null;
  paidAt: string | null;
  providerBankAccountNumber: string | null;
  providerBankName: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface MaintenanceWorkLog {
  id: string;
  maintenanceTicketId: string;
  executionAssignmentId: string;
  engineerUserId: string;
  startedAt: string;
  endedAt: string | null;
  progressPercent: number;
  workSummary: string;
  materialsUsed: string;
  laborHours: number;
  actualCost: number | null;
  currency: string | null;
  status: string;
  beforeEvidenceId: string;
  afterEvidenceId: string;
  submittedAt: string | null;
  verifiedByUserId: string | null;
  verifiedAt: string | null;
  createdAt: string;
}

export interface SubmitWorkLogInput {
  executionAssignmentId: string;
  startedAt: string;
  endedAt?: string;
  progressPercent: number;
  workSummary: string;
  materialsUsed: string;
  laborHours: number;
  actualCost?: number;
  currency?: string;
  beforeEvidenceId: string;
  afterEvidenceId: string;
}

export interface MaintenanceAssignment {
  id: string;
  maintenanceTicketId: string;
  maintenanceOrderId: string | null;
  engineerUserId: string;
  assignedByUserId: string;
  assignmentType: 'ASSESSMENT' | 'EXECUTION' | 'REWORK';
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';
  deadline: string | null;
  respondedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export const maintenanceApi = {
  createTicket: (input: CreateTicketInput) =>
    api.post<string>('/maintenance-tickets', input).then((r) => r.data),

  getTicketDetail: (id: string) =>
    api.get<MaintenanceTicketDetail>(`/maintenance-tickets/${id}`).then((r) => r.data),

  listTickets: () =>
    api.get<PagedResponse<MaintenanceTicketSummary>>('/maintenance-tickets').then((r) => r.data),

  createQuotation: (ticketId: string, input: CreateQuotationInput) =>
    api.post<string>(`/maintenance-quotations/tickets/${ticketId}`, input).then((r) => r.data),

  approveQuotation: (id: string) =>
    api.post<void>(`/maintenance-quotations/${id}/approve`).then((r) => r.data),

  rejectQuotation: (id: string, reason?: string) =>
    api.post<void>(`/maintenance-quotations/${id}/reject`, null, { params: { reason } }).then((r) => r.data),

  listQuotationsForTicket: (ticketId: string) =>
    api.get<MaintenanceQuotation[]>(`/maintenance-quotations/tickets/${ticketId}`).then((r) => r.data),

  createOrder: (quotationId: string) =>
    api.post<string>(`/maintenance-orders/quotations/${quotationId}`).then((r) => r.data),

  getOrderDetail: (id: string) =>
    api.get<MaintenanceOrder>(`/maintenance-orders/${id}`).then((r) => r.data),

  listOrdersForTicket: (ticketId: string) =>
    api.get<MaintenanceOrder[]>(`/maintenance-orders/tickets/${ticketId}`).then((r) => r.data),

  acceptCompletion: (id: string) =>
    api.post<void>(`/maintenance-orders/${id}/accept-completion`).then((r) => r.data),

  confirmPayment: (id: string, bankAccountNumber: string, bankName: string) =>
    api.post<void>(`/maintenance-orders/${id}/confirm-payment`, null, {
      params: { bankAccountNumber, bankName },
    }).then((r) => r.data),

  assignEngineer: (orderId: string, engineerUserId: string, assignmentType = 'EXECUTION', deadline?: string) =>
    api.post<string>(`/maintenance-execution/orders/${orderId}/assignments`, {
      engineerUserId,
      assignmentType,
      deadline,
    }).then((r) => r.data),

  listMyAssignments: () =>
    api.get<MaintenanceAssignment[]>('/maintenance-execution/my-assignments').then((r) => r.data),

  uploadEvidence: (orderId: string, kind: 'BEFORE_MAINTENANCE' | 'AFTER_MAINTENANCE', file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<string>(`/maintenance-execution/orders/${orderId}/evidence`, formData, {
      params: { kind },
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },

  submitWorkLog: (orderId: string, input: SubmitWorkLogInput) =>
    api.post<string>(`/maintenance-execution/orders/${orderId}/work-logs`, input).then((r) => r.data),

  verifyWorkLog: (workLogId: string) =>
    api.post<void>(`/maintenance-execution/work-logs/${workLogId}/verify`).then((r) => r.data),

  listWorkLogsForTicket: (ticketId: string) =>
    api.get<MaintenanceWorkLog[]>(`/maintenance-execution/tickets/${ticketId}/work-logs`).then((r) => r.data),
};
