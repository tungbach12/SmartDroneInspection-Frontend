import { api } from '@/shared/api/client';

export interface DroneDocumentConfig {
  id: string;
  code: string;
  titleVi: string;
  titleEn: string;
  descriptionVi?: string | null;
  descriptionEn?: string | null;
  isRequired: boolean;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDroneDocumentConfigInput {
  code: string;
  titleVi: string;
  titleEn: string;
  descriptionVi?: string;
  descriptionEn?: string;
  isRequired?: boolean;
  isActive?: boolean;
  displayOrder?: number;
}

export interface UpdateDroneDocumentConfigInput {
  titleVi: string;
  titleEn: string;
  descriptionVi?: string;
  descriptionEn?: string;
  isRequired?: boolean;
  isActive?: boolean;
  displayOrder?: number;
}

function unwrap<T>(value: T | { data: T }): T {
  return typeof value === 'object' && value !== null && 'data' in value
    ? (value as { data: T }).data
    : (value as T);
}

export const droneDocumentConfigApi = {
  list: (includeInactive = false) =>
    api
      .get<DroneDocumentConfig[] | { data: DroneDocumentConfig[] }>('/drone-document-configs', {
        params: { includeInactive },
      })
      .then((res) => unwrap(res.data)),
  create: (input: CreateDroneDocumentConfigInput) =>
    api
      .post<DroneDocumentConfig | { data: DroneDocumentConfig }>('/drone-document-configs', input)
      .then((res) => unwrap(res.data)),
  update: (id: string, input: UpdateDroneDocumentConfigInput) =>
    api
      .put<DroneDocumentConfig | { data: DroneDocumentConfig }>(`/drone-document-configs/${id}`, input)
      .then((res) => unwrap(res.data)),
  toggleActive: (id: string) =>
    api
      .patch<DroneDocumentConfig | { data: DroneDocumentConfig }>(`/drone-document-configs/${id}/toggle-active`)
      .then((res) => unwrap(res.data)),
  delete: (id: string) =>
    api.delete(`/drone-document-configs/${id}`).then(() => undefined),
};
