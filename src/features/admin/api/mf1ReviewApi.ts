import { api } from '@/shared/api/client';

function unwrap<T>(response: { data: T | { data: T } }): T {
  const body = response.data;
  return typeof body === 'object' && body !== null && 'data' in body
    ? (body as { data: T }).data
    : body as T;
}

function unwrapMutation<T>(response: { data: T | { data: T } }): T {
  return unwrap(response);
}

export interface DroneRegistrationApplication {
  id: string;
  inspectorUserId: string;
  inspectorFullName?: string | null;
  inspectorEmail?: string | null;
  inspectorAvatarUrl?: string | null;
  inspectorPilotLicenseNumber?: string | null;
  inspectorPilotLicenseClass?: string | null;
  serialNumber: string;
  model: string | null;
  manufacturer: string | null;
  registrationNumber: string;
  registrationFileKey: string;
  registrationExpiresAt: string;
  ownershipFileKey: string;
  inspectionFileKey?: string | null;
  maxWindResistanceMps?: number | null;
  maxAltitudeMeters?: number | null;
  opticalZoomLevel?: string | null;
  mtowKg?: number | null;
  maxFlightTimeMinutes?: number | null;
  cameraSensor?: string | null;
  legalCategory?: string | null;
  hasThermalCamera?: boolean;
  hasRtk?: boolean;
  documentFiles?: Record<string, string> | null;
  imageFileKeys?: string[] | null;
  features?: string[] | null;
  status: string;
  reviewNote: string | null;
  reviewedByUserId?: string | null;
  reviewerFullName?: string | null;
  reviewedAt?: string | null;
  droneId: string | null;
  createdAt: string;
}

export interface DroneRegistrationApplicationPage {
  items: DroneRegistrationApplication[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  totalAllCount: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
}

export interface DroneReviewQueueFilters {
  page?: number;
  pageSize?: number;
  status?: string;
  tier?: string;
  search?: string;
  sort?: string;
}

export const mf1ReviewApi = {
  droneEvidence: (id: string, type: string) =>
    api.get<Blob>(`/drone-registration-applications/${id}/evidence/${type}`, { responseType: 'blob' }).then((response) => response.data),
  droneQueue: (filters: DroneReviewQueueFilters) =>
    api
      .get<DroneRegistrationApplicationPage | { data: DroneRegistrationApplicationPage }>(
        '/drone-registration-applications',
        { params: filters },
      )
      .then(unwrap),
  pendingDrones: () =>
    api.get<DroneRegistrationApplication[] | { data: DroneRegistrationApplication[] }>('/drone-registration-applications/pending').then(unwrap),
  droneHistory: () =>
    api.get<DroneRegistrationApplication[] | { data: DroneRegistrationApplication[] }>('/drone-registration-applications/history').then(unwrap),
  approveDrone: (id: string) =>
    api.post<DroneRegistrationApplication | { data: DroneRegistrationApplication }>(`/drone-registration-applications/${id}/approve`).then(unwrapMutation),
  rejectDrone: (id: string, reviewNote: string) =>
    api.post<DroneRegistrationApplication | { data: DroneRegistrationApplication }>(`/drone-registration-applications/${id}/reject`, { reviewNote }).then(unwrapMutation),
};
