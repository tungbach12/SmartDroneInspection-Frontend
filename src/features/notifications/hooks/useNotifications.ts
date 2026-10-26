import { useEffect } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store/authStore';
import {
  notificationApi,
  type NotificationFilters,
  type NotificationItem,
  type NotificationPageResponse,
} from '../api/notificationApi';

export const notificationKeys = {
  all: ['notifications'] as const,
  user: (userId: string | null) => ['notifications', userId] as const,
  lists: (userId: string | null) => ['notifications', userId, 'list'] as const,
  list: (userId: string | null, filters?: NotificationFilters) =>
    ['notifications', userId, 'list', filters ?? {}] as const,
  unreadCount: (userId: string | null) => ['notifications', userId, 'unread-count'] as const,
};

export function clearNotificationCache(queryClient: QueryClient): void {
  queryClient.removeQueries({ queryKey: notificationKeys.all });
}

export function useNotifications(
  filters?: NotificationFilters,
  options?: { enabled?: boolean },
) {
  const userId = useAuthStore((state) => state.userId);
  const status = useAuthStore((state) => state.status);
  const isEnabled =
    (options?.enabled ?? true) && status === 'authenticated' && Boolean(userId);

  return useQuery({
    queryKey: notificationKeys.list(userId, filters),
    queryFn: () => notificationApi.list(filters),
    enabled: isEnabled,
  });
}

export function useNotificationUnreadCount(options?: {
  enabled?: boolean;
  refetchInterval?: number;
}) {
  const userId = useAuthStore((state) => state.userId);
  const status = useAuthStore((state) => state.status);
  const isEnabled =
    (options?.enabled ?? true) && status === 'authenticated' && Boolean(userId);

  return useQuery({
    queryKey: notificationKeys.unreadCount(userId),
    queryFn: () => notificationApi.getUnreadCount(),
    enabled: isEnabled,
    refetchInterval: options?.refetchInterval ?? 30_000,
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.userId);

  return useMutation({
    mutationFn: (id: string) => notificationApi.markAsRead(id),
    onSuccess: (updated: NotificationItem) => {
      // Invalidate unread count so badge updates
      void queryClient.invalidateQueries({
        queryKey: notificationKeys.unreadCount(userId),
      });

      // Update matching item in all list queries for this user
      queryClient.setQueriesData<NotificationPageResponse>(
        { queryKey: notificationKeys.lists(userId) },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((item) =>
              item.id === updated.id
                ? {
                    ...item,
                    status: 'READ',
                    read: true,
                    readAt: updated.readAt ?? new Date().toISOString(),
                  }
                : item,
            ),
          };
        },
      );
    },
  });
}

/**
 * Automatically clears notification query cache when the auth session changes or ends.
 */
export function useNotificationSessionSync(): void {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.userId);
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    if (status === 'anonymous' || !userId) {
      clearNotificationCache(queryClient);
    }
  }, [queryClient, status, userId]);
}
