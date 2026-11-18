import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import { renderWithRouter } from '@/test/renderWithRouter';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Role } from '@/features/auth/store/authStore';
import { useAuthStore } from '@/features/auth/store/authStore';

const mocks = vi.hoisted(() => ({
  listQuery: {
    data: undefined as
      | { items: unknown[]; page: number; pageSize: number; totalCount: number; totalPages: number }
      | undefined,
    isLoading: false,
    error: null as Error | null,
    refetch: vi.fn(),
  },
  reportsQuery: {
    data: undefined as
      | { items: unknown[]; page: number; pageSize: number; totalCount: number; totalPages: number }
      | undefined,
    isLoading: false,
    error: null as Error | null,
    refetch: vi.fn(),
  },
  useInspectionsArgs: undefined as unknown[] | undefined,
  useReportsArgs: undefined as unknown[] | undefined,
}));

vi.mock('../hooks/useInspections', async () => {
  const actual = await vi.importActual<typeof import('../hooks/useInspections')>(
    '../hooks/useInspections',
  );
  return {
    ...actual,
    useInspections: (...args: Parameters<typeof actual.useInspections>) => {
      mocks.useInspectionsArgs = args;
      return mocks.listQuery;
    },
    useInspectionsWithReports: (
      ...args: Parameters<typeof actual.useInspectionsWithReports>
    ) => {
      mocks.useReportsArgs = args;
      return mocks.reportsQuery;
    },
    useInspection: () => ({ data: undefined, isLoading: false, isError: false }),
    useFieldSessions: () => ({ data: [], isLoading: false, isError: false }),
    useRescheduleInspection: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
    useCancelInspection: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
    useAcceptInspection: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
    useDeclineInspection: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
    useForceAbortFieldSession: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
    useReassignInspection: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
    useReassignCandidates: () => ({ data: [], isLoading: false, isError: false }),
  };
});

vi.mock('@/features/assets/hooks/useAssets', () => ({
  useAssets: () => ({
    data: { items: [], page: 1, pageSize: 100, totalCount: 0, totalPages: 0 },
    isLoading: false,
    refetch: vi.fn(),
  }),
}));

import InspectionsPage from './InspectionsPage';

/** Proves where a row click actually went, since the page navigates rather than expands. */
function LocationProbe() {
  const location = useLocation();
  return (
    <div>
      <div data-testid="location">{location.pathname}</div>
      <div data-testid="location-state">{JSON.stringify(location.state ?? {})}</div>
    </div>
  );
}

function renderPage(route = '/operations/inspections') {
  return renderWithRouter(
    <>
      <InspectionsPage />
      <LocationProbe />
    </>,
    { route },
  );
}

function listedInspection() {
  return {
    id: 'inspection-1',
    ownerCustomerId: 'org-1',
    assetId: 'asset-1',
    inspectorId: 'inspector-1',
    objective: 'Inspect the main span',
    status: 'FIELD_COMPLETED',
    plannedStartAt: null,
    plannedEndAt: null,
    createdAt: '2026-10-01T09:00:00Z',
    updatedAt: '2026-10-01T09:00:00Z',
    reportId: null,
    reportStatus: null,
    reportVersionNo: null,
    pendingAction: 'NONE',
  };
}

function signInAs(roles: Role[]) {
  useAuthStore.getState().setSession({
    accessToken: 'test-token',
    user: {
      id: 'inspector-1',
      email: 'user@example.test',
      fullName: 'User',
      roles,
    },
  });
}

