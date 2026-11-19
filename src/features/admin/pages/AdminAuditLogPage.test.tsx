import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { theme } from '@/app/theme/theme';
import AdminAuditLogPage from './AdminAuditLogPage';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
}));

vi.mock('../api/auditLogApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/auditLogApi')>();
  return {
    ...actual,
    auditLogApi: { list: mocks.list },
  };
});

const entries = [
  {
    id: 'event-1',
    actorUserId: 'user-1',
    actorEmail: 'admin@example.test',
    actorFullName: 'Platform Admin',
    action: 'INSPECTOR_PROFILE_UPDATED',
    aggregateType: 'INSPECTOR_PROFILE',
    aggregateId: 'aggregate-1',
    outcome: 'SUCCESS',
    traceId: 'trace-1',
    createdAt: '2026-11-19T10:00:00Z',
  },
  {
    id: 'event-2',
    actorUserId: 'user-2',
    actorEmail: 'manager@example.test',
    actorFullName: 'Platform Manager',
    action: 'PLATFORM_SETTINGS_UPDATED',
    aggregateType: 'PLATFORM_SETTINGS',
    aggregateId: 'aggregate-2',
    outcome: 'DENIED',
    traceId: 'trace-2',
    createdAt: '2026-11-18T10:00:00Z',
  },
];

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={['/admin/audit-logs']}>
          <AdminAuditLogPage />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('AdminAuditLogPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockResolvedValue({
      items: entries,
      page: 0,
      size: 50,
      total: 2,
      totalPages: 1,
      availableActions: ['INSPECTOR_PROFILE_UPDATED', 'PLATFORM_SETTINGS_UPDATED'],
    });
  });

  afterEach(cleanup);

  it('lists the platform activity log with known actions', async () => {
    renderPage();

    expect(await screen.findByText('INSPECTOR_PROFILE_UPDATED')).toBeTruthy();
    expect(screen.getByText('PLATFORM_SETTINGS_UPDATED')).toBeTruthy();
    expect(screen.getByText('Platform Admin')).toBeTruthy();

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Action' }));
    expect(await screen.findByRole('option', { name: 'PLATFORM_SETTINGS_UPDATED' })).toBeTruthy();
  });

  it('sends query, action, outcome, and day-range filters to the API', async () => {
    renderPage();
    await screen.findByText('INSPECTOR_PROFILE_UPDATED');

    fireEvent.change(screen.getByLabelText('Search activity'), {
      target: { value: 'admin@example.test' },
    });
    await waitFor(() =>
      expect(mocks.list).toHaveBeenLastCalledWith({
        page: 0,
        size: 50,
        query: 'admin@example.test',
      }),
    );

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Outcome' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Denied' }));
    await waitFor(() =>
      expect(mocks.list).toHaveBeenLastCalledWith({
        page: 0,
        size: 50,
        query: 'admin@example.test',
        outcome: 'DENIED',
      }),
    );

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Time range' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Last 7 days' }));
    await waitFor(() =>
      expect(mocks.list).toHaveBeenLastCalledWith({
        page: 0,
        size: 50,
        query: 'admin@example.test',
        outcome: 'DENIED',
        days: 7,
      }),
    );
  });

  it('opens the centered event detail dialog on row click', async () => {
    renderPage();

    fireEvent.click(await screen.findByText('INSPECTOR_PROFILE_UPDATED'));

    expect(await screen.findByText('Activity event detail')).toBeTruthy();
    expect(screen.getByText('trace-1')).toBeTruthy();
    expect(screen.getByText('aggregate-1')).toBeTruthy();
    expect(screen.getByText('event-1')).toBeTruthy();
  });
});
