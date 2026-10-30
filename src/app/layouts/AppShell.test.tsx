import type { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { logoutCurrentSession } from '@/features/auth/api/authApi';
import { notificationApi } from '@/features/notifications/api/notificationApi';
import { notificationKeys } from '@/features/notifications/hooks/useNotifications';
import { AppShell } from './AppShell';

vi.mock('@/features/auth/api/authApi', () => ({
  logoutCurrentSession: vi.fn().mockResolvedValue(undefined),
  getAuthErrorMessage: vi.fn((err: any) => err?.message ?? 'Auth error'),
}));

vi.mock('@/features/notifications/api/notificationApi', () => ({
  notificationApi: {
    list: vi.fn(),
    getUnreadCount: vi.fn(),
    markAsRead: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/operations/dashboard', search: '', hash: '' }),
  };
});

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/operations/dashboard']}>
          {children}
        </MemoryRouter>
      </QueryClientProvider>
    );
  };
}

describe('AppShell with NotificationBell integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.resetAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    useAuthStore.getState().setSession({
      accessToken: 'token-operations',
      user: {
        id: 'inspector-1',
        email: 'inspector@example.com',
        fullName: 'Inspector One',
        roles: ['INSPECTOR'],
        actorZone: 'CUSTOMER_ORGANIZATION',
        organizationId: 'org-1',
      },
    });

    vi.mocked(notificationApi.getUnreadCount).mockResolvedValue({ unreadCount: 2 });
  });

  afterEach(() => {
    cleanup();
    useAuthStore.getState().clearSession();
    vi.resetAllMocks();
  });

  it('shows Inspectors a direct Schedule link to their inspection calendar', () => {
    render(<AppShell portal="operations" />, {
      wrapper: createWrapper(queryClient),
    });
    fireEvent.click(screen.getByRole('button', { name: 'Hide sidebar' }));

    expect(screen.getByRole('link', { name: 'Inspection Schedule' }).getAttribute('href')).toBe(
      '/operations/inspections?view=calendar',
    );
  });

  it('does not show the Inspector Schedule link to Maintenance Engineers', () => {
    useAuthStore.getState().setSession({
      accessToken: 'token-engineer',
      user: {
        id: 'engineer-1',
        email: 'engineer@example.com',
        fullName: 'Engineer One',
        roles: ['MAINTENANCE_ENGINEER'],
        actorZone: 'CUSTOMER_ORGANIZATION',
        organizationId: 'org-1',
      },
    });

    render(<AppShell portal="operations" />, {
      wrapper: createWrapper(queryClient),
    });
    fireEvent.click(screen.getByRole('button', { name: 'Hide sidebar' }));

    expect(screen.queryByRole('link', { name: 'Inspection Schedule' })).toBeNull();
  });

  it('renders NotificationBell in toolbar with unread badge', async () => {
    render(<AppShell portal="operations" />, {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(screen.getByTestId('notification-bell-button')).toBeTruthy();
      expect(screen.getByText('2')).toBeTruthy();
    });
  });

  it('clears notification cache on sign out', async () => {
    // Populate some notification data in the query client cache
    queryClient.setQueryData(notificationKeys.unreadCount('inspector-1'), { unreadCount: 2 });
    queryClient.setQueryData(notificationKeys.list('inspector-1'), { items: [], page: 1, totalCount: 0 });

    render(<AppShell portal="operations" />, {
      wrapper: createWrapper(queryClient),
    });

    const signOutBtn = screen.getByLabelText(/sign out/i);
    fireEvent.click(signOutBtn);

    await waitFor(() => {
      expect(logoutCurrentSession).toHaveBeenCalled();
      expect(useAuthStore.getState().status).toBe('anonymous');
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    });

    // Verify notification query data is purged from cache
    expect(queryClient.getQueryData(notificationKeys.unreadCount('inspector-1'))).toBeUndefined();
    expect(queryClient.getQueryData(notificationKeys.list('inspector-1'))).toBeUndefined();
  });
});

