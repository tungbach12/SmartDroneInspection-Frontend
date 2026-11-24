import { api } from '@/shared/api/client';

export type ServiceRequestStatus =
  | 'OPEN'
  | 'QUOTED'
  | 'ACCEPTED'
  | 'CONTRACT_SIGNED'
  | 'ASSIGNED'
  | 'CANCELLED';

export type ServiceRequestType = 'ONE_TIME' | 'RECURRING';

export interface ServiceRequestMessageAttachment {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  checksumSha256: string;
  createdAt: string;
}

export interface ServiceRequestMessage {
  id: string;
  authorUserId: string;
  authorName?: string | null;
  authorRole?: string | null;
  body: string;
  createdAt: string;
  readAt?: string | null;
  attachments?: ServiceRequestMessageAttachment[];
}

export interface ServiceManagerContact {
  id: string;
  fullName: string | null;
  email: string | null;
  phoneNumber: string | null;
  avatarUrl: string | null;
}

export interface ServiceRequestQuote {
  id: string;
  scopeSnapshot: string;
  firstOccurrenceStartAt: string;
  firstOccurrenceEndAt: string;
  inspectorId: string;
  droneId: string;
  currency?: string;
  pricePerOccurrenceVnd?: number | null;
  pricePerOccurrenceUsd: number;
  issuedByUserId: string;
  createdAt: string;
  updatedAt: string;
  updatedByUserId: string;
  rowVersion: number;
  requiredDroneFeatureCodes: string[];
}

export interface ServiceInvoiceSummary {
  totalPrice: number | null;
  vatRate: number | null;
  commissionRate: number | null;
  tncnRate: number | null;
  reportAcceptedAt: string | null;
}

export interface ServicePaymentSummary {
  status: 'PENDING' | 'PAYMENT_DUE' | 'PAID' | null;
  gatewayOrderCode: number | null;
  method: string | null;
  reference: string | null;
  confirmedAt: string | null;
}

export interface InspectorPayoutSummary {
  inspectorId: string | null;
  status: 'PENDING' | 'ELIGIBLE' | 'PAID' | null;
  reference: string | null;
  recordedAt: string | null;
  heldForRefund?: boolean;
  finalPayoutAmount?: number | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankAccountHolder?: string | null;
  bankBranch?: string | null;
}

export interface InspectorReceivableRecoverySummary {
  id: string;
  amount: number;
  externalReference: string;
  note: string;
  recordedByUserId: string;
  recordedAt: string;
}

export interface InspectorReceivableSummary {
  id: string;
  refundId: string;
  assessedAmount: number;
  recoveredAmount: number;
  outstandingAmount: number;
  sourceReference: string;
  reason: string;
  recoveries: InspectorReceivableRecoverySummary[];
}

export interface ServiceRefundSummary {
  id: string;
  amount: number;
  status: 'INITIATED' | 'COMPLETED' | 'CANCELLED';
  requestReference: string | null;
  reasonCode: string | null;
  serviceStage: string | null;
  contractClauseReference: string | null;
  evidenceReference: string | null;
  caseReason: string | null;
  inspectorReceivableAmount: number | null;
  platformAbsorbedPlanAmount: number | null;
  initiatedByUserId: string | null;
  initiatedAt: string | null;
  completedByUserId: string | null;
  completedAt: string | null;
  cancelledByUserId: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  inspectorPayoutReduction: number | null;
  platformCommissionAdjustment: number | null;
  vatAdjustment: number | null;
  tncnAdjustment: number | null;
  platformAbsorbedAmount: number | null;
  reference: string | null;
  reason: string | null;
  recordedByUserId: string | null;
  allocationReconciledByUserId?: string | null;
  allocationReconciliationReference?: string | null;
  allocationReconciliationNote?: string | null;
  allocationReconciledAt?: string | null;
  recordedAt: string;
}

export interface OccurrenceFinanceDetails {
  refunds: ServiceRefundSummary[];
  inspectorReceivables: InspectorReceivableSummary[];
}

export interface OccurrenceFinanceHistoryItem {
  occurrenceId: string;
  requestId: string;
  occurrenceIndex: number;
  requestDescription: string | null;
  assetId: string | null;
  assetName: string | null;
  counterpartyId: string | null;
  counterpartyName: string | null;
  currency: string;
  amount: number | null;
  status: string;
  paymentMethod: string | null;
  reference: string | null;
  confirmedAt: string | null;
}

