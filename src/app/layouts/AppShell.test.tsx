import type { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CustomThemeProvider } from '@/app/theme/CustomThemeProvider';
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

vi.mock('@/features/contracts/hooks/useContracts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/contracts/hooks/useContracts')>();
  return {
    ...actual,
    useUnreadChatSummary: () => ({
      totalUnread: 0,
      requestUnread: 0,
      inspectionUnread: 0,
      items: [],
      isLoading: false,
    }),
  };
});

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
      <CustomThemeProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/operations/dashboard']}>
            {children}
          </MemoryRouter>
        </QueryClientProvider>
      </CustomThemeProvider>
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

    expect(screen.getByRole('link', { name: 'Assignments' }).getAttribute('href')).toBe(
      '/operations/inspections?view=assignments',
    );
    expect(screen.getByRole('link', { name: 'Inspection Schedule' }).getAttribute('href')).toBe(
      '/operations/inspections?view=calendar',
    );
    expect(screen.getByRole('link', { name: 'Notifications' }).getAttribute('href')).toBe(
      '/operations/notifications',
    );
  });

  it('renders NotificationBell in toolbar with unread badge', async () => {
    render(<AppShell portal="operations" />, {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      const bell = screen.getByTestId('notification-bell-button');
      expect(bell).toBeTruthy();
      expect(within(bell).getByText('2')).toBeTruthy();
    });
  });

  it('clears notification cache on sign out', async () => {
    // Populate some notification data in the query client cache
    queryClient.setQueryData(notificationKeys.unreadCount('inspector-1'), { unreadCount: 2 });
    queryClient.setQueryData(notificationKeys.list('inspector-1'), { items: [], page: 1, totalCount: 0 });

    render(<AppShell portal="operations" />, {
      wrapper: createWrapper(queryClient),
    });

    const userMenuBtn = screen.getByRole('button', { name: /Inspector One/i });
    fireEvent.click(userMenuBtn);
    const signOutBtn = await screen.findByRole('menuitem', { name: /sign out/i });
    fireEvent.click(signOutBtn);

    await waitFor(() => {
      expect(logoutCurrentSession).toHaveBeenCalled();
      expect(useAuthStore.getState().status).toBe('anonymous');
      expect(mockNavigate).toHaveBeenCalledWith('/inspector/login', { replace: true });
    });

    // Verify notification query data is purged from cache
    expect(queryClient.getQueryData(notificationKeys.unreadCount('inspector-1'))).toBeUndefined();
    expect(queryClient.getQueryData(notificationKeys.list('inspector-1'))).toBeUndefined();
  });

  it('opens the theme customizer drawer and applies preset wallpaper to the shell', async () => {
    window.localStorage.clear();
    render(<AppShell portal="operations" />, {
      wrapper: createWrapper(queryClient),
    });

    fireEvent.click(screen.getByTestId('theme-customizer-trigger'));
    expect(await screen.findByRole('dialog')).toBeTruthy();
    expect(await screen.findByTestId('theme-customization-panel')).toBeTruthy();

    fireEvent.click(screen.getByTestId('bg-preset-teal-mesh'));
    await waitFor(() => {
      const root = screen.getByTestId('appshell-root');
      expect(window.getComputedStyle(root).backgroundImage).toContain('teal-soft-dark-v1.png');
    });

    fireEvent.click(screen.getByTestId('bg-target-workspace'));
    await waitFor(() => {
      const outer = screen.getByTestId('appshell-workspace-outer');
      expect(window.getComputedStyle(outer).backgroundImage).toContain('teal-soft-dark-v1.png');
    });

    fireEvent.click(screen.getByTestId('theme-reset-default-button'));
    await waitFor(() => {
      const root = screen.getByTestId('appshell-root');
      expect(window.getComputedStyle(root).backgroundImage).not.toContain('teal-soft-dark-v1.png');
    });
  });
});

