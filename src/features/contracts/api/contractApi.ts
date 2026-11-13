import { api } from '@/shared/api/client';

export type ServiceRequestStatus =
  | 'OPEN'
  | 'QUOTED'
  | 'ACCEPTED'
  | 'CONTRACT_SIGNED'
  | 'ASSIGNED'
  | 'CANCELLED';

export type ServiceRequestType = 'ONE_TIME' | 'RECURRING';

export interface ServiceRequestMessage {
  id: string;
  authorUserId: string;
  authorName?: string | null;
  authorRole?: string | null;
  body: string;
  createdAt: string;
  readAt?: string | null;
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
  payosOrderCode: number | null;
  method: string | null;
  reference: string | null;
  confirmedAt: string | null;
}

export interface InspectorPayoutSummary {
  inspectorId: string | null;
  status: 'PENDING' | 'ELIGIBLE' | 'PAID' | null;
  reference: string | null;
  recordedAt: string | null;
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
  paymentStatus?: 'PENDING' | 'PAYMENT_DUE' | 'PAID' | string | null;
  paymentConfirmedAt?: string | null;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  payosOrderCode?: number | null;
  payoutStatus?: string | null;
  payoutReference?: string | null;
  reportAcceptedAt?: string | null;
  invoice?: ServiceInvoiceSummary | null;
  payment?: ServicePaymentSummary | null;
  payout?: InspectorPayoutSummary | null;
}

export interface ServiceRequest {
  id: string;
  ownerCustomerId: string;
  assetId: string;
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
  inspectorId: string;
  droneId: string;
  pricePerOccurrenceVnd: number;
  requiredDroneFeatureCodes: string[];
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

  async postMessage(requestId: string, body: string): Promise<ServiceRequest> {
    const { data } = await api.post<ServiceRequest>(
      `/contracts/requests/${requestId}/messages`,
      { body },
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

  async listPartnerInspectors(): Promise<PartnerInspector[]> {
    const { data } = await api.get<PartnerInspector[]>('/contracts/partners/inspectors');
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