export interface OccurrenceFinanceHistoryPage {
  content: OccurrenceFinanceHistoryItem[];
  totalElements: number;
  page: number;
  size: number;
}

export interface OccurrenceFinanceHistoryDetail {
  occurrenceId: string;
  requestId: string;
  occurrenceIndex: number;
  currency: string;
  totalPrice: number | null;
  serviceBaseAmount: number | null;
  vatRate?: number | null;
  vatAmount: number | null;
  commissionRate?: number | null;
  commissionAmount: number | null;
  inspectorGrossPayout: number | null;
  tncnRate?: number | null;
  tncnAmount: number | null;
  inspectorNetPayout: number | null;
  paymentStatus: string;
  paymentAmount: number | null;
  refundedAmount: number | null;
  refundStatus: string | null;
  refunds: Array<{ id: string; amount: number; status: string; recordedAt: string }>;
  paymentConfirmedAt: string | null;
  payoutStatus: string | null;
  payoutReference: string | null;
  payoutRecordedAt: string | null;
  accountingDisclaimer: string | null;
  payment: ServicePaymentSummary;
  payout: InspectorPayoutSummary | null;
}

export interface ManagerFinanceSummary {
  currency: string;
  transactionCount: number;
  totalCustomerPaid: number;
  totalRefunded: number;
  netPlatformInflow: number;
  totalCommissionEarned: number;
  totalVatAmount: number;
  totalTncnWithheld: number;
  totalInspectorNetPayout: number;
  paidInspectorPayout: number;
  pendingInspectorPayout: number;
}

export interface ManagerFinanceHistoryItem {
  occurrenceId: string;
  requestId: string;
  occurrenceIndex: number;
  requestDescription: string | null;
  assetId: string | null;
  assetName: string | null;
  customerId: string | null;
  customerName: string | null;
  inspectorId: string | null;
  inspectorName: string | null;
  currency: string;
  customerPaidAmount: number;
  serviceBaseAmount: number | null;
  vatRate: number | null;
  vatAmount: number;
  commissionRate: number | null;
  commissionAmount: number;
  netCommissionAmount: number;
  tncnRate: number | null;
  tncnAmount: number;
  inspectorNetPayout: number;
  refundedAmount: number;
  netPlatformInflow: number;
  paymentStatus: string;
  paymentMethod: string | null;
  paymentReference: string | null;
  paymentConfirmedAt: string | null;
  payoutStatus: string;
  payoutReference: string | null;
  payoutRecordedAt: string | null;
  payoutUpdatedAt?: string | null;
}

export interface ManagerFinanceHistoryPage {
  summary: ManagerFinanceSummary;
  content: ManagerFinanceHistoryItem[];
  totalElements: number;
  page: number;
  size: number;
}


export interface ServiceRequestOccurrence {
  id: string;
  occurrenceIndex: number;
  plannedStartAt: string;
  plannedEndAt: string;
  status: 'PENDING_ASSIGNMENT' | 'ASSIGNED' | 'CANCELLED';
  inspectorId: string | null;
  droneId: string | null;
  inspectionId: string | null;
  assignedAt: string | null;
  contractFileName?: string | null;
  contractContentType?: string | null;
  contractSizeBytes?: number | null;
  contractUploadedAt?: string | null;
  currency?: string | null;
  totalPrice?: number | null;
  serviceBaseAmount?: number | null;
  vatRate?: number | null;
  vatAmount?: number | null;
  commissionRate?: number | null;
  commissionAmount?: number | null;
  inspectorGrossPayout?: number | null;
  tncnRate?: number | null;
  tncnAmount?: number | null;
  inspectorNetPayout?: number | null;
  remainingInspectorNetPayout?: number | null;
  paymentStatus?: 'PENDING' | 'PAYMENT_DUE' | 'PAID' | string | null;
  paymentConfirmedAt?: string | null;
  refundedAmount?: number | null;
  refundStatus?: string | null;
  refunds?: ServiceRefundSummary[];
  inspectorReceivables?: InspectorReceivableSummary[];
  paymentMethod?: string | null;
  paymentReference?: string | null;
  gatewayOrderCode?: number | null;
  payoutStatus?: string | null;
  payoutReference?: string | null;
  reportAcceptedAt?: string | null;
  /** The assigned Inspector's answer to the dispatch: PENDING_ACCEPTANCE, ACCEPTED, or DECLINED. */
  assignmentStatus?: 'PENDING_ACCEPTANCE' | 'ACCEPTED' | 'DECLINED' | string | null;
  reassignmentRequired?: boolean | null;
  declineReason?: string | null;
  acceptanceDeadlineAt?: string | null;
  lastTimeoutCancelledAt?: string | null;
  lastTimeoutInspectorId?: string | null;
  lastTimeoutInspectorName?: string | null;
  inspectorName?: string | null;
  droneLabel?: string | null;
  invoice?: ServiceInvoiceSummary | null;
  payment?: ServicePaymentSummary | null;
  payout?: InspectorPayoutSummary | null;
}

