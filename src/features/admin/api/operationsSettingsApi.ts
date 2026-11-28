import { api, setApiRequestTimeoutMs } from '@/shared/api/client';

export interface PlatformOperationsSettings {
  assignmentAcceptanceTimeoutHours: number;
  serviceRequestLeadDays: number;
  apiRequestTimeoutSeconds: number;
  updatedByUserId: string | null;
  updatedAt: string | null;
}

export interface UpdatePlatformOperationsSettingsPayload {
  assignmentAcceptanceTimeoutHours: number;
  serviceRequestLeadDays: number;
  apiRequestTimeoutSeconds: number;
}

export interface ClientTimeoutPolicy {
  apiRequestTimeoutSeconds: number;
}

export const operationsSettingsApi = {
  async getSettings(): Promise<PlatformOperationsSettings> {
    const { data } = await api.get<PlatformOperationsSettings>('/platform/operations-settings');
    return data;
  },

  async getClientTimeout(): Promise<ClientTimeoutPolicy> {
    const { data } = await api.get<ClientTimeoutPolicy>('/platform/operations-settings/client-timeout');
    return data;
  },

  async updateSettings(
    payload: UpdatePlatformOperationsSettingsPayload,
  ): Promise<PlatformOperationsSettings> {
    const { data } = await api.put<PlatformOperationsSettings>(
      '/platform/operations-settings',
      payload,
    );
    if (typeof data.apiRequestTimeoutSeconds === 'number') {
      setApiRequestTimeoutMs(data.apiRequestTimeoutSeconds * 1000);
    }
    return data;
  },
};
