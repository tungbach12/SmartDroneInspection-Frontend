import type { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { notificationApi } from '../api/notificationApi';
import { NotificationBell } from './NotificationBell';

vi.mock('../api/notificationApi', () => ({
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
  };
});

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          {children}
        </MemoryRouter>
      </QueryClientProvider>
    );
  };
}

describe('NotificationBell & Inbox', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.resetAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    useAuthStore.getState().setSession({
      accessToken: 'token-123',
      user: {
        id: 'inspector-1',
        email: 'inspector@example.com',
        fullName: 'Inspector One',
        roles: ['INSPECTOR'],
        actorZone: 'CUSTOMER_ORGANIZATION',
        organizationId: 'org-1',
      },
    });
  });

  afterEach(() => {
    cleanup();
    useAuthStore.getState().clearSession();
    vi.resetAllMocks();
  });

  it('renders bell with unread badge count', async () => {
    vi.mocked(notificationApi.getUnreadCount).mockResolvedValue({ unreadCount: 3 });

    render(<NotificationBell portal="operations" />, {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(screen.getByTestId('notification-bell-button')).toBeTruthy();
      expect(screen.getByText('3')).toBeTruthy();
    });
  });

  it('opens inbox popover on click and displays notification items', async () => {
    vi.mocked(notificationApi.getUnreadCount).mockResolvedValue({ unreadCount: 1 });
    vi.mocked(notificationApi.list).mockResolvedValue({
      items: [
        {
          id: 'notif-1',
          eventType: 'INSPECTION_ASSIGNED',
          channel: 'IN_APP',
          title: 'Inspection Assigned',
          body: 'You have been assigned to inspection 101',
          targetPath: '/inspections/insp-101',
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
    });

    render(<NotificationBell portal="operations" />, {
      wrapper: createWrapper(queryClient),
    });

    const bellBtn = screen.getByTestId('notification-bell-button');
    fireEvent.click(bellBtn);

    expect(await screen.findByText('Inspection Assigned')).toBeTruthy();
    expect(screen.getByText('You have been assigned to inspection 101')).toBeTruthy();
    expect(screen.getByText(/in-app/i)).toBeTruthy();
  });

  it('clicking a notification item with safe route marks it as read and navigates', async () => {
    vi.mocked(notificationApi.getUnreadCount).mockResolvedValue({ unreadCount: 1 });
    vi.mocked(notificationApi.list).mockResolvedValue({
      items: [
        {
          id: 'notif-1',
          eventType: 'INSPECTION_ASSIGNED',
          channel: 'IN_APP',
          title: 'Inspection Assigned',
          body: 'Assigned to insp-101',
          targetPath: '/inspections/insp-101',
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
    });
    vi.mocked(notificationApi.markAsRead).mockResolvedValue({
      id: 'notif-1',
      eventType: 'INSPECTION_ASSIGNED',
      channel: 'IN_APP',
      title: 'Inspection Assigned',
      body: 'Assigned to insp-101',
      targetPath: '/inspections/insp-101',
      status: 'READ',
      readAt: '2026-10-26T10:05:00Z',
      createdAt: '2026-10-26T10:00:00Z',
      read: true,
    });

    render(<NotificationBell portal="operations" />, {
      wrapper: createWrapper(queryClient),
    });

    fireEvent.click(screen.getByTestId('notification-bell-button'));

    const item = await screen.findByText('Inspection Assigned');
    fireEvent.click(item);

    await waitFor(() => {
      expect(notificationApi.markAsRead).toHaveBeenCalledWith('notif-1');
      expect(mockNavigate).toHaveBeenCalledWith('/operations/inspections/insp-101');
    });
  });

  it('clicking a notification with invalid/external targetPath marks as read without navigation', async () => {
    vi.mocked(notificationApi.getUnreadCount).mockResolvedValue({ unreadCount: 1 });
    vi.mocked(notificationApi.list).mockResolvedValue({
      items: [
        {
          id: 'notif-2',
          eventType: 'SYSTEM_INFO',
          channel: 'IN_APP',
          title: 'System Notice',
          body: 'Notice with external link',
          targetPath: 'https://evil.com/phish',
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
    });
    vi.mocked(notificationApi.markAsRead).mockResolvedValue({
      id: 'notif-2',
      eventType: 'SYSTEM_INFO',
      channel: 'IN_APP',
      title: 'System Notice',
      body: 'Notice with external link',
      targetPath: 'https://evil.com/phish',
      status: 'READ',
      readAt: '2026-10-26T10:05:00Z',
      createdAt: '2026-10-26T10:00:00Z',
      read: true,
    });

    render(<NotificationBell portal="operations" />, {
      wrapper: createWrapper(queryClient),
    });

    fireEvent.click(screen.getByTestId('notification-bell-button'));

    const item = await screen.findByText('System Notice');
    fireEvent.click(item);

    await waitFor(() => {
      expect(notificationApi.markAsRead).toHaveBeenCalledWith('notif-2');
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it('filters notifications by Only unread tab', async () => {
    vi.mocked(notificationApi.getUnreadCount).mockResolvedValue({ unreadCount: 2 });
    vi.mocked(notificationApi.list).mockResolvedValue({
      items: [
        {
          id: 'notif-3',
          eventType: 'INSPECTION_REMINDER',
          channel: 'IN_APP',
          title: 'Inspection Reminder',
          body: 'Upcoming inspection in 3 days',
          targetPath: '/inspections/insp-200',
          status: 'SENT',
          readAt: null,
          createdAt: '2026-10-26T10:00:00Z',
          read: false,
        },
      ],
      page: 1,
      pageSize: 10,
      totalCount: 1,
      totalPages: 1,
    });

    render(<NotificationBell portal="operations" />, {
      wrapper: createWrapper(queryClient),
    });

    fireEvent.click(screen.getByTestId('notification-bell-button'));
    expect(await screen.findByText('Inspection Reminder')).toBeTruthy();

    const unreadTab = screen.getByRole('tab', { name: /only unread/i });
    fireEvent.click(unreadTab);

    await waitFor(() => {
      expect(notificationApi.list).toHaveBeenCalledWith({
        page: 1,
        pageSize: 10,
        unreadOnly: true,
      });
    });
  });

  it('allows marking a single notification as read via check button without navigating', async () => {
    vi.mocked(notificationApi.getUnreadCount).mockResolvedValue({ unreadCount: 1 });
    vi.mocked(notificationApi.list).mockResolvedValue({
      items: [
        {
          id: 'notif-4',
          eventType: 'INSPECTION_ASSIGNED',
          channel: 'IN_APP',
          title: 'Mark read test',
          body: 'Check button test',
          targetPath: '/inspections/insp-4',
          status: 'SENT',
          readAt: null,
          createdAt: '2026-10-26T10:00:00Z',
          read: false,
        },
      ],
      page: 1,
      pageSize: 10,
      totalCount: 1,
      totalPages: 1,
    });
    vi.mocked(notificationApi.markAsRead).mockResolvedValue({
      id: 'notif-4',
      eventType: 'INSPECTION_ASSIGNED',
      channel: 'IN_APP',
      title: 'Mark read test',
      body: 'Check button test',
      targetPath: '/inspections/insp-4',
      status: 'READ',
      readAt: '2026-10-26T10:05:00Z',
      createdAt: '2026-10-26T10:00:00Z',
      read: true,
    });

    render(<NotificationBell portal="operations" />, {
      wrapper: createWrapper(queryClient),
    });

    fireEvent.click(screen.getByTestId('notification-bell-button'));
    expect(await screen.findByText('Mark read test')).toBeTruthy();

    const markBtn = screen.getByRole('button', { name: /mark as read/i });
    fireEvent.click(markBtn);

    await waitFor(() => {
      expect(notificationApi.markAsRead).toHaveBeenCalledWith('notif-4');
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it('allows marking all in view as read', async () => {
    vi.mocked(notificationApi.getUnreadCount).mockResolvedValue({ unreadCount: 2 });
    vi.mocked(notificationApi.list).mockResolvedValue({
      items: [
        {
          id: 'n-1',
          eventType: 'EVENT',
          channel: 'IN_APP',
          title: 'Item 1',
          body: 'Body 1',
          targetPath: null,
          status: 'SENT',
          readAt: null,
          createdAt: '2026-10-26T10:00:00Z',
          read: false,
        },
        {
          id: 'n-2',
          eventType: 'EVENT',
          channel: 'IN_APP',
          title: 'Item 2',
          body: 'Body 2',
          targetPath: null,
          status: 'SENT',
          readAt: null,
          createdAt: '2026-10-26T10:00:00Z',
          read: false,
        },
      ],
      page: 1,
      pageSize: 10,
      totalCount: 2,
      totalPages: 1,
    });
    vi.mocked(notificationApi.markAsRead).mockResolvedValue({
      id: 'n-1',
      eventType: 'EVENT',
      channel: 'IN_APP',
      title: 'Item 1',
      body: 'Body 1',
      targetPath: null,
      status: 'READ',
      readAt: '2026-10-26T10:05:00Z',
      createdAt: '2026-10-26T10:00:00Z',
      read: true,
    });

    render(<NotificationBell portal="operations" />, {
      wrapper: createWrapper(queryClient),
    });

    fireEvent.click(screen.getByTestId('notification-bell-button'));
    expect(await screen.findByText('Item 1')).toBeTruthy();

    const markAllBtn = screen.getByRole('button', { name: /mark all as read/i });
    fireEvent.click(markAllBtn);

    await waitFor(() => {
      expect(notificationApi.markAsRead).toHaveBeenCalledWith('n-1');
      expect(notificationApi.markAsRead).toHaveBeenCalledWith('n-2');
    });
  });

  it('handles pagination controls when multiple pages exist', async () => {
    vi.mocked(notificationApi.getUnreadCount).mockResolvedValue({ unreadCount: 0 });
    vi.mocked(notificationApi.list).mockResolvedValue({
      items: [
        {
          id: 'p1',
          eventType: 'EVENT',
          channel: 'IN_APP',
          title: 'Page 1 Item',
          body: 'Body',
          targetPath: null,
          status: 'READ',
          readAt: '2026-10-26T10:00:00Z',
          createdAt: '2026-10-26T10:00:00Z',
          read: true,
        },
      ],
      page: 1,
      pageSize: 10,
      totalCount: 25,
      totalPages: 3,
    });

    render(<NotificationBell portal="operations" />, {
      wrapper: createWrapper(queryClient),
    });

    fireEvent.click(screen.getByTestId('notification-bell-button'));
    expect(await screen.findByText('Page 1 Item')).toBeTruthy();
    expect(screen.getByText('1 / 3')).toBeTruthy();

    const nextBtn = screen.getByLabelText('Next page');
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(notificationApi.list).toHaveBeenCalledWith({
        page: 2,
        pageSize: 10,
        unreadOnly: undefined,
      });
    });
  });

  it('renders empty state when there are no notifications', async () => {
    vi.mocked(notificationApi.getUnreadCount).mockResolvedValue({ unreadCount: 0 });
    vi.mocked(notificationApi.list).mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 20,
      totalCount: 0,
      totalPages: 0,
    });

    render(<NotificationBell portal="operations" />, {
      wrapper: createWrapper(queryClient),
    });

    fireEvent.click(screen.getByTestId('notification-bell-button'));

    expect(await screen.findByRole('heading', { name: /no notifications/i })).toBeTruthy();
  });

  it('renders error alert when list fetch fails', async () => {
    vi.mocked(notificationApi.getUnreadCount).mockResolvedValue({ unreadCount: 0 });
    vi.mocked(notificationApi.list).mockRejectedValue(new Error('Network error'));

    render(<NotificationBell portal="operations" />, {
      wrapper: createWrapper(queryClient),
    });

    fireEvent.click(screen.getByTestId('notification-bell-button'));

    expect(await screen.findByText(/failed to load notifications/i)).toBeTruthy();
  });
});

