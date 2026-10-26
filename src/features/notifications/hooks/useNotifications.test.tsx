import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { notificationApi } from '../api/notificationApi';
import {
  clearNotificationCache,
  notificationKeys,
  useMarkNotificationAsRead,
  useNotifications,
  useNotificationUnreadCount,
} from './useNotifications';

vi.mock('../api/notificationApi', () => ({
  notificationApi: {
    list: vi.fn(),
    getUnreadCount: vi.fn(),
    markAsRead: vi.fn(),
  },
}));

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe('useNotifications hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    useAuthStore.getState().setSession({
      accessToken: 'token-123',
      user: {
        id: 'user-1',
        email: 'user@example.com',
        fullName: 'Test User',
        roles: ['INSPECTOR'],
        actorZone: 'CUSTOMER_ORGANIZATION',
        organizationId: 'org-1',
      },
    });
  });

  describe('useNotifications', () => {
    it('fetches notifications list for authenticated user', async () => {
      const mockPage = {
        items: [
          {
            id: 'notif-1',
            eventType: 'INSPECTION_ASSIGNED',
            channel: 'IN_APP',
            title: 'Assigned',
            body: 'Inspection 1',
            targetPath: '/inspections/1',
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
      };
      vi.mocked(notificationApi.list).mockResolvedValueOnce(mockPage);

      const { result } = renderHook(() => useNotifications({ page: 1 }), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockPage);
      expect(notificationApi.list).toHaveBeenCalledWith({ page: 1 });
    });

    it('stays disabled when user is not authenticated', () => {
      useAuthStore.getState().clearSession();

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(notificationApi.list).not.toHaveBeenCalled();
    });
  });

  describe('useNotificationUnreadCount', () => {
    it('fetches unread count for authenticated user', async () => {
      vi.mocked(notificationApi.getUnreadCount).mockResolvedValueOnce({ unreadCount: 3 });

      const { result } = renderHook(() => useNotificationUnreadCount({ refetchInterval: 0 }), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual({ unreadCount: 3 });
      expect(notificationApi.getUnreadCount).toHaveBeenCalledTimes(1);
    });
  });

  describe('useMarkNotificationAsRead', () => {
    it('marks notification as read and updates cache', async () => {
      const mockUpdated = {
        id: 'notif-1',
        eventType: 'INSPECTION_ASSIGNED',
        channel: 'IN_APP',
        title: 'Assigned',
        body: 'Inspection 1',
        targetPath: '/inspections/1',
        status: 'READ',
        readAt: '2026-10-26T10:05:00Z',
        createdAt: '2026-10-26T10:00:00Z',
        read: true,
      };
      vi.mocked(notificationApi.markAsRead).mockResolvedValueOnce(mockUpdated);

      // Prepopulate list cache
      const listKey = notificationKeys.list('user-1', { page: 1 });
      queryClient.setQueryData(listKey, {
        items: [
          {
            id: 'notif-1',
            status: 'SENT',
            read: false,
          },
        ],
        page: 1,
        pageSize: 20,
        totalCount: 1,
        totalPages: 1,
      });

      const { result } = renderHook(() => useMarkNotificationAsRead(), {
        wrapper: createWrapper(queryClient),
      });

      await result.current.mutateAsync('notif-1');

      expect(notificationApi.markAsRead).toHaveBeenCalledWith('notif-1');
      const cached = queryClient.getQueryData<any>(listKey);
      expect(cached.items[0].read).toBe(true);
      expect(cached.items[0].status).toBe('READ');
    });
  });

  describe('clearNotificationCache', () => {
    it('removes all notification queries from queryClient', () => {
      queryClient.setQueryData(notificationKeys.all, 'some-data');
      queryClient.setQueryData(notificationKeys.unreadCount('user-1'), { unreadCount: 5 });

      clearNotificationCache(queryClient);

      expect(queryClient.getQueryData(notificationKeys.unreadCount('user-1'))).toBeUndefined();
    });
  });
});

