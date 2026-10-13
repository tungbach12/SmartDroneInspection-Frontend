import { api } from '@/shared/api/client';

export type FlightPermitStatus =
  | 'APPLICATION'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'REJECTED'
  | 'REVOKED'
  | 'NOT_APPLICABLE';

export interface FlightPermit {
  id: string;
  organizationId: string;
  assetId: string | null;
  areaReference: string | null;
  permitType: string;
  issuingAuthority: string | null;
  permitReference: string | null;
  geographicScope: string | null;
  validFrom: string | null;
  validUntil: string | null;
  conditions: string | null;
  status: FlightPermitStatus;
  sourceEvidenceId: string | null;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  reviewReason: string | null;
  createdAt: string;
}

export interface CreateFlightPermitInput {
  permitType: string;
  assetId?: string;
  areaReference?: string;
  issuingAuthority?: string;
  permitReference?: string;
  geographicScope?: string;
  validFrom?: string;
  validUntil?: string;
  conditions?: string;
  status?: FlightPermitStatus;
  sourceEvidenceId?: string;
}

export interface ReviewFlightPermitInput {
  status: FlightPermitStatus;
  reason: string;
}

export const permitKeys = {
  all: ['flight-permits'] as const,
  list: () => [...permitKeys.all, 'list'] as const,
};

export const permitApi = {
  list: () => api.get<FlightPermit[]>('/flight-permits').then((response) => response.data),

  create: (input: CreateFlightPermitInput) =>
    api.post<FlightPermit>('/flight-permits', input).then((response) => response.data),

  review: (permitId: string, input: ReviewFlightPermitInput) =>
    api.put<FlightPermit>(`/flight-permits/${permitId}/review`, input).then((response) => response.data),
};