export interface ServiceRequest {
  id: string;
  ownerCustomerId: string;
  ownerCustomerName?: string | null;
  assetId: string;
  assetName?: string | null;
  assetCode?: string | null;
  assetLocationText?: string | null;
  description: string;
  requestedFrom: string;
  requestedUntil: string;
  timezone: string;
  windowStart: string;
  windowEnd: string;
  requestType: ServiceRequestType;
  recurrenceUnit: string | null;
  recurrenceInterval: number | null;
  occurrenceCount: number | null;
  recurrenceEndDate: string | null;
  sourceInspectionId?: string | null;
  inspectionItems?: string[];
  status: ServiceRequestStatus;
  acceptedQuoteId: string | null;
  acceptedAt: string | null;
  acceptedByUserId: string | null;
  acceptedTermsSnapshot: Record<string, unknown> | null;
  contractFileName: string | null;
  contractContentType: string | null;
  contractSizeBytes: number | null;
  contractUploadedAt: string | null;
  createdAt: string;
  currentQuote: ServiceRequestQuote | null;
  assignedManagerId?: string | null;
  managerAssignedAt?: string | null;
  managerAssignedByUserId?: string | null;
  serviceManager?: ServiceManagerContact | null;
  canClaim?: boolean;
  occurrences: ServiceRequestOccurrence[];
  messages: ServiceRequestMessage[];
}

export interface CreateServiceRequestInput {
  assetId: string;
  description?: string;
  requestedFrom: string;
  requestedUntil?: string;
  timezone: string;
  windowStart?: string;
  windowEnd?: string;
  requestType: ServiceRequestType;
  recurrenceUnit?: string;
  recurrenceInterval?: number;
  occurrenceCount?: number;
  recurrenceEndDate?: string;
  sourceInspectionId?: string;
}

export interface PartnerCapabilityOption {
  code: string;
  nameVi: string;
  nameEn: string;
  displayOrder: number;
  isActive: boolean;
  category: string;
}

export interface PartnerCandidateCheck {
  code: string;
  status: 'PASS' | 'FAIL' | 'UNKNOWN' | 'MATCH' | 'MISMATCH';
  explanation: string;
}

export interface PartnerCandidate {
  inspectorId: string;
  droneId: string;
  inspectorName: string;
  inspectorAvatarUrl: string | null;
  droneSerialNumber: string;
  droneModel: string | null;
  /** Optional while older backend instances omit the image-presence field. */
  droneHasImage?: boolean;
  droneFeatureCodes: string[];
  eligibility: 'PASS' | 'FAIL' | 'UNKNOWN';
  capabilityFit: 'MATCH' | 'MISMATCH' | 'UNKNOWN';
  droneMaxAltitudeMeters: number | null;
  structureHeightMeters: number | null;
  footprintAreaSquareMeters: number | null;
  hardGates: PartnerCandidateCheck[];
  capabilityChecks: PartnerCandidateCheck[];
  disclaimer: string;
  declineCount?: number;
  noShowCount?: number;
  abortCount?: number;
  averageRating?: number | null;
  ratingCount?: number;
  customerAverageRating?: number | null;
  managerAverageRating?: number | null;
}

