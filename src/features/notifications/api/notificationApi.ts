import { api } from '@/shared/api/client';

export type NotificationChannel = 'IN_APP' | (string & {});
export type NotificationStatus = 'SENT' | 'READ' | (string & {});

export interface NotificationItem {
  id: string;
  eventType: string;
  channel: NotificationChannel;
  title: string;
  body: string;
  targetPath: string | null;
  status: NotificationStatus;
  readAt: string | null;
  createdAt: string;
  read: boolean;
}

export interface NotificationPageResponse {
  items: NotificationItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface NotificationUnreadCountResponse {
  unreadCount: number;
}

export interface NotificationFilters {
  page?: number | undefined;
  pageSize?: number | undefined;
  unreadOnly?: boolean | undefined;
}

export const notificationApi = {
  async list(filters?: NotificationFilters): Promise<NotificationPageResponse> {
    const response = await api.get<NotificationPageResponse>('/notifications', {
      params: {
        page: filters?.page ?? 1,
        pageSize: filters?.pageSize ?? 20,
        unreadOnly: filters?.unreadOnly !== undefined ? filters.unreadOnly : undefined,
      },
    });
    return response.data;
  },

  async getUnreadCount(): Promise<NotificationUnreadCountResponse> {
    const response = await api.get<NotificationUnreadCountResponse>('/notifications/unread-count');
    return response.data;
  },

  async markAsRead(id: string): Promise<NotificationItem> {
    try {
      const response = await api.patch<NotificationItem>(`/notifications/${id}/read`);
      return response.data;
    } catch {
      // Fallback to PUT if PATCH is rejected by reverse proxy or gateway
      const response = await api.put<NotificationItem>(`/notifications/${id}/read`);
      return response.data;
    }
  },
};
