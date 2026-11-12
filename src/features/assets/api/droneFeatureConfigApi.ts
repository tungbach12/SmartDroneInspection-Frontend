import { api } from '@/shared/api/client';

export type DroneFeatureCategory = 'CAPABILITY' | 'SAFETY';

export interface DroneFeatureConfig {
  id: string;
  code: string;
  nameVi: string;
  nameEn: string;
  descriptionVi?: string | null;
  descriptionEn?: string | null;
  category: DroneFeatureCategory | string;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDroneFeatureConfigInput {
  code: string;
  nameVi: string;
  nameEn: string;
  descriptionVi?: string;
  descriptionEn?: string;
  category?: DroneFeatureCategory | string;
  isActive?: boolean;
  displayOrder?: number;
}

export interface UpdateDroneFeatureConfigInput {
  nameVi: string;
  nameEn: string;
  descriptionVi?: string;
  descriptionEn?: string;
  category?: DroneFeatureCategory | string;
  isActive?: boolean;
  displayOrder?: number;
}

function unwrap<T>(value: T | { data: T }): T {
  return typeof value === 'object' && value !== null && 'data' in value
    ? (value as { data: T }).data
    : (value as T);
}

export const droneFeatureConfigApi = {
  list: (includeInactive = false) =>
    api
      .get<DroneFeatureConfig[] | { data: DroneFeatureConfig[] }>('/drone-feature-configs', {
        params: { includeInactive },
      })
      .then((res) => unwrap(res.data)),
  create: (input: CreateDroneFeatureConfigInput) =>
    api
      .post<DroneFeatureConfig | { data: DroneFeatureConfig }>('/drone-feature-configs', input)
      .then((res) => unwrap(res.data)),
  update: (id: string, input: UpdateDroneFeatureConfigInput) =>
    api
      .put<DroneFeatureConfig | { data: DroneFeatureConfig }>(`/drone-feature-configs/${id}`, input)
      .then((res) => unwrap(res.data)),
  toggleActive: (id: string) =>
    api
      .patch<DroneFeatureConfig | { data: DroneFeatureConfig }>(`/drone-feature-configs/${id}/toggle-active`)
      .then((res) => unwrap(res.data)),
  delete: (id: string) =>
    api.delete(`/drone-feature-configs/${id}`).then(() => undefined),
};
