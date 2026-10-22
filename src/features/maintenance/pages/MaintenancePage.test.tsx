import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MaintenancePage from './MaintenancePage';
import { api } from '@/shared/api/client';

describe('MaintenancePage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    queryClient.clear();
  });

  function renderPage() {
    return render(
      <QueryClientProvider client={queryClient}>
        <MaintenancePage />
      </QueryClientProvider>,
    );
  }

  it('renders page header and metric cards', async () => {
    vi.spyOn(api, 'get').mockImplementation((url) => {
      if (url === '/maintenance/repair-candidates') {
        return Promise.resolve({ data: [] } as never);
      }
      if (url === '/maintenance/work-orders') {
        return Promise.resolve({ data: { items: [], page: 0, size: 20, total: 0 } } as never);
      }
      return Promise.resolve({ data: null } as never);
    });

    renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Maintenance' })).toBeDefined();
    expect(screen.getByText('Total Work Orders')).toBeDefined();
    expect(screen.getByText('Pending Repair')).toBeDefined();
    expect(screen.getByText('Resolved & Closed')).toBeDefined();
  });

  it('displays empty state when no work orders exist', async () => {
    vi.spyOn(api, 'get').mockImplementation((url) => {
      if (url === '/maintenance/repair-candidates') {
        return Promise.resolve({ data: [] } as never);
      }
      if (url === '/maintenance/work-orders') {
        return Promise.resolve({ data: { items: [], page: 0, size: 20, total: 0 } } as never);
      }
      return Promise.resolve({ data: null } as never);
    });

    renderPage();

    expect(await screen.findByText('No active work orders')).toBeDefined();
  });

  it('renders work orders table when work orders exist', async () => {
    const mockOrder = {
      id: 'wo-12345678-abcd',
      assetId: 'asset-1',
      sourceReportVersionId: 'ver-1',
      sourceFindingId: 'fnd-1',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      dueAt: null,
      correctiveScope: 'Weld steel bracket',
      acceptanceCriteria: 'Pass load test',
      ownerUserId: 'user-1',
      budgetApproverUserId: 'user-1',
      teamLeadUserId: 'user-2',
      reportAuthorUserId: 'user-3',
      acceptingReviewerUserId: 'user-4',
      createdAt: '2026-10-14T00:00:00Z',
      updatedAt: '2026-10-14T00:00:00Z',
    };

    vi.spyOn(api, 'get').mockImplementation((url) => {
      if (url === '/maintenance/repair-candidates') {
        return Promise.resolve({ data: [] } as never);
      }
      if (url === '/maintenance/work-orders') {
        return Promise.resolve({ data: { items: [mockOrder], page: 0, size: 20, total: 1 } } as never);
      }
      return Promise.resolve({ data: null } as never);
    });

    renderPage();

    expect(await screen.findByText('wo-12345...')).toBeDefined();
    expect(screen.getByText('Weld steel bracket')).toBeDefined();
    expect(screen.getByText('IN_PROGRESS')).toBeDefined();
    expect(screen.getByRole('button', { name: 'View Details' })).toBeDefined();
  });

  it('renders repair candidates when switching to Tab 1', async () => {
    const mockCandidate = {
      assetId: 'asset-1',
      inspectionId: 'insp-1',
      reportId: 'rep-1',
      reportVersionId: 'ver-1',
      findingId: 'fnd-1',
      findingCode: 'FND-001',
      defectLabel: 'Crack on beam',
      description: 'Severe crack',
      severity: 'CRITICAL',
      recommendedAction: 'Replace bracket',
      reportPublishedAt: '2026-10-14T00:00:00Z',
    };

    vi.spyOn(api, 'get').mockImplementation((url) => {
      if (url === '/maintenance/repair-candidates') {
        return Promise.resolve({ data: [mockCandidate] } as never);
      }
      if (url === '/maintenance/work-orders') {
        return Promise.resolve({ data: { items: [], page: 0, size: 20, total: 0 } } as never);
      }
      return Promise.resolve({ data: null } as never);
    });

    renderPage();

    const candidatesTab = await screen.findByRole('tab', { name: /Repair Candidates/ });
    fireEvent.click(candidatesTab);

    expect(await screen.findByText('FND-001')).toBeDefined();
    expect(screen.getByText('Crack on beam')).toBeDefined();
    expect(screen.getByText('CRITICAL')).toBeDefined();
    expect(screen.getByRole('button', { name: /Open Work Order/ })).toBeDefined();
  });

  it('opens CreateWorkOrderDialog when clicking Open Work Order in Tab 1', async () => {
    const mockCandidate = {
      assetId: 'asset-1',
      inspectionId: 'insp-1',
      reportId: 'rep-1',
      reportVersionId: 'ver-1',
      findingId: 'fnd-1',
      findingCode: 'FND-001',
      defectLabel: 'Crack on beam',
      description: 'Severe crack',
      severity: 'CRITICAL',
      recommendedAction: 'Replace bracket',
      reportPublishedAt: '2026-10-14T00:00:00Z',
    };

    vi.spyOn(api, 'get').mockImplementation((url) => {
      if (url === '/maintenance/repair-candidates') {
        return Promise.resolve({ data: [mockCandidate] } as never);
      }
      if (url === '/maintenance/work-orders') {
        return Promise.resolve({ data: { items: [], page: 0, size: 20, total: 0 } } as never);
      }
      return Promise.resolve({ data: null } as never);
    });

    renderPage();

    const candidatesTab = await screen.findByRole('tab', { name: /Repair Candidates/ });
    fireEvent.click(candidatesTab);

    const openButton = await screen.findByRole('button', { name: /Open Work Order/ });
    fireEvent.click(openButton);

    expect(await screen.findByText('Open Maintenance Work Order')).toBeDefined();
  });

  it('opens WorkOrderDetailDialog when clicking View Details', async () => {
    const mockOrder = {
      id: 'wo-12345678-abcd',
      assetId: 'asset-1',
      sourceReportVersionId: 'ver-1',
      sourceFindingId: 'fnd-1',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      dueAt: null,
      correctiveScope: 'Weld steel bracket',
      acceptanceCriteria: 'Pass load test',
      ownerUserId: 'user-1',
      budgetApproverUserId: 'user-1',
      teamLeadUserId: 'user-2',
      reportAuthorUserId: 'user-3',
      acceptingReviewerUserId: 'user-4',
      createdAt: '2026-10-14T00:00:00Z',
      updatedAt: '2026-10-14T00:00:00Z',
    };

    vi.spyOn(api, 'get').mockImplementation((url) => {
      if (url === '/maintenance/repair-candidates') {
        return Promise.resolve({ data: [] } as never);
      }
      if (url === '/maintenance/work-orders') {
        return Promise.resolve({ data: { items: [mockOrder], page: 0, size: 20, total: 1 } } as never);
      }
      return Promise.resolve({ data: [] } as never);
    });

    renderPage();

    const detailsButton = await screen.findByRole('button', { name: 'View Details' });
    fireEvent.click(detailsButton);

    expect(await screen.findByText('Work Order Details')).toBeDefined();
    expect(screen.getByText('Weld steel bracket')).toBeDefined();
  });

  it('opens AssignTeamDialog when clicking Assign Team on a DRAFT order', async () => {
    const mockDraftOrder = {
      id: 'wo-draft-1234-abcd',
      assetId: 'asset-1',
      sourceReportVersionId: 'ver-1',
      sourceFindingId: 'fnd-1',
      status: 'DRAFT',
      priority: 'MEDIUM',
      dueAt: null,
      correctiveScope: 'Initial inspection repair',
      acceptanceCriteria: 'Criteria',
      ownerUserId: 'user-1',
      budgetApproverUserId: 'user-1',
      teamLeadUserId: null,
      reportAuthorUserId: null,
      acceptingReviewerUserId: null,
      createdAt: '2026-10-14T00:00:00Z',
      updatedAt: '2026-10-14T00:00:00Z',
    };

    vi.spyOn(api, 'get').mockImplementation((url) => {
      if (url === '/maintenance/repair-candidates') {
        return Promise.resolve({ data: [] } as never);
      }
      if (url === '/maintenance/work-orders') {
        return Promise.resolve({ data: { items: [mockDraftOrder], page: 0, size: 20, total: 1 } } as never);
      }
      if (url === '/workforce/users') {
        return Promise.resolve({ data: [] } as never);
      }
      return Promise.resolve({ data: [] } as never);
    });

    renderPage();

    const assignButton = await screen.findByRole('button', { name: 'Assign Team' });
    fireEvent.click(assignButton);

    expect(await screen.findByText('Designate Repair Team')).toBeDefined();
  });

  it('opens CreateTaskDialog and RecordWorkLogDialog from details', async () => {
    const mockOrder = {
      id: 'wo-in-progress-1',
      assetId: 'asset-1',
      sourceReportVersionId: 'ver-1',
      sourceFindingId: 'fnd-1',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      dueAt: null,
      correctiveScope: 'Weld steel bracket',
      acceptanceCriteria: 'Pass load test',
      ownerUserId: 'user-1',
      budgetApproverUserId: 'user-1',
      teamLeadUserId: 'user-2',
      reportAuthorUserId: 'user-3',
      acceptingReviewerUserId: 'user-4',
      createdAt: '2026-10-14T00:00:00Z',
      updatedAt: '2026-10-14T00:00:00Z',
    };

    vi.spyOn(api, 'get').mockImplementation((url) => {
      if (url === '/maintenance/repair-candidates') {
        return Promise.resolve({ data: [] } as never);
      }
      if (url === '/maintenance/work-orders') {
        return Promise.resolve({ data: { items: [mockOrder], page: 0, size: 20, total: 1 } } as never);
      }
      if (url.includes('/tasks')) {
        return Promise.resolve({
          data: [{ id: 'task-1', taskNumber: 1, name: 'Prepare surface', status: 'IN_PROGRESS' }],
        } as never);
      }
      if (url.includes('/work-logs')) {
        return Promise.resolve({ data: [] } as never);
      }
      return Promise.resolve({ data: [] } as never);
    });

    renderPage();

    const detailsButton = await screen.findByRole('button', { name: 'View Details' });
    fireEvent.click(detailsButton);

    const addTaskButton = await screen.findByRole('button', { name: 'Add Task' });
    fireEvent.click(addTaskButton);
    expect(await screen.findByText('Add Maintenance Task')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    const recordLogButton = await screen.findByRole('button', { name: 'Record Work Log' });
    fireEvent.click(recordLogButton);
    expect(await screen.findByText('Record Work Log')).toBeDefined();
  });
});
