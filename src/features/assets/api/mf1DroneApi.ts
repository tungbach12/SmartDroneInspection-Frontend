import { api } from '@/shared/api/client';

export interface DroneRegistrationInput {
  serialNumber: string;
  model?: string;
  manufacturer?: string;
  registrationNumber: string;
  registrationFileKey: string;
  registrationExpiresAt: string;
  ownershipFileKey: string;
  inspectionFileKey?: string | undefined;
  maxWindResistanceMps?: number | undefined;
  opticalZoomLevel?: string | undefined;
  hasThermalCamera?: boolean | undefined;
  hasRtk?: boolean | undefined;
  documentFiles?: Record<string, string> | undefined;
  imageFileKeys?: string[] | undefined;
  features?: string[] | undefined;
}

export type DroneEvidenceType = 'REGISTRATION' | 'OWNERSHIP' | 'INSPECTION' | string;

export async function uploadDroneEvidence(file: File, type: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post<{ fileKey: string } | { data: { fileKey: string } }>(
    '/drone-registration-applications/evidence',
    formData,
    { params: { type } },
  );
  const result = unwrap(data);
  if (typeof result.fileKey !== 'string' || !result.fileKey) {
    throw new Error('The server did not return an evidence file key.');
  }
  return result.fileKey;
}

export interface DroneRegistrationApplication {
  id: string;
  inspectorUserId?: string | null;
  inspectorFullName?: string | null;
  inspectorEmail?: string | null;
  serialNumber: string;
  model: string | null;
  manufacturer: string | null;
  registrationNumber: string;
  registrationFileKey?: string | null;
  registrationExpiresAt?: string | null;
  ownershipFileKey?: string | null;
  inspectionFileKey?: string | null;
  documentFiles?: Record<string, string> | null;
  maxWindResistanceMps?: number | null;
  opticalZoomLevel?: string | null;
  hasThermalCamera?: boolean;
  hasRtk?: boolean;
  imageFileKeys?: string[] | null;
  features?: string[] | null;
  status: string;
  reviewNote: string | null;
  droneId: string | null;
  createdAt: string;
}

export interface InspectorDrone {
  id: string;
  serialNumber: string;
  model: string | null;
  manufacturer: string | null;
  serviceability: string;
  registrationNumber?: string | null;
  registrationExpiresAt?: string | null;
  inspectorOwnerId?: string | null;
  inspectorFullName?: string | null;
  inspectorEmail?: string | null;
  mtowKg?: number | null;
  legalCategory?: string | null;
  requiredLicenseClass?: string | null;
  registrationExpirationStatus?: string | null;
  registrationRemainingDays?: number | null;
  maxWindResistanceMps?: number | null;
  opticalZoomLevel?: string | null;
  hasThermalCamera?: boolean;
  hasRtk?: boolean;
  documentFiles?: Record<string, string> | null;
  imageFileKeys?: string[] | null;
  primaryImageKey?: string | null;
  features?: string[] | null;
}

function unwrap<T>(value: T | { data: T }): T {
  return typeof value === 'object' && value !== null && 'data' in value
    ? (value as { data: T }).data
    : value as T;
}

export const mf1DroneApi = {
  submit: (input: DroneRegistrationInput) =>
    api.post<DroneRegistrationApplication | { data: DroneRegistrationApplication }>('/drone-registration-applications', input).then((response) => unwrap(response.data)),
  resubmit: (id: string, input: DroneRegistrationInput) =>
    api.post<DroneRegistrationApplication | { data: DroneRegistrationApplication }>(`/drone-registration-applications/${id}/resubmit`, input).then((response) => unwrap(response.data)),
  mine: () =>
    api.get<DroneRegistrationApplication[] | { data: DroneRegistrationApplication[] }>('/drone-registration-applications/mine').then((response) => unwrap(response.data)),
  drones: () =>
    api.get<InspectorDrone[] | { data: InspectorDrone[] }>('/drone-registration-applications/mine/drones').then((response) => unwrap(response.data)),
  updateMyDroneServiceability: (droneId: string, serviceability: 'ACTIVE' | 'MAINTENANCE') =>
    api
      .patch<InspectorDrone | { data: InspectorDrone }>(
        `/drone-registration-applications/mine/drones/${droneId}/serviceability`,
        { serviceability },
      )
      .then((response) => unwrap(response.data)),
  deleteMyDrone: (droneId: string) =>
    api.delete<void>(`/drone-registration-applications/mine/drones/${droneId}`),
};