describe('InspectionsPage', () => {
  beforeEach(() => {
    cleanup();
    signInAs(['INSPECTOR']);
    mocks.listQuery = {
      data: {
        items: [listedInspection()],
        page: 1,
        pageSize: 10,
        totalCount: 1,
        totalPages: 1,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    mocks.reportsQuery = {
      data: { items: [], page: 1, pageSize: 10, totalCount: 0, totalPages: 0 },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    mocks.useInspectionsArgs = undefined;
    mocks.useReportsArgs = undefined;
  });

  afterEach(() => useAuthStore.getState().clearSession());

  it('lists the inspections the backend returns and requires no typed identifier', async () => {
    renderPage();

    expect(await screen.findByRole('row', { name: /Inspect the main span/ })).toBeTruthy();
    expect(screen.getByText('Field Completed')).toBeTruthy();
    // The retired identifier field is gone; rows replace it.
    expect(screen.queryByLabelText('Inspection ID')).toBeNull();
  });

  it('falls back to inspection id label when backend list item omits objective', async () => {
    const { objective: _omitted, ...withoutObjective } = listedInspection();
    mocks.listQuery = {
      data: {
        items: [withoutObjective],
        page: 1,
        pageSize: 10,
        totalCount: 1,
        totalPages: 1,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };

    renderPage();

    expect(await screen.findByRole('row', { name: /Inspection #inspecti/ })).toBeTruthy();
  });

  it('opens an inspection at the current incomplete step when a row is chosen', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('row', { name: /Inspect the main span/ }));

    expect(screen.getByTestId('location')).toHaveProperty(
      'textContent',
      '/operations/inspections/inspection-1/evidence',
    );
  });

  it('opens the workspace from the row action menu', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Inspection actions' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Open workspace' }));

    expect(screen.getByTestId('location')).toHaveProperty(
      'textContent',
      '/operations/inspections/inspection-1/evidence',
    );
  });

  it('routes a Manager dispatch action to the workspace through navigation state', async () => {
    signInAs(['MANAGER']);
    mocks.listQuery = {
      data: {
        items: [{ ...listedInspection(), status: 'SCHEDULED' }],
        page: 1,
        pageSize: 10,
        totalCount: 1,
        totalPages: 1,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };

    renderPage('/manager/inspections');

    fireEvent.click(await screen.findByRole('button', { name: 'Inspection actions' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Reschedule' }));

    expect(screen.getByTestId('location')).toHaveProperty(
      'textContent',
      '/manager/inspections/inspection-1/audit',
    );
    expect(screen.getByTestId('location-state').textContent).toContain('"dispatchAction":"reschedule"');
  });

  it('opens a completed/published inspection at the final step', async () => {
    mocks.listQuery = {
      data: {
        items: [
          {
            ...listedInspection(),
            status: 'COMPLETED',
            reportId: 'report-1',
            reportStatus: 'PUBLISHED',
            reportVersionNo: 1,
          },
        ],
        page: 1,
        pageSize: 10,
        totalCount: 1,
        totalPages: 1,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Inspection actions' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Open workspace' }));

    expect(screen.getByTestId('location')).toHaveProperty(
      'textContent',
      '/operations/inspections/inspection-1/report',
    );
  });

  it('says so plainly when the caller has no inspections in scope', () => {
    mocks.listQuery = {
      data: { items: [], page: 1, pageSize: 10, totalCount: 0, totalPages: 0 },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };

    renderPage();

    expect(screen.getByText('No inspections available')).toBeTruthy();
  });

  it('offers retry when the list cannot be loaded', async () => {
    const refetch = vi.fn();
    mocks.listQuery = { data: undefined, isLoading: false, error: new Error('boom'), refetch };

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it('defaults to the report filter on the ?view=reports queue', async () => {
    mocks.reportsQuery = {
      data: {
        items: [
          {
            ...listedInspection(),
            id: 'inspection-2',
            objective: 'Inspect the north pier',
            reportId: 'report-2',
            reportStatus: 'SUBMITTED',
            reportVersionNo: 1,
          },
        ],
        page: 1,
        pageSize: 10,
        totalCount: 1,
        totalPages: 1,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };

    renderPage('/operations/inspections?view=reports');

    // The queue view reads the server report collection, so only its rows appear.
    expect(await screen.findByRole('row', { name: /Inspect the north pier/ })).toBeTruthy();
    expect(screen.queryByRole('row', { name: /Inspect the main span/ })).toBeNull();
  });

  it('presents an Organization Manager review queue with status-specific next actions', async () => {
    signInAs(['CUSTOMER']);
    mocks.reportsQuery = {
      data: {
        items: [
          { ...listedInspection(), id: 'submitted-1', objective: 'Review bridge report', reportId: 'report-1', reportStatus: 'SUBMITTED', reportVersionNo: 3, pendingAction: 'REPORT_REVIEW' },
          { ...listedInspection(), id: 'returned-1', objective: 'Revise tower report', reportId: 'report-2', reportStatus: 'RETURNED', reportVersionNo: 2, pendingAction: 'NONE' },
          { ...listedInspection(), id: 'published-1', objective: 'Follow up dam report', reportId: 'report-3', reportStatus: 'PUBLISHED', reportVersionNo: 1, pendingAction: 'CORRECTIVE_DISPOSITION' },
        ],
        page: 1,
        pageSize: 10,
        totalCount: 3,
        totalPages: 1,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };

    renderPage('/client/inspections?view=reports');

    expect(await screen.findByRole('heading', { name: 'Report review queue' })).toBeTruthy();
    expect(screen.getByText(/administrator's decision is report-level/i)).toBeTruthy();

    expect(screen.getByRole('group', { name: 'Report reviews due on this page: 1' })).toBeTruthy();
    const submittedRow = await screen.findByRole('row', { name: /Review bridge report/ });
    fireEvent.click(within(submittedRow).getByRole('button', { name: 'Inspection actions' }));
    expect(screen.getByRole('menuitem', { name: 'Review submission' })).toBeTruthy();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Review submission' }));
    expect(screen.getByTestId('location')).toHaveProperty(
      'textContent',
      '/client/inspections/submitted-1/review',
    );
  });

  it('does not expose a corrective outcome action from the report queue', async () => {
    signInAs(['CUSTOMER']);
    mocks.reportsQuery = {
      data: {
        items: [
          { ...listedInspection(), id: 'corr-1', objective: 'Corrective outcome', reportId: 'report-1', reportStatus: 'PUBLISHED', reportVersionNo: 1, pendingAction: 'CORRECTIVE_DISPOSITION' },
        ],
        page: 1,
        pageSize: 10,
        totalCount: 1,
        totalPages: 1,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };

    renderPage('/client/inspections?view=reports');

    expect(screen.queryByRole('button', { name: 'Record corrective outcome' })).toBeNull();
    const reportRow = await screen.findByRole('row', { name: /Corrective outcome/ });
    fireEvent.click(within(reportRow).getByRole('button', { name: 'Inspection actions' }));
    expect(screen.getByRole('menuitem', { name: 'Open report' })).toBeTruthy();
  });

  it('filters to inspections with a report when the report view is active via query param', async () => {
    mocks.reportsQuery = {
      data: {
        items: [
          {
            ...listedInspection(),
            id: 'inspection-2',
            objective: 'Inspect the north pier',
            reportId: 'report-2',
            reportStatus: 'SUBMITTED',
            reportVersionNo: 1,
          },
        ],
        page: 1,
        pageSize: 10,
        totalCount: 1,
        totalPages: 1,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };

    signInAs(['CUSTOMER']);
    renderPage('/client/inspections?view=reports');

    expect(mocks.useReportsArgs?.[1]).toBe(true);
    expect(await screen.findByRole('row', { name: /Inspect the north pier/ })).toBeTruthy();
    expect(screen.queryByRole('row', { name: /Inspect the main span/ })).toBeNull();
  });

  it('does not show view-switch buttons because navigation is driven by direct sidebar destinations', async () => {
    renderPage('/operations/inspections');

    expect(await screen.findByRole('row', { name: /Inspect the main span/ })).toBeTruthy();
    expect(screen.queryByRole('group', { name: 'Inspection list view' })).toBeNull();
  });

  it('opens the schedule calendar directly from its Inspector deep link', async () => {
    renderPage('/operations/inspections?view=calendar');

    expect(await screen.findByRole('button', { name: 'Month' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Week' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Agenda' })).toBeTruthy();
  });

  it('renders dedicated Customer Inspections & Deliverables Ledger on /client/inspections with report, VND fee, and non-hijacked View report navigation', async () => {
    signInAs(['CUSTOMER']);
    mocks.listQuery = {
      data: {
        items: [
          {
            ...listedInspection(),
            id: 'cust-pub-1',
            assetName: 'Ba Son Cable-Stayed Bridge',
            assetCode: 'BR-BASON-01',
            assetLocation: 'District 1, Ho Chi Minh City',
            objective: 'Main Pylon & Stay-Cable Survey',
            status: 'COMPLETED',
            reportId: 'report-pub-1',
            reportStatus: 'PUBLISHED',
            reportVersionNo: 1,
            reportAccepted: false,
            paymentStatus: 'PAYMENT_DUE',
            paymentAmount: 4500000,
            pendingAction: 'CORRECTIVE_DISPOSITION',
          },
        ],
        page: 1,
        pageSize: 10,
        totalCount: 1,
        totalPages: 1,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };

    renderPage('/client/inspections');

    expect((await screen.findAllByText('Ba Son Cable-Stayed Bridge')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('BR-BASON-01').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Report ready · v1/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/4,500,000 ₫/).length).toBeGreaterThan(0);

    // Open 3-dot action menu and click "View report" -> must navigate to /report, never hijacked to /corrective
    fireEvent.click(screen.getAllByRole('button', { name: /Inspection actions/i })[0]!);
    fireEvent.click(await screen.findByRole('menuitem', { name: /View report/i }));
    expect(screen.getByTestId('location')).toHaveProperty(
      'textContent',
      '/client/inspections/cust-pub-1/report',
    );
  });

  it('renders all assignments including accepted and declined history on ?view=assignments with filter tabs', async () => {
    mocks.listQuery = {
      data: {
        items: [
          {
            ...listedInspection(),
            id: 'pending-1',
            assetName: 'Thu Thiem Bridge',
            status: 'SCHEDULED',
            assignmentStatus: 'PENDING_ACCEPTANCE',
            reassignmentRequired: false,
          },
          {
            ...listedInspection(),
            id: 'accepted-1',
            assetName: 'Already Accepted Bridge',
            status: 'COMPLETED',
            assignmentStatus: 'ACCEPTED',
            reassignmentRequired: false,
          },
          {
            ...listedInspection(),
            id: 'declined-1',
            assetName: 'Declined Tower',
            status: 'SCHEDULED',
            assignmentStatus: 'DECLINED',
            reassignmentRequired: true,
          },
        ],
        page: 1,
        pageSize: 100,
        totalCount: 3,
        totalPages: 1,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };

    renderPage('/operations/inspections?view=assignments');

    expect(await screen.findByText('Thu Thiem Bridge')).toBeTruthy();
    expect(screen.getByText('Already Accepted Bridge')).toBeTruthy();
    expect(screen.getByText('Declined Tower')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Accept' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Decline' })).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: 'Pending (1)' }));
    expect(screen.getByText('Thu Thiem Bridge')).toBeTruthy();
    expect(screen.queryByText('Already Accepted Bridge')).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: 'Accepted (1)' }));
    expect(screen.getByText('Already Accepted Bridge')).toBeTruthy();
    expect(screen.queryByText('Thu Thiem Bridge')).toBeNull();
  });

  it('defaults to Pending tab on ?view=pending while keeping old assignment tabs accessible', async () => {
    mocks.listQuery = {
      data: {
        items: [
          {
            ...listedInspection(),
            id: 'pending-1',
            assetName: 'Thu Thiem Bridge',
            status: 'SCHEDULED',
            assignmentStatus: 'PENDING_ACCEPTANCE',
            reassignmentRequired: false,
          },
          {
            ...listedInspection(),
            id: 'accepted-1',
            assetName: 'Already Accepted Bridge',
            status: 'SCHEDULED',
            assignmentStatus: 'ACCEPTED',
            reassignmentRequired: false,
          },
        ],
        page: 1,
        pageSize: 100,
        totalCount: 2,
        totalPages: 1,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };

    renderPage('/operations/inspections?view=pending');

    expect(await screen.findByText('Thu Thiem Bridge')).toBeTruthy();
    expect(screen.queryByText('Already Accepted Bridge')).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: 'All (2)' }));
    expect(screen.getByText('Already Accepted Bridge')).toBeTruthy();
  });

  it('filters to pending flight permit reviews when Platform Manager clicks View pending permits', async () => {
    signInAs(['MANAGER']);
    mocks.listQuery = {
      data: {
        items: [
          {
            ...listedInspection(),
            id: 'permit-due-1',
            assetName: 'Nhat Tan Permit Due',
            status: 'SCHEDULED',
            pendingAction: 'PERMIT_REVIEW',
          },
          {
            ...listedInspection(),
            id: 'other-1',
            assetName: 'Wind Turbine Other',
            status: 'SCHEDULED',
            pendingAction: 'NONE',
          },
        ],
        page: 1,
        pageSize: 10,
        totalCount: 2,
        totalPages: 1,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };

    renderPage('/manager/inspections');

    expect(await screen.findByText(/1 inspection has a flight permit pending manager verification/)).toBeTruthy();
    expect(screen.getByText('Wind Turbine Other')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'View pending permits' }));
    expect(screen.getByText('Nhat Tan Permit Due')).toBeTruthy();
    expect(screen.queryByText('Wind Turbine Other')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Show all' }));
    expect(screen.getByText('Wind Turbine Other')).toBeTruthy();
  });
});
