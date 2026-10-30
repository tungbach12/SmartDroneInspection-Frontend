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

export interface InspectorPartnerApplication {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  pilotLicenseNumber: string;
  pilotLicenseClass: string;
  pilotLicenseExpiresAt: string;
  pilotLicenseFileKey: string;
  partnerContractFileKey: string | null;
  status: string;
  reviewNote: string | null;
  createdAt: string;
}

export interface DroneRegistrationApplication {
  id: string;
  inspectorUserId: string;
  serialNumber: string;
  model: string | null;
  manufacturer: string | null;
  registrationNumber: string;
  registrationFileKey: string;
  registrationExpiresAt: string;
  ownershipFileKey: string;
  inspectionFileKey: string;
  status: string;
  reviewNote: string | null;
  droneId: string | null;
  createdAt: string;
}

export const mf1ReviewApi = {
  partnerLicenseDocument: (id: string) =>
    api.get<Blob>(`/inspector-partner-applications/${id}/license-document`, { responseType: 'blob' }).then((response) => response.data),
  droneEvidence: (id: string, type: 'REGISTRATION' | 'OWNERSHIP' | 'INSPECTION') =>
    api.get<Blob>(`/drone-registration-applications/${id}/evidence/${type}`, { responseType: 'blob' }).then((response) => response.data),
  pendingCustomers: () =>
    api.get<ProspectiveCustomerReview[] | { data: ProspectiveCustomerReview[] }>('/platform/customer-airspace-reviews/pending').then(unwrap),
  approveCustomer: (id: string, reviewNote: string) =>
    api.post<ProspectiveCustomerReview | { data: ProspectiveCustomerReview }>(`/platform/customer-airspace-reviews/${id}/approve`, { reviewNote }).then(unwrapMutation),
  rejectCustomer: (id: string, reviewNote: string) =>
    api.post<ProspectiveCustomerReview | { data: ProspectiveCustomerReview }>(`/platform/customer-airspace-reviews/${id}/reject`, { reviewNote }).then(unwrapMutation),
  pendingPartners: () =>
    api.get<InspectorPartnerApplication[] | { data: InspectorPartnerApplication[] }>('/inspector-partner-applications/pending').then(unwrap),
  approvePartner: (id: string, partnerContractFileKey: string, reviewNote: string) =>
    api.post<InspectorPartnerApplication | { data: InspectorPartnerApplication }>(`/inspector-partner-applications/${id}/approve`, { partnerContractFileKey, reviewNote }).then(unwrapMutation),
  rejectPartner: (id: string, reviewNote: string) =>
    api.post<InspectorPartnerApplication | { data: InspectorPartnerApplication }>(`/inspector-partner-applications/${id}/reject`, { reviewNote }).then(unwrapMutation),
  pendingDrones: () =>
    api.get<DroneRegistrationApplication[] | { data: DroneRegistrationApplication[] }>('/drone-registration-applications/pending').then(unwrap),
  approveDrone: (id: string) =>
    api.post<DroneRegistrationApplication | { data: DroneRegistrationApplication }>(`/drone-registration-applications/${id}/approve`).then(unwrapMutation),
  rejectDrone: (id: string, reviewNote: string) =>
    api.post<DroneRegistrationApplication | { data: DroneRegistrationApplication }>(`/drone-registration-applications/${id}/reject`, { reviewNote }).then(unwrapMutation),
};
