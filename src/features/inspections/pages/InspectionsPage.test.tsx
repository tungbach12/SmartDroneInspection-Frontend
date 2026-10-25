import { cleanup, fireEvent, screen } from '@testing-library/react';
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
  assignmentInboxQuery: {
    data: [] as unknown[] | undefined,
    isLoading: false,
    isError: false,
    error: null as Error | null,
    refetch: vi.fn(),
  },
  respondToAssignment: {
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null as Error | null,
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
    useAssignmentInbox: () => mocks.assignmentInboxQuery,
    useRespondToAssignment: () => mocks.respondToAssignment,
  };
});

import InspectionsPage from './InspectionsPage';

/** Proves where a row click actually went, since the page navigates rather than expands. */
function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
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
    organizationId: 'org-1',
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
      actorZone: 'CUSTOMER_ORGANIZATION',
      organizationId: 'org-1',
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
    expect(screen.getByText('FIELD_COMPLETED')).toBeTruthy();
    // The retired identifier field is gone; rows replace it.
    expect(screen.queryByLabelText('Inspection ID')).toBeNull();
  });

  it('opens the inspection route when a row is chosen, where the MF3 workflow lives', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('row', { name: /Inspect the main span/ }));

    expect(screen.getByTestId('location')).toHaveProperty(
      'textContent',
      '/operations/inspections/inspection-1',
    );
  });

  it('opens the same route from the row action as from the row body', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Open' }));

    expect(screen.getByTestId('location')).toHaveProperty(
      'textContent',
      '/operations/inspections/inspection-1',
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

  it('tells a maintenance engineer where to look instead', async () => {
    signInAs(['MAINTENANCE_ENGINEER']);

    renderPage();

    expect(
      await screen.findByText(/available to Inspectors, organization manageristrators/),
    ).toBeTruthy();
    expect(screen.queryByRole('row', { name: /Inspect the main span/ })).toBeNull();
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
    signInAs(['ORG_MANAGER']);
    mocks.reportsQuery = {
      data: {
        items: [
          { ...listedInspection(), id: 'submitted-1', objective: 'Review bridge report', reportId: 'report-1', reportStatus: 'SUBMITTED', reportVersionNo: 3, pendingAction: 'REPORT_REVIEW' },
          { ...listedInspection(), id: 'approved-1', objective: 'Publish tower report', reportId: 'report-2', reportStatus: 'APPROVED', reportVersionNo: 2, pendingAction: 'NONE' },
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
    // The queue counts the phases the administrator is actually asked to decide.
    expect(screen.getByRole('group', { name: 'Readiness reviews due on this page: 0' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Report reviews due on this page: 1' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Corrective outcomes due on this page: 1' })).toBeTruthy();
    expect(await screen.findByRole('button', { name: 'Review submission' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Publish report' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Record corrective outcome' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Review submission' }));
    expect(screen.getByTestId('location')).toHaveProperty(
      'textContent',
      '/client/inspections/submitted-1/review',
    );
  });

  it('opens the phase a row is waiting in, rather than a fixed tab', async () => {
    signInAs(['ORG_MANAGER']);
    mocks.reportsQuery = {
      data: {
        items: [
          { ...listedInspection(), id: 'readiness-1', objective: 'Approve readiness', reportId: null, reportStatus: null, reportVersionNo: null, pendingAction: 'READINESS_REVIEW' },
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

    fireEvent.click(await screen.findByRole('button', { name: 'Review readiness' }));
    expect(screen.getByTestId('location')).toHaveProperty(
      'textContent',
      '/client/inspections/readiness-1/preparation',
    );
  });

  it('filters to inspections with a report when the report view is chosen', async () => {
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

    renderPage();
    expect(await screen.findByRole('row', { name: /Inspect the main span/ })).toBeTruthy();
    // The all-view collection is active before the toggle.
    expect(mocks.useInspectionsArgs?.[1]).toBe(true);
    expect(mocks.useReportsArgs?.[1]).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'With report' }));

    // The toggle switches the active query to the server report collection.
    expect(mocks.useReportsArgs?.[1]).toBe(true);
    expect(await screen.findByRole('row', { name: /Inspect the north pier/ })).toBeTruthy();
    expect(screen.queryByRole('row', { name: /Inspect the main span/ })).toBeNull();
  });
});