export interface EvaluatePartnerCandidatesInput {
  plannedStartAt: string;
  plannedEndAt: string;
  requiredDroneFeatureCodes: string[];
}

export interface IssueServiceQuoteInput {
  scopeSnapshot: string;
  firstOccurrenceStartAt: string;
  firstOccurrenceEndAt: string;
  pricePerOccurrenceVnd: number;
  requiredDroneFeatureCodes: string[];
  inspectionItems?: string[];
}

export interface AssignOccurrenceInput {
  plannedStartAt: string;
  plannedEndAt: string;
  inspectorId: string;
  droneId: string;
}

export interface PartnerInspector {
  id: string;
  fullName: string;
  licenseExpiresAt: string | null;
  avatarUrl: string | null;
}

export interface ServiceManagerOption {
  id: string;
  fullName: string;
  email: string;
}

export interface PartnerDrone {
  id: string;
  inspectorOwnerId: string;
  serialNumber: string;
  model: string;
  hasImage: boolean;
}

export const contractQueryKeys = {
  all: ['contracts'] as const,
  requests: () => [...contractQueryKeys.all, 'requests'] as const,
  request: (id: string) => [...contractQueryKeys.requests(), id] as const,
  partners: () => [...contractQueryKeys.all, 'partners'] as const,
  serviceManagers: () => [...contractQueryKeys.all, 'service-managers'] as const,
};

