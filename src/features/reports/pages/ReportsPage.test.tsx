import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, screen } from '@testing-library/react';
import { renderWithRouter as render } from '@/test/renderWithRouter';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/features/auth/store/authStore';
import type { Role } from '@/features/auth/store/authStore';
import ReportsPage from './ReportsPage';
import { inspectionApi } from '@/features/inspections/api/inspectionApi';

vi.mock('@/features/inspections/api/inspectionApi', () => ({
  inspectionApi: {
    listWithReports: vi.fn(),
    listVersions: vi.fn(),
    listFindings: vi.fn(),
    listEvidence: vi.fn(),
    verifyVersion: vi.fn(),
    submitVersion: vi.fn(),
    reviewVersion: vi.fn(),
    publishVersion: vi.fn(),
  },
}));

const mockedApi = vi.mocked(inspectionApi);

function setRole(roles: Role[]) {
  useAuthStore.setState({
    userId: 'user-1',
    user: {
      id: 'user-1',
      email: 'user@example.test',
      fullName: 'Test User',
      roles,
      actorZone: 'CUSTOMER_ORGANIZATION',
      organizationId: 'org-1',
    },
    roles,
  });
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ReportsPage />
    </QueryClientProvider>,
  );
}

function listedInspection(id = 'inspection-1') {
  return {
    id,
    organizationId: 'org-1',
    assetId: 'asset-1',
    inspectorId: 'inspector-1',
    objective: 'Inspect the main span',
    status: 'REPORT_DRAFT' as const,
    plannedStartAt: null,
    plannedEndAt: null,
    createdAt: '2026-10-01T09:00:00Z',
    updatedAt: '2026-10-01T09:00:00Z',
    reportId: 'report-1',
    reportStatus: 'SUBMITTED' as const,
    reportVersionNo: 1,
  };
}

describe('ReportsPage', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockedApi.listWithReports.mockResolvedValue({
      items: [listedInspection()],
      page: 1,
      pageSize: 10,
      totalCount: 1,
      totalPages: 1,
    });
    setRole(['ORG_ADMIN']);
  });

  it('renders top KPI metric cards and report records table', async () => {
    renderPage();

    expect(screen.getByText('Reports')).toBeTruthy();
    expect(screen.getByText('Total Reports')).toBeTruthy();
    expect(screen.getByText('In Review')).toBeTruthy();
    expect(screen.getByText('Approved')).toBeTruthy();
    expect(screen.getByText('Published')).toBeTruthy();

    expect(await screen.findByText('Inspect the main span')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open' })).toBeTruthy();
  });

  it('displays empty state when no reports exist', async () => {
    mockedApi.listWithReports.mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 10,
      totalCount: 0,
      totalPages: 0,
    });

    renderPage();

    expect(await screen.findByText('No reports to review')).toBeTruthy();
  });
});
