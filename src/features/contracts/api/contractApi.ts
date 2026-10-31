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
}

export interface ServiceRequestQuote {
  id: string;
  versionNo: number;
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
}

export interface ServiceRequest {
  id: string;
  organizationId: string;
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
  acceptedQuoteVersion: number | null;
  contractFileName: string | null;
  contractContentType: string | null;
  contractSizeBytes: number | null;
  contractUploadedAt: string | null;
  createdAt: string;
  quotes: ServiceRequestQuote[];
  occurrences: ServiceRequestOccurrence[];
  messages: ServiceRequestMessage[];
}

export interface CreateServiceRequestInput {
  assetId: string;
  description: string;
  requestedFrom: string;
  requestedUntil: string;
  timezone: string;
  windowStart?: string;
  windowEnd?: string;
  requestType: ServiceRequestType;
  recurrenceUnit?: string;
  recurrenceInterval?: number;
  occurrenceCount?: number;
  recurrenceEndDate?: string;
}

export interface IssueServiceQuoteInput {
  scopeSnapshot: string;
  firstOccurrenceStartAt: string;
  firstOccurrenceEndAt: string;
  inspectorId: string;
  droneId: string;
  pricePerOccurrenceVnd?: number;
  pricePerOccurrenceUsd: number;
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
}

export interface PartnerDrone {
  id: string;
  inspectorOwnerId: string;
  serialNumber: string;
  model: string;
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

  async issueQuote(
    requestId: string,
    input: IssueServiceQuoteInput,
  ): Promise<ServiceRequest> {
    const { data } = await api.post<ServiceRequest>(
      `/contracts/requests/${requestId}/quotes`,
      input,
    );
    return data;
  },

  async acceptQuote(requestId: string, versionNo: number): Promise<ServiceRequest> {
    const { data } = await api.post<ServiceRequest>(
      `/contracts/requests/${requestId}/accept`,
      undefined,
      { params: { versionNo } },
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