export const contractApi = {
  async listRequests(): Promise<ServiceRequest[]> {
    const { data } = await api.get<ServiceRequest[]>('/contracts/requests');
    return data;
  },

  async createRequest(input: CreateServiceRequestInput): Promise<ServiceRequest> {
    const { data } = await api.post<ServiceRequest>('/contracts/requests', input);
    return data;
  },

  async getRequest(requestId: string): Promise<ServiceRequest> {
    const { data } = await api.get<ServiceRequest>(`/contracts/requests/${requestId}`);
    return data;
  },

  async claimRequest(requestId: string): Promise<ServiceRequest> {
    const { data } = await api.post<ServiceRequest>(`/contracts/requests/${requestId}/claim`);
    return data;
  },

  async reassignRequest(requestId: string, managerId: string): Promise<ServiceRequest> {
    const { data } = await api.put<ServiceRequest>(
      `/contracts/requests/${requestId}/manager-assignment`,
      { managerId },
    );
    return data;
  },

  async unassignRequest(requestId: string): Promise<ServiceRequest> {
    const { data } = await api.delete<ServiceRequest>(
      `/contracts/requests/${requestId}/manager-assignment`,
    );
    return data;
  },

  async postMessage(requestId: string, body: string, files: File[] = []): Promise<ServiceRequest> {
    const form = new FormData();
    if (body.trim()) form.append('body', body.trim());
    files.forEach((file) => form.append('files', file));
    const { data } = await api.post<ServiceRequest>(
      `/contracts/requests/${requestId}/messages`,
      form,
    );
    return data;
  },

  async downloadMessageAttachment(
    requestId: string,
    messageId: string,
    attachmentId: string,
  ): Promise<Blob> {
    const { data } = await api.get<Blob>(
      `/contracts/requests/${requestId}/messages/${messageId}/attachments/${attachmentId}`,
      { responseType: 'blob' },
    );
    return data;
  },

  async markMessagesRead(requestId: string): Promise<ServiceRequest> {
    const { data } = await api.post<ServiceRequest>(
      `/contracts/requests/${requestId}/messages/read`,
    );
    return data;
  },

  async listPartnerCapabilities(): Promise<PartnerCapabilityOption[]> {
    const { data } = await api.get<PartnerCapabilityOption[]>('/contracts/requests/partner-capabilities');
    return data.filter((option) => option.isActive && option.category.toUpperCase() === 'CAPABILITY');
  },

  async evaluatePartnerCandidates(
    requestId: string,
    input: EvaluatePartnerCandidatesInput,
  ): Promise<PartnerCandidate[]> {
    const { data } = await api.post<PartnerCandidate[]>(
      `/contracts/requests/${requestId}/partner-candidates`,
      input,
    );
    return data;
  },

  async updateInspectionItems(
    requestId: string,
    inspectionItems: string[],
  ): Promise<ServiceRequest> {
    const { data } = await api.put<ServiceRequest>(
      `/contracts/requests/${requestId}/inspection-items`,
      { inspectionItems },
    );
    return data;
  },

  async saveQuote(
    requestId: string,
    input: IssueServiceQuoteInput,
  ): Promise<ServiceRequest> {
    const { data } = await api.put<ServiceRequest>(
      `/contracts/requests/${requestId}/quote`,
      input,
    );
    return data;
  },

  async acceptQuote(requestId: string, quoteRowVersion: number): Promise<ServiceRequest> {
    const { data } = await api.post<ServiceRequest>(
      `/contracts/requests/${requestId}/accept`,
      { quoteRowVersion },
    );
    return data;
  },

  async uploadSignedContract(requestId: string, file: File): Promise<ServiceRequest> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post<ServiceRequest>(
      `/contracts/requests/${requestId}/signed-contract`,
      formData,
    );
    return data;
  },

  async downloadSignedContract(requestId: string): Promise<Blob> {
    const { data } = await api.get<Blob>(
      `/contracts/requests/${requestId}/signed-contract`,
      { responseType: 'blob' },
    );
    return data;
  },

  async assignOccurrence(
    requestId: string,
    occurrenceId: string,
    input: AssignOccurrenceInput,
  ): Promise<ServiceRequest> {
    const { data } = await api.post<ServiceRequest>(
      `/contracts/requests/${requestId}/occurrences/${occurrenceId}/assign`,
      input,
    );
    return data;
  },

  async listCustomerFinanceHistory(page = 0, size = 20): Promise<OccurrenceFinanceHistoryPage> {
    const { data } = await api.get<OccurrenceFinanceHistoryPage>(
      `/contracts/requests/finance-history/customer?page=${page}&size=${size}`,
    );
    return data;
  },

  async listInspectorFinanceHistory(page = 0, size = 20): Promise<OccurrenceFinanceHistoryPage> {
    const { data } = await api.get<OccurrenceFinanceHistoryPage>(
      `/contracts/requests/finance-history/inspector?page=${page}&size=${size}`,
    );
    return data;
  },

  async getCustomerFinanceHistoryDetail(occurrenceId: string): Promise<OccurrenceFinanceHistoryDetail> {
    const { data } = await api.get<OccurrenceFinanceHistoryDetail>(
      `/contracts/requests/finance-history/customer/${occurrenceId}`,
    );
    return data;
  },

  async getInspectorFinanceHistoryDetail(occurrenceId: string): Promise<OccurrenceFinanceHistoryDetail> {
    const { data } = await api.get<OccurrenceFinanceHistoryDetail>(
      `/contracts/requests/finance-history/inspector/${occurrenceId}`,
    );
    return data;
  },

  async listManagerFinanceHistory(
    page = 0,
    size = 20,
    scope?: 'REVENUE' | 'PAYOUTS',
  ): Promise<ManagerFinanceHistoryPage> {
    const scopeParam = scope ? `&scope=${scope}` : '';
    const { data } = await api.get<ManagerFinanceHistoryPage>(
      `/contracts/requests/finance-history/manager?page=${page}&size=${size}${scopeParam}`,
    );
    return data;
  },

  async getManagerFinanceHistoryDetail(occurrenceId: string): Promise<OccurrenceFinanceHistoryDetail> {
    const { data } = await api.get<OccurrenceFinanceHistoryDetail>(
      `/contracts/requests/finance-history/manager/${occurrenceId}`,
    );
    return data;
  },

  async getOccurrenceFinance(requestId: string, occurrenceId: string): Promise<OccurrenceFinanceDetails> {
    const { data } = await api.get<OccurrenceFinanceDetails>(
      `/contracts/requests/${requestId}/occurrences/${occurrenceId}/finance`,
    );
    return data;
  },

  async confirmOccurrencePayment(
    requestId: string,
    occurrenceId: string,
    input: { paymentReference: string; amount: number },
  ): Promise<ServiceRequest> {
    const { data } = await api.post<ServiceRequest>(
      `/contracts/requests/${requestId}/occurrences/${occurrenceId}/confirm-payment`,
      input,
    );
    return data;
  },

  async cancelUnpaidPaymentOrder(
    requestId: string,
    occurrenceId: string,
  ): Promise<ServiceRequest> {
    const { data } = await api.post<ServiceRequest>(
      `/contracts/requests/${requestId}/occurrences/${occurrenceId}/cancel-unpaid-order`,
    );
    return data;
  },

  async initiateOccurrenceRefund(requestId: string, occurrenceId: string, input: {
    amount: number; requestReference: string; reasonCode: string; serviceStage: string;
    reason: string; contractClauseReference: string; evidenceReference: string;
    inspectorReceivableAmount: number; platformAbsorbedAmount: number;
  }): Promise<ServiceRequest> {
    const { data } = await api.post<ServiceRequest>(
      `/contracts/requests/${requestId}/occurrences/${occurrenceId}/refunds`, input);
    return data;
  },

  async completeOccurrenceRefund(requestId: string, occurrenceId: string, refundId: string, input: {
    inspectorPayoutReduction: number; platformCommissionAdjustment: number;
    vatAdjustment: number; tncnAdjustment: number; platformAbsorbedAmount: number;
    externalReference: string;
  }): Promise<ServiceRequest> {
    const { data } = await api.post<ServiceRequest>(
      `/contracts/requests/${requestId}/occurrences/${occurrenceId}/refunds/${refundId}/complete`, input);
    return data;
  },

  async cancelOccurrenceRefund(requestId: string, occurrenceId: string, refundId: string, reason: string): Promise<ServiceRequest> {
    const { data } = await api.post<ServiceRequest>(
      `/contracts/requests/${requestId}/occurrences/${occurrenceId}/refunds/${refundId}/cancel`, { reason });
    return data;
  },

  async reconcileRefundAllocation(requestId: string, occurrenceId: string, refundId: string, input: {
    inspectorReceivableAmount: number; platformAbsorbedPlanAmount: number;
    inspectorPayoutReduction: number; platformCommissionAdjustment: number;
    vatAdjustment: number; tncnAdjustment: number; platformAbsorbedAmount: number;
    reconciliationReference: string; note: string;
  }): Promise<ServiceRequest> {
    const { data } = await api.post<ServiceRequest>(
      `/contracts/requests/${requestId}/occurrences/${occurrenceId}/refunds/${refundId}/reconcile-allocation`, input);
    return data;
  },

  async recordReceivableRecovery(requestId: string, occurrenceId: string, receivableId: string, input: {
    amount: number; externalReference: string; note: string;
  }): Promise<ServiceRequest> {
    const { data } = await api.post<ServiceRequest>(
      `/contracts/requests/${requestId}/occurrences/${occurrenceId}/receivables/${receivableId}/recover`, input);
    return data;
  },

  async recordOccurrencePayout(
    requestId: string,
    occurrenceId: string,
    input: { payoutReference: string },
  ): Promise<ServiceRequest> {
    const { data } = await api.post<ServiceRequest>(
      `/contracts/requests/${requestId}/occurrences/${occurrenceId}/record-payout`,
      input,
    );
    return data;
  },

  async createOccurrenceSepayPayoutLink(
    requestId: string,
    occurrenceId: string,
  ): Promise<{
    orderCode: number;
    amount: number;
    paymentLinkId: string;
    checkoutUrl: string;
    qrCode: string;
  }> {
    const { data } = await api.post<{
      orderCode: number;
      amount: number;
      paymentLinkId: string;
      checkoutUrl: string;
      qrCode: string;
    }>(`/contracts/requests/${requestId}/occurrences/${occurrenceId}/sepay/create-payout-link`);
    return data;
  },

  async listPartnerInspectors(): Promise<PartnerInspector[]> {
    const { data } = await api.get<PartnerInspector[]>('/contracts/partners/inspectors');
    return data;
  },

  async listServiceManagers(): Promise<ServiceManagerOption[]> {
    const { data } = await api.get<ServiceManagerOption[]>('/contracts/requests/managers');
    return data;
  },

  async registerPartnerInspector(inspectorUserId: string): Promise<PartnerInspector> {
    const { data } = await api.post<PartnerInspector>('/contracts/partners/inspectors', {
      inspectorUserId,
    });
    return data;
  },

  async listPartnerDrones(): Promise<PartnerDrone[]> {
    const { data } = await api.get<PartnerDrone[]>('/contracts/partners/drones');
    return data;
  },

  async registerPartnerDrone(droneId: string): Promise<PartnerDrone> {
    const { data } = await api.post<PartnerDrone>('/contracts/partners/drones', { droneId });
    return data;
  },
};

