import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store/authStore';
import { dashboardApi, type DashboardAnalytics } from '../api/dashboardApi';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  analytics: (userId?: string | null, role?: string) =>
    [...dashboardKeys.all, 'analytics', userId ?? 'anonymous', role ?? 'default'] as const,
};

export function useDashboardAnalytics(role?: string) {
  const userId = useAuthStore((s) => s.userId);
  return useQuery<DashboardAnalytics>({
    queryKey: dashboardKeys.analytics(userId, role),
    queryFn: () => dashboardApi.getAnalytics(role),
    staleTime: 5_000,
  });
}
