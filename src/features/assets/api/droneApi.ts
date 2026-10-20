import { api } from '@/shared/api/client';

export type DroneServiceability =
  'ACTIVE' | 'MAINTENANCE' | 'SUSPENDED' | 'RETIRED';
export type DroneDocumentStatus =
  'PENDING_REVIEW' | 'ACTIVE' | 'EXPIRED' | 'REJECTED' | 'REVOKED';

export interface Drone {
  id: string;
  serialNumber: string;
  model: string | null;
  manufacturer: string | null;
  payloadMetadata: string | null;
  serviceability: DroneServiceability;
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
  /** JSON-serialized metadata as required by the current backend request DTO. */
  payloadMetadata?: string | null;
  notes?: string | null;
}

export interface DroneDocument {
  id: string;
  droneId: string;
  documentType: string;
  issuer: string | null;
  documentReference: string | null;
  validFrom: string | null;
  validUntil: string | null;
  status: DroneDocumentStatus;
  checksumSha256: string;
  uploadedByUserId: string;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface UploadDroneDocumentInput {
  file: File;
  documentType: string;
  issuer?: string;
  documentReference?: string;
  validFrom?: string;
  validUntil?: string;
}

export const droneKeys = {
  all: ['drones'] as const,
  lists: () => [...droneKeys.all, 'list'] as const,
  list: () => [...droneKeys.lists()] as const,
  selection: () => [...droneKeys.all, 'selection'] as const,
  detail: (id: string) => [...droneKeys.all, 'detail', id] as const,
  documents: (id: string) => [...droneKeys.all, id, 'documents'] as const,
};

export const droneApi = {
  list: () => api.get<Drone[]>('/drones').then((r) => r.data),

  getById: (id: string) => api.get<Drone>(`/drones/${id}`).then((r) => r.data),

  selection: () =>
    api.get<DroneSelection[]>('/drones/selection').then((r) => r.data),

  create: (input: CreateDroneInput) =>
    api.post<Drone>('/drones', input).then((r) => r.data),

  updateServiceability: (
    id: string,
    input: { serviceability: DroneServiceability },
  ) =>
    api.patch<Drone>(`/drones/${id}/serviceability`, input).then((r) => r.data),

  listDocuments: (id: string) =>
    api.get<DroneDocument[]>(`/drones/${id}/documents`).then((r) => r.data),

  uploadDocument: (id: string, input: UploadDroneDocumentInput) => {
    const form = new FormData();
    form.append('file', input.file);
    form.append('documentType', input.documentType);
    if (input.issuer) form.append('issuer', input.issuer);
    if (input.documentReference)
      form.append('documentReference', input.documentReference);
    if (input.validFrom) form.append('validFrom', input.validFrom);
    if (input.validUntil) form.append('validUntil', input.validUntil);
    return api
      .post<DroneDocument>(`/drones/${id}/documents`, form)
      .then((r) => r.data);
  },

  updateDocumentStatus: (
    droneId: string,
    documentId: string,
    input: { status: DroneDocumentStatus },
  ) =>
    api
      .patch<DroneDocument>(
        `/drones/${droneId}/documents/${documentId}/status`,
        input,
      )
      .then((r) => r.data),
};
