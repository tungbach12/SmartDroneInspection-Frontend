import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const roles = vi.hoisted(() => ({ current: ['CUSTOMER'] as string[] }));

vi.mock('@/features/auth/store/authStore', () => ({
  useAuthStore: (selector: (state: { roles: string[] }) => unknown) =>
    selector({ roles: roles.current }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/client/assets' }),
}));

const mockRecurringSchedule = {
  id: 'sched-101',
  organizationId: 'org-1',
  assetId: 'asset-1',
  assetName: 'Main Cable Bridge',
  assetLocationText: 'Km 10, National Highway',
  createdByUserId: 'user-manager',
  createdByName: 'Manager Alice',
  inspectorId: 'insp-1',
  inspectorName: 'Bob Inspector',
  droneId: 'drone-1',
  droneSerialNumber: 'DJI-MATRICE-300',
  droneModel: 'Matrice 300 RTK',
  anchor: '2026-11-01T08:00:00Z',
  timezone: 'Asia/Ho_Chi_Minh',
  unit: 'WEEK' as const,
  interval: 2,
  durationSeconds: 7200,
  reminderDays: 3,
  endsAt: null,
  status: 'ACTIVE' as const,
  totalGeneratedOccurrences: 3,
  totalBlockedOccurrences: 0,
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
};

vi.mock('@/features/inspections/hooks/useRecurringSchedules', () => ({
  useRecurringSchedules: ({ assetId }: { assetId?: string } = {}) => ({
    data: {
      items: assetId === 'asset-1' ? [mockRecurringSchedule] : [],
      totalCount: assetId === 'asset-1' ? 1 : 0,
      page: 1,
      pageSize: 50,
      totalPages: 1,
    },
    isLoading: false,
    error: null,
  }),
  useRecurringSchedule: (id: string) => ({
    data: id === 'sched-101' ? { ...mockRecurringSchedule, occurrences: [] } : null,
    isLoading: false,
    error: null,
  }),
  useCreateRecurringSchedule: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  usePauseRecurringSchedule: () => ({ mutate: vi.fn(), isPending: false }),
  useResumeRecurringSchedule: () => ({ mutate: vi.fn(), isPending: false }),
  useEndRecurringSchedule: () => ({ mutate: vi.fn(), isPending: false }),
  useRetryScheduleOccurrence: () => ({ mutate: vi.fn(), isPending: false }),
  useSkipScheduleOccurrence: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('../hooks/useAssets', () => ({
  useAssets: () => ({
    data: {
      items: [
        {
          id: 'asset-1',
          code: 'BR-01',
          name: 'Main Cable Bridge',
          description: 'Cable bridge across river',
          locationText: 'Km 10, National Highway',
          latitude: null,
          longitude: null,
          status: 'ACTIVE',
          categoryId: 'cat-1',
          createdAt: '2026-10-01T00:00:00Z',
          inspectionItems: ['Mố cầu M1', 'Trụ P1', 'Dầm chính'],
        },
      ],
      page: 1,
      pageSize: 50,
      totalCount: 1,
      totalPages: 1,
    },
    isLoading: false,
    refetch: vi.fn(),
  }),
  useCreateAsset: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  useRetireAsset: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('../hooks/useCatalog', () => ({
  useCategories: () => ({ data: [] }),
}));

vi.mock('../hooks/useAssetDocuments', () => ({
  useAssetDocuments: () => ({ data: [], isLoading: false, error: null }),
  useUploadDocument: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
}));

const mockInspection = {
  id: 'insp-history-1',
  organizationId: 'org-1',
  assetId: 'asset-1',
  inspectorId: 'user-inspector',
  objective: 'Past Annual Visual Check',
  status: 'COMPLETED',
  plannedStartAt: '2026-10-15T08:00:00Z',
  plannedEndAt: '2026-10-15T10:00:00Z',
  createdAt: '2026-10-10T00:00:00Z',
  updatedAt: '2026-10-15T10:00:00Z',
  reportId: 'rep-1',
  reportStatus: 'PUBLISHED',
  reportVersionNo: 1,
  pendingAction: 'NONE',
};

vi.mock('@/features/inspections/hooks/useInspections', () => ({
  useInspections: () => ({
    data: {
      items: [mockInspection],
      totalCount: 1,
      page: 1,
      pageSize: 50,
      totalPages: 1,
    },
    isLoading: false,
    error: null,
  }),
  useInspection: () => ({
    data: null,
    isLoading: false,
  }),
  useCreateInspection: () => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
}));

import { AssetsPage } from './AssetsPage';

describe('AssetsPage recurring schedules integration', () => {
  beforeEach(() => {
    roles.current = ['CUSTOMER'];
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders "Recurring schedule" button on active asset row and opens recurring schedule creation dialog', async () => {
    renderWithClient(<AssetsPage />);

    const recurringBtn = await screen.findByRole('button', { name: /Recurring schedule/i });
    expect(recurringBtn).toBeTruthy();

    fireEvent.click(recurringBtn);

    // Dialog opens with title for New Recurring Schedule and preselected asset
    expect(await screen.findByRole('heading', { name: /New Recurring Schedule/i })).toBeTruthy();
    expect(screen.getByRole('radio', { name: /Recurring schedule/i })).toHaveProperty('checked', true);
  });

  it('displays asset recurring schedules in AssetDetailDrawer and opens schedule details', async () => {
    renderWithClient(<AssetsPage />);

    // Click on row to open drawer
    const row = await screen.findByRole('row', { name: /Main Cable Bridge/i });
    fireEvent.click(row);

    // Drawer opens showing asset details, Inspection Checkpoints, and Recurring Schedules section
    expect(await screen.findByText('Inspection Checkpoints')).toBeTruthy();
    expect(screen.getByText('Mố cầu M1')).toBeTruthy();
    expect(screen.getByText('Trụ P1')).toBeTruthy();
    expect(screen.getByText('Dầm chính')).toBeTruthy();
    expect(await screen.findByText(/Every 2 WEEK/i)).toBeTruthy();
    expect(screen.getByText(/Bob Inspector/)).toBeTruthy();

    // Click on the schedule card to open detail modal
    const scheduleCard = screen.getByText(/Every 2 WEEK/i);
    fireEvent.click(scheduleCard);

    expect(await screen.findByRole('dialog')).toBeTruthy();
    expect(screen.getAllByText(/Main Cable Bridge/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders asset inspection history in AssetDetailDrawer', async () => {
    renderWithClient(<AssetsPage />);

    const assetRow = await screen.findByText('Main Cable Bridge');
    fireEvent.click(assetRow);

    expect(await screen.findByText(/Inspection history/i)).toBeTruthy();
    expect(screen.getByText('Inspection #insp-his')).toBeTruthy();
    expect(screen.getByText('COMPLETED')).toBeTruthy();
  });

  it('allows CUSTOMER to click "Complete & Archive Asset" and open confirmation dialog', async () => {
    renderWithClient(<AssetsPage />);

    const assetRow = await screen.findByText('Main Cable Bridge');
    fireEvent.click(assetRow);

    const retireBtn = await screen.findByRole('button', { name: /Complete & Archive Asset/i });
    expect(retireBtn).toBeTruthy();

    fireEvent.click(retireBtn);

    expect(await screen.findByText(/Complete & Archive Contract/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Confirm Archive/i })).toBeTruthy();
  });
});
