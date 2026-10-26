import { api } from '@/shared/api/client';

export type DroneServiceability =
  'ACTIVE' | 'MAINTENANCE' | 'SUSPENDED' | 'RETIRED';
export type DroneOwnershipType = 'OWNED' | 'LEASED';

export interface Drone {
  id: string;
  serialNumber: string;
  model: string | null;
  manufacturer: string | null;
  payloadMetadata: string | null;
  serviceability: DroneServiceability;
  ownershipType?: DroneOwnershipType;
  leaseId?: string | null;
  leaseExpiresAt?: string | null;
  registrationNumber?: string | null;
  registrationFileKey?: string | null;
  registrationExpiresAt?: string | null;
  lastMaintenanceAt: string | null;
  nextMaintenanceAt: string | null;
  notes: string | null;
  createdAt: string;
}

export interface DroneSelection {
  id: string;
  serialNumber: string;
  model: string | null;
  manufacturer: string | null;
  serviceability: DroneServiceability;
}

export interface CreateDroneInput {
  serialNumber: string;
  model?: string | null;
  manufacturer?: string | null;
  registrationNumber?: string | null;
  registrationFileKey?: string | null;
  registrationExpiresAt?: string | null;
  /** JSON-serialized metadata as required by the current backend request DTO. */
  payloadMetadata?: string | null;
  notes?: string | null;
}

export interface UpdateDroneRegistrationInput {
  registrationNumber: string;
  registrationFileKey?: string | null;
  registrationExpiresAt?: string | null;
}

export const droneKeys = {
  all: ['drones'] as const,
  lists: () => [...droneKeys.all, 'list'] as const,
  list: () => [...droneKeys.lists()] as const,
  selection: () => [...droneKeys.all, 'selection'] as const,
  detail: (id: string) => [...droneKeys.all, 'detail', id] as const,
};

export const droneApi = {
  list: () => api.get<Drone[]>('/drones').then((r) => r.data),

  getById: (id: string) => api.get<Drone>(`/drones/${id}`).then((r) => r.data),

  selection: () =>
    api.get<DroneSelection[]>('/drones/selection').then((r) => r.data),

  create: (input: CreateDroneInput) =>
    api.post<Drone>('/drones', input).then((r) => r.data),

  updateRegistration: (id: string, input: UpdateDroneRegistrationInput) =>
    api.put<Drone>(`/drones/${id}/registration`, input).then((r) => r.data),

  updateServiceability: (
    id: string,
    input: { serviceability: DroneServiceability },
  ) =>
    api.patch<Drone>(`/drones/${id}/serviceability`, input).then((r) => r.data),
};