export interface InspectionChatMessage {
  id: string;
  inspectionId: string;
  authorUserId: string;
  authorName?: string | null;
  authorRole?: string | null;
  body: string;
  readAt?: string | null;
  createdAt: string;
  attachments?: ServiceRequestMessageAttachment[];
}

export interface InspectionChatThread {
  inspectionId: string;
  assetId: string;
  assetName: string;
  status: string;
  assignmentStatus: string;
  plannedStartAt: string | null;
  plannedEndAt: string | null;
  counterpartUserId: string | null;
  counterpartName: string;
  counterpartRole: string;
  counterpartAvatarUrl: string | null;
  messages: InspectionChatMessage[];
}

export const inspectionChatApi = {
  async listThreads(): Promise<InspectionChatThread[]> {
    const { data } = await api.get<InspectionChatThread[]>('/inspections/messages/threads');
    return data;
  },

  async getThread(inspectionId: string): Promise<InspectionChatThread> {
    const { data } = await api.get<InspectionChatThread>(`/inspections/${inspectionId}/messages`);
    return data;
  },

  async postMessage(
    inspectionId: string,
    input: { body: string; files?: File[] },
  ): Promise<InspectionChatThread> {
    const formData = new FormData();
    if (input.body.trim()) {
      formData.append('body', input.body.trim());
    }
    for (const file of input.files ?? []) {
      formData.append('files', file);
    }
    const { data } = await api.post<InspectionChatThread>(
      `/inspections/${inspectionId}/messages`,
      formData,
    );
    return data;
  },

  async markMessagesRead(inspectionId: string): Promise<InspectionChatThread> {
    const { data } = await api.post<InspectionChatThread>(
      `/inspections/${inspectionId}/messages/read`,
    );
    return data;
  },
};

