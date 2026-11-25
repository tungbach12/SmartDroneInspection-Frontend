import type { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { notificationApi } from '../api/notificationApi';
import NotificationsPage from './NotificationsPage';

vi.mock('../api/notificationApi', () => ({
  notificationApi: {
    list: vi.fn(),
    getUnreadCount: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
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
    useLocation: () => ({ pathname: '/manager/notifications', search: '', hash: '' }),
  };
});

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/manager/notifications']}>
          {children}
        </MemoryRouter>
      </QueryClientProvider>
    );
  };
}

describe('NotificationsPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.resetAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    useAuthStore.getState().setSession({
      accessToken: 'token-mgr',
      user: {
        id: 'mgr-1',
        email: 'manager@example.com',
        fullName: 'Manager One',
        roles: ['MANAGER'],
      },
    });
  });

  afterEach(() => {
    cleanup();
    useAuthStore.getState().clearSession();
  });

  it('groups notifications by TODAY and EARLIER and filters with search & Only unread', async () => {
    const nowIso = new Date().toISOString();
    vi.mocked(notificationApi.getUnreadCount).mockResolvedValue({ unreadCount: 1 });
    vi.mocked(notificationApi.list).mockResolvedValue({
      items: [
        {
          id: 'n-today',
          eventType: 'INSPECTION_DECLINED',
          channel: 'IN_APP',
          title: 'Inspector declined scheduled flight',
          body: 'Wind speed exceeded threshold.',
          targetPath: '/manager/inspections/insp-1',
          status: 'SENT',
          readAt: null,
          createdAt: nowIso,
          read: false,
        },
        {
          id: 'n-old',
          eventType: 'REPORT_PUBLISHED',
          channel: 'IN_APP',
          title: 'Report published',
          body: 'Official report is ready.',
          targetPath: '/manager/inspections/insp-2/review',
          status: 'READ',
          readAt: '2026-10-01T10:00:00Z',
          createdAt: '2026-10-01T09:00:00Z',
          read: true,
        },
      ],
      page: 1,
      pageSize: 20,
      totalCount: 2,
      totalPages: 1,
    });
    vi.mocked(notificationApi.markAsRead).mockResolvedValue({
      id: 'n-today',
      eventType: 'INSPECTION_DECLINED',
      channel: 'IN_APP',
      title: 'Inspector declined scheduled flight',
      body: 'Wind speed exceeded threshold.',
      targetPath: '/manager/inspections/insp-1',
      status: 'READ',
      readAt: nowIso,
      createdAt: nowIso,
      read: true,
    });

    render(<NotificationsPage />, { wrapper: createWrapper(queryClient) });

    expect(await screen.findByText('TODAY')).toBeTruthy();
    expect(screen.getByText('EARLIER')).toBeTruthy();
    expect(screen.getByText('Inspector declined scheduled flight')).toBeTruthy();
    expect(screen.getByText('Report published')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Search notifications'), {
      target: { value: 'Wind' },
    });
    expect(screen.getByText('Inspector declined scheduled flight')).toBeTruthy();
    expect(screen.queryByText('Report published')).toBeNull();

    fireEvent.click(screen.getByText('Inspector declined scheduled flight'));
    await waitFor(() => {
      expect(notificationApi.markAsRead).toHaveBeenCalledWith('n-today');
      expect(mockNavigate).toHaveBeenCalledWith('/manager/inspections/insp-1');
    });
  });

  it('marks all unread notifications as read when clicking Mark all as read', async () => {
    const nowIso = new Date().toISOString();
    vi.mocked(notificationApi.getUnreadCount).mockResolvedValue({ unreadCount: 1 });
    vi.mocked(notificationApi.list).mockResolvedValue({
      items: [
        {
          id: 'n-unread',
          eventType: 'SECURITY_ALERT',
          channel: 'IN_APP',
          title: 'Cảnh báo bảo mật | Security alert',
          body: 'Mật khẩu đã thay đổi | Password updated',
          targetPath: '/profile?tab=security',
          status: 'SENT',
          readAt: null,
          createdAt: nowIso,
          read: false,
        },
      ],
      page: 1,
      pageSize: 20,
      totalCount: 1,
      totalPages: 1,
    });
    vi.mocked(notificationApi.markAllAsRead).mockResolvedValue({ updatedCount: 1 });

    render(<NotificationsPage />, { wrapper: createWrapper(queryClient) });

    expect(await screen.findByText('Security alert')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }));
    await waitFor(() => {
      expect(notificationApi.markAllAsRead).toHaveBeenCalledTimes(1);
    });
  });
});
