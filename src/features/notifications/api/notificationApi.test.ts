import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/shared/api/client';
import { notificationApi } from './notificationApi';

vi.mock('@/shared/api/client', () => ({
  api: {
    get: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
  },
}));

describe('notificationApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('requests /notifications with default query params', async () => {
      const mockResponse = {
        data: {
          items: [
            {
              id: 'notif-1',
              eventType: 'INSPECTION_ASSIGNED',
              channel: 'IN_APP',
              title: 'Inspection Assigned',
              body: 'You have been assigned to inspection 1',
              targetPath: '/inspections/insp-1',
              status: 'SENT',
              readAt: null,
              createdAt: '2026-10-26T10:00:00Z',
              read: false,
            },
          ],
          page: 1,
          pageSize: 20,
          totalCount: 1,
          totalPages: 1,
        },
      };
      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      const result = await notificationApi.list();

      expect(api.get).toHaveBeenCalledWith('/notifications', {
        params: {
          page: 1,
          pageSize: 20,
          unreadOnly: undefined,
        },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('passes pagination and unreadOnly filters', async () => {
      const mockResponse = {
        data: {
          items: [],
          page: 2,
          pageSize: 10,
          totalCount: 0,
          totalPages: 0,
        },
      };
      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      const result = await notificationApi.list({ page: 2, pageSize: 10, unreadOnly: true });

      expect(api.get).toHaveBeenCalledWith('/notifications', {
        params: {
          page: 2,
          pageSize: 10,
          unreadOnly: true,
        },
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getUnreadCount', () => {
    it('requests /notifications/unread-count and returns count', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        data: { unreadCount: 5 },
      });

      const result = await notificationApi.getUnreadCount();

      expect(api.get).toHaveBeenCalledWith('/notifications/unread-count');
      expect(result).toEqual({ unreadCount: 5 });
    });
  });

  describe('markAsRead', () => {
    it('patches /notifications/{id}/read and returns updated notification', async () => {
      const mockUpdated = {
        id: 'notif-1',
        eventType: 'INSPECTION_ASSIGNED',
        channel: 'IN_APP',
        title: 'Inspection Assigned',
        body: 'You have been assigned to inspection 1',
        targetPath: '/inspections/insp-1',
        status: 'READ',
        readAt: '2026-10-26T10:05:00Z',
        createdAt: '2026-10-26T10:00:00Z',
        read: true,
      };
      vi.mocked(api.patch).mockResolvedValueOnce({ data: mockUpdated });

      const result = await notificationApi.markAsRead('notif-1');

      expect(api.patch).toHaveBeenCalledWith('/notifications/notif-1/read');
      expect(result).toEqual(mockUpdated);
    });
  });
});
