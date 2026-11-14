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

export interface ProspectiveCustomerReview {
  id: string;
  userId: string;
  organizationName: string;
  organizationCode: string;
  assetName: string;
  assetCode: string;
  airspaceClassification: string;
  status: string;
  reviewNote: string | null;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface DroneRegistrationApplication {
  id: string;
  inspectorUserId: string;
  inspectorFullName?: string | null;
  inspectorEmail?: string | null;
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

export const mf1ReviewApi = {
  droneEvidence: (id: string, type: string) =>
    api.get<Blob>(`/drone-registration-applications/${id}/evidence/${type}`, { responseType: 'blob' }).then((response) => response.data),
  pendingCustomers: () =>
    api.get<ProspectiveCustomerReview[] | { data: ProspectiveCustomerReview[] }>('/platform/customer-airspace-reviews/pending').then(unwrap),
  approveCustomer: (id: string, reviewNote: string) =>
    api.post<ProspectiveCustomerReview | { data: ProspectiveCustomerReview }>(`/platform/customer-airspace-reviews/${id}/approve`, { reviewNote }).then(unwrapMutation),
  rejectCustomer: (id: string, reviewNote: string) =>
    api.post<ProspectiveCustomerReview | { data: ProspectiveCustomerReview }>(`/platform/customer-airspace-reviews/${id}/reject`, { reviewNote }).then(unwrapMutation),
  pendingDrones: () =>
    api.get<DroneRegistrationApplication[] | { data: DroneRegistrationApplication[] }>('/drone-registration-applications/pending').then(unwrap),
  droneHistory: () =>
    api.get<DroneRegistrationApplication[] | { data: DroneRegistrationApplication[] }>('/drone-registration-applications/history').then(unwrap),
  approveDrone: (id: string) =>
    api.post<DroneRegistrationApplication | { data: DroneRegistrationApplication }>(`/drone-registration-applications/${id}/approve`).then(unwrapMutation),
  rejectDrone: (id: string, reviewNote: string) =>
    api.post<DroneRegistrationApplication | { data: DroneRegistrationApplication }>(`/drone-registration-applications/${id}/reject`, { reviewNote }).then(unwrapMutation),
};