export interface PartnerChatMessage {
  id: string;
  requestId: string;
  inspectorId: string;
  authorUserId: string;
  authorName?: string | null;
  authorRole?: string | null;
  body: string;
  readAt?: string | null;
  createdAt: string;
  attachments?: ServiceRequestMessageAttachment[];
}

export interface PartnerChatThread {
  requestId: string;
  inspectorId: string;
  managerId: string | null;
  ownerCustomerId: string;
  customerName?: string | null;
  assetId: string;
  assetName: string;
  assetCode?: string | null;
  requestDescription: string;
  requestStatus: string;
  counterpartUserId: string | null;
  counterpartName: string;
  counterpartRole: string;
  counterpartAvatarUrl: string | null;
  occurrenceCount: number;
  nextPlannedStartAt: string | null;
  nextPlannedEndAt: string | null;
  messages: PartnerChatMessage[];
}

export const partnerChatApi = {
  async listThreads(): Promise<PartnerChatThread[]> {
    const { data } = await api.get<PartnerChatThread[]>('/contracts/partner-messages/threads');
    return data;
  },

  async getThread(requestId: string, inspectorId: string): Promise<PartnerChatThread> {
    const { data } = await api.get<PartnerChatThread>(
      `/contracts/partner-messages/${requestId}/inspectors/${inspectorId}`,
    );
    return data;
  },

  async postMessage(
    requestId: string,
    inspectorId: string,
    input: { body: string; files?: File[] },
  ): Promise<PartnerChatThread> {
    const formData = new FormData();
    if (input.body.trim()) {
      formData.append('body', input.body.trim());
    }
    for (const file of input.files ?? []) {
      formData.append('files', file);
    }
    const { data } = await api.post<PartnerChatThread>(
      `/contracts/partner-messages/${requestId}/inspectors/${inspectorId}`,
      formData,
    );
    return data;
  },

  async markMessagesRead(requestId: string, inspectorId: string): Promise<PartnerChatThread> {
    const { data } = await api.post<PartnerChatThread>(
      `/contracts/partner-messages/${requestId}/inspectors/${inspectorId}/read`,
    );
    return data;
  },
};
