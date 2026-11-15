import { api } from '@/shared/api/client';

export interface PilotLicenseClass {
  id: string;
  name: string;
  description?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

function unwrap<T>(value: T | { data: T }): T {
  return typeof value === 'object' && value !== null && 'data' in value
    ? (value as { data: T }).data
    : (value as T);
}

export const pilotLicenseClassApi = {
  listActive: () =>
    api
      .get<PilotLicenseClass[] | { data: PilotLicenseClass[] }>('/pilot-license-classes')
      .then((response) => unwrap(response.data)),
  listAll: () =>
    api
      .get<PilotLicenseClass[] | { data: PilotLicenseClass[] }>('/pilot-license-classes/admin')
      .then((response) => unwrap(response.data)),
  create: (input: { name: string; description?: string | null; active: boolean }) =>
    api
      .post<PilotLicenseClass | { data: PilotLicenseClass }>('/pilot-license-classes', input)
      .then((response) => unwrap(response.data)),
  update: (
    id: string,
    input: { name: string; description?: string | null; active: boolean },
  ) =>
    api
      .put<PilotLicenseClass | { data: PilotLicenseClass }>(`/pilot-license-classes/${id}`, input)
      .then((response) => unwrap(response.data)),
  deactivate: (id: string) => api.delete(`/pilot-license-classes/${id}`),
};
