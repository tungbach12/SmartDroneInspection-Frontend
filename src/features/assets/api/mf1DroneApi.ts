import { api } from '@/shared/api/client';

export interface DroneRegistrationInput {
  serialNumber: string;
  model?: string;
  manufacturer?: string;
  registrationNumber: string;
  registrationFileKey: string;
  registrationExpiresAt: string;
  ownershipFileKey: string;
  inspectionFileKey: string;
}

export interface DroneRegistrationApplication {
  id: string;
  serialNumber: string;
  model: string | null;
  manufacturer: string | null;
  registrationNumber: string;
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
}

function unwrap<T>(value: T | { data: T }): T {
  return typeof value === 'object' && value !== null && 'data' in value
    ? (value as { data: T }).data
    : value as T;
}

export const mf1DroneApi = {
  submit: (input: DroneRegistrationInput) =>
    api.post<DroneRegistrationApplication | { data: DroneRegistrationApplication }>('/drone-registration-applications', input).then((response) => unwrap(response.data)),
  mine: () =>
    api.get<DroneRegistrationApplication[] | { data: DroneRegistrationApplication[] }>('/drone-registration-applications/mine').then((response) => unwrap(response.data)),
  drones: () =>
    api.get<InspectorDrone[] | { data: InspectorDrone[] }>('/drone-registration-applications/mine/drones').then((response) => unwrap(response.data)),
};
