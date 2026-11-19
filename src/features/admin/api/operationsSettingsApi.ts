import { api } from '@/shared/api/client';

export interface PlatformOperationsSettings {
  assignmentAcceptanceTimeoutHours: number;
  updatedByUserId: string | null;
  updatedAt: string | null;
}

export interface UpdatePlatformOperationsSettingsPayload {
  assignmentAcceptanceTimeoutHours: number;
}

export const operationsSettingsApi = {
  async getSettings(): Promise<PlatformOperationsSettings> {
    const { data } = await api.get<PlatformOperationsSettings>('/platform/operations-settings');
    return data;
  },

  async updateSettings(
    payload: UpdatePlatformOperationsSettingsPayload,
  ): Promise<PlatformOperationsSettings> {
    const { data } = await api.put<PlatformOperationsSettings>(
      '/platform/operations-settings',
      payload,
    );
    return data;
  },
};
