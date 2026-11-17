import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import InspectionDetailPage from './InspectionDetailPage';

const mocks = vi.hoisted(() => ({
  inspectionQuery: {
    data: { id: 'inspection-1', assetId: 'asset-1', status: 'IN_PROGRESS' } as any,
    isLoading: false,
    isError: false,
    error: null as Error | null,
    refetch: vi.fn(),
  },
  versionsQuery: {
    data: [] as { id: string; status: string }[] | undefined,
    isLoading: false,
    isError: false,
    error: null as Error | null,
    refetch: vi.fn(),
  },
  workflowQuery: {
    data: {
      status: 'IN_PROGRESS',
      findingsConfirmedAt: null,
    } as {
      status: string;
      findingsConfirmedAt: string | null;
      flightPermitVerificationStatus?: string | null;
    },
    isLoading: false,
    isError: false,
    error: null as Error | null,
    refetch: vi.fn(),
  },
  evidenceQuery: { data: [] as unknown[], isLoading: false, isError: false, error: null as Error | null, refetch: vi.fn() },
  findingsQuery: { data: [] as unknown[], isLoading: false, isError: false, error: null as Error | null, refetch: vi.fn() },
  sessionsQuery: { data: [] as any[], isLoading: false, isError: false },
}));

vi.mock('../hooks/useInspections', () => ({
  useInspection: () => mocks.inspectionQuery,
  useInspectionWorkflowState: () => mocks.workflowQuery,
  useInspectionEvidence: () => mocks.evidenceQuery,
  useInspectionFindings: () => mocks.findingsQuery,
  useReportVersions: () => mocks.versionsQuery,
  useFieldSessions: () => mocks.sessionsQuery,
  useAcceptInspection: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  useDeclineInspection: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  useRescheduleInspection: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  useCancelInspection: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  useForceAbortFieldSession: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  useReassignInspection: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  useReassignCandidates: () => ({ data: [], isLoading: false, isError: false, error: null }),
}));

vi.mock('@/features/admin/api/inspectorProfileApi', () => ({
  inspectorProfileApi: {
    get: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('@/features/admin/api/platformUserApi', () => ({
  platformUserApi: {
    list: vi.fn().mockResolvedValue([
      {
        id: 'cust-12345678',
        fullName: 'Saigon Bridge Corp',
        email: 'ops@saigonbridge.vn',
        roles: ['CUSTOMER'],
      },
      {
        id: 'insp-12345678',
        fullName: 'Tran Van Inspector',
        email: 'inspector@smartdrone.vn',
        roles: ['INSPECTOR'],
      },
    ]),
  },
}));

const navigateMock = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => {
      const navigate = actual.useNavigate();
      return (...args: Parameters<typeof navigate>) => {
        navigateMock(...args);
        return navigate(...args);
      };
    },
    useParams: () => ({ inspectionId: 'inspection-1' }),
  };
});

function InspectionStageTestOutlet() {
  const { onReportDirtyChange } = useOutletContext<{
    onReportDirtyChange: (dirty: boolean) => void;
  }>();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <>
      <output data-testid="current-path">{location.pathname}</output>
      <button onClick={() => onReportDirtyChange(true)}>Mark report dirty</button>
      <button onClick={() => navigate('/operations/inspections/inspection-1/evidence')}>
        Navigate to evidence
      </button>
      <button onClick={() => navigate(-1)}>Browser back</button>
    </>
  );
}

function renderInspectionPage({ route = '/operations/inspections/inspection-1/field-session', initialEntries }: {
  route?: string;
  initialEntries?: string[];
} = {}) {
  const router = createMemoryRouter(
    [
      {
        path: '/:portal/inspections/:inspectionId',
        element: <InspectionDetailPage />,
        children: [
          { index: true, element: <InspectionStageTestOutlet /> },
          { path: '*', element: <InspectionStageTestOutlet /> },
        ],
      },
    ],
    { initialEntries: initialEntries ?? [route] },
  );
  return { ...render(<RouterProvider router={router} />), router };
}

function signInAs(role: 'INSPECTOR' | 'CUSTOMER' | 'MANAGER' | 'ADMIN') {
  useAuthStore.getState().setSession({
    accessToken: 'test-token',
    user: {
      id: role === 'CUSTOMER' ? 'org-admin-1' : 'inspector-1',
      email: 'user@example.test',
      fullName: role === 'CUSTOMER' ? 'Organization Manager' : 'Inspector',
      roles: [role],
    },
  });
}

beforeEach(() => {
  navigateMock.mockClear();
  signInAs('INSPECTOR');
  mocks.versionsQuery = {
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  };
  mocks.workflowQuery = {
    data: { status: 'IN_PROGRESS', findingsConfirmedAt: null },
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  };
  mocks.evidenceQuery = { data: [], isLoading: false, isError: false, error: null, refetch: vi.fn() };
  mocks.findingsQuery = { data: [], isLoading: false, isError: false, error: null, refetch: vi.fn() };
  mocks.sessionsQuery = { data: [], isLoading: false, isError: false };
});

afterEach(() => {
  cleanup();
  useAuthStore.getState().clearSession();
});

describe('InspectionDetailPage', () => {
  it('names the inspection it is showing', () => {
    renderInspectionPage();

    expect(screen.getAllByText(/inspection-1/).length).toBeGreaterThan(0);
  });

  it('offers a way back to the list', () => {
    renderInspectionPage();

    const back = screen.getByRole('link', { name: /inspections/i });
    expect(back.getAttribute('href')).toBe('/operations/inspections');
  });

  it('preserves Waiting status on a blocked step when navigated to directly', () => {
    renderInspectionPage({ route: '/operations/inspections/inspection-1/evidence' });

    const navigation = screen.getByRole('navigation', { name: 'Inspection workflow stages' });
    expect(navigation.querySelector('a[aria-label*="Field Evidence: Waiting"]')).toBeTruthy();
  });

  it('renders a Platform Manager review workspace on manager portal with 3 review stages and returns to the review queue', () => {
    signInAs('MANAGER');
    renderInspectionPage({ route: '/manager/inspections/inspection-1/review' });

    expect(screen.getByRole('heading', { name: 'Inspection review' })).toBeTruthy();
    const managerNav = screen.getByRole('navigation', { name: 'Inspection workflow stages' });
    expect(managerNav.querySelector('a[aria-label*="Field & Evidence Audit"]')).toBeTruthy();
    expect(managerNav.querySelector('a[aria-label*="Report Decision"]')).toBeTruthy();
    expect(managerNav.querySelector('a[aria-label*="Commission & Settlement"]')).toBeTruthy();
    const backToQueue = screen.getByRole('link', { name: 'Inspections' });
    expect(backToQueue.getAttribute('href')).toBe('/manager/inspections');
  });

  it('shows only asset, drone, customer, and inspector names in collapsed header and expands full overview on click', async () => {
    mocks.inspectionQuery = {
      data: {
        id: 'inspection-1',
        assetId: 'asset-1',
        assetName: 'Cau Nhat Tan',
        droneModel: 'DJI Matrice 350 RTK',
        droneSerialNumber: '1581F4B0C2301009',
        ownerCustomerId: 'cust-12345678',
        inspectorId: 'insp-12345678',
        inspectorName: 'Tran Van Inspector',
        plannedStartAt: '2026-11-15T13:14:00Z',
        status: 'FIELD_COMPLETED',
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    mocks.versionsQuery = {
      data: [
        {
          id: 'v-1',
          status: 'SUBMITTED',
          reportContext: { organizationName: 'Saigon Bridge Corp' },
        } as any,
      ],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };

    signInAs('MANAGER');
    renderInspectionPage({ route: '/manager/inspections/inspection-1/audit' });

    expect(screen.getByText('DJI Matrice 350 RTK')).toBeTruthy();
    expect(screen.getByText(/^Customer$/i)).toBeTruthy();
    expect(await screen.findByText('Saigon Bridge Corp')).toBeTruthy();
    expect(screen.getByText(/^Inspector$/i)).toBeTruthy();
    expect(screen.getByText('Tran Van Inspector')).toBeTruthy();
    expect(screen.queryByText(/^Manager$/i)).toBeNull();
    expect(screen.queryByText(/ops@saigonbridge\.vn/)).toBeNull();
    expect(screen.queryByText(/inspector@smartdrone\.vn/)).toBeNull();
    expect(screen.queryByText(/Planned Start/i)).toBeNull();
    expect(screen.queryByText('Field Completed')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Overview' }));

    expect(await screen.findByText(/ops@saigonbridge\.vn/)).toBeTruthy();
    expect(screen.getByText(/inspector@smartdrone\.vn/)).toBeTruthy();
    expect(screen.getByText(/Planned Start/i)).toBeTruthy();
    expect(screen.getByText(/Confirmed findings/i)).toBeTruthy();
    expect(screen.queryByText('Field Completed')).toBeNull();
  });

  it('shows Asset, Drone, Customer, Manager and Schedule cleanly for INSPECTOR and hides self Inspector name', () => {
    mocks.inspectionQuery = {
      data: {
        id: 'inspection-1',
        assetId: 'asset-1',
        assetName: 'Cau Nhat Tan',
        droneModel: 'DJI Matrice 350 RTK',
        droneSerialNumber: '1581F4B0C2301009',
        ownerCustomerId: 'cust-12345678',
        ownerCustomerName: 'Saigon Bridge Corp',
        inspectorId: 'insp-12345678',
        inspectorName: 'Tran Van Inspector',
        managerName: 'Platform Manager 2',
        plannedStartAt: '2026-11-15T13:14:00Z',
        status: 'IN_PROGRESS',
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };

    signInAs('INSPECTOR');
    renderInspectionPage({ route: '/operations/inspections/inspection-1/field-session' });

    expect(screen.getByText('DJI Matrice 350 RTK')).toBeTruthy();
    expect(screen.getByText('Saigon Bridge Corp')).toBeTruthy();
    expect(screen.getByText('Platform Manager 2')).toBeTruthy();
    expect(screen.getByText(/^Schedule$/i)).toBeTruthy();
    expect(screen.queryByText('Tran Van Inspector')).toBeNull();
    expect(screen.queryByText(/Confirmed findings/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Overview' }));
    expect(screen.getByText(/Confirmed findings/i)).toBeTruthy();
    expect(screen.getByText(/1581F4B0C2301009/)).toBeTruthy();
  });

  it('shows Asset, Manager, Inspector and Schedule cleanly for CUSTOMER and hides technical Drone outside', () => {
    mocks.inspectionQuery = {
      data: {
        id: 'inspection-1',
        assetId: 'asset-1',
        assetName: 'Cau Nhat Tan',
        droneModel: 'DJI Matrice 350 RTK [MTOW: 9.2 kg]',
        droneSerialNumber: '1581F4B0C2301009',
        ownerCustomerId: 'cust-12345678',
        ownerCustomerName: 'Saigon Bridge Corp',
        inspectorId: 'insp-12345678',
        inspectorName: 'Tran Van Inspector',
        managerName: 'Platform Manager 2',
        plannedStartAt: '2026-11-15T13:14:00Z',
        status: 'COMPLETED',
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };

    signInAs('CUSTOMER');
    renderInspectionPage({ route: '/client/inspections/inspection-1/tracking' });

    expect(screen.getByText('Platform Manager 2')).toBeTruthy();
    expect(screen.getByText('Tran Van Inspector')).toBeTruthy();
    expect(screen.getByText(/^Schedule$/i)).toBeTruthy();
    expect(screen.queryByText('Saigon Bridge Corp')).toBeNull();
    expect(screen.queryByText(/DJI Matrice 350 RTK/)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Overview' }));
    expect(screen.getByText('DJI Matrice 350 RTK [MTOW: 9.2 kg]')).toBeTruthy();
    expect(screen.queryByText(/Confirmed findings/i)).toBeNull();
  });

  it('keeps workflow stages focused on inspection and reporting', () => {
    mocks.inspectionQuery = {
      data: {
        id: 'inspection-1',
        assetId: 'asset-1',
        status: 'COMPLETED',
        flightPermitFileName: 'sitl-test-flight-permit.pdf',
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    mocks.versionsQuery = {
      data: [{ id: 'v-1', status: 'PUBLISHED' }],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    mocks.findingsQuery = {
      data: [{ id: 'f-1', status: 'CONFIRMED', isDeleted: false }],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };

    signInAs('MANAGER');
    const { unmount } = renderInspectionPage({ route: '/manager/inspections/inspection-1/review' });
    const managerNav = screen.getByRole('navigation', { name: 'Inspection workflow stages' });
    expect(managerNav.querySelector('a[aria-label*="Corrective Action"]')).toBeNull();
    expect(screen.queryByRole('button', { name: 'View permit' })).toBeNull();
    unmount();

    signInAs('CUSTOMER');
    const { unmount: unmountCustomer } = renderInspectionPage({
      route: '/client/inspections/inspection-1/report',
    });
    const customerNav = screen.getByRole('navigation', { name: 'Inspection workflow stages' });
    expect(customerNav.querySelector('a[aria-label="Inspection Report: Complete"]')).toBeTruthy();
    expect(customerNav.querySelector('a[aria-label="Acceptance & Payment: Complete"]')).toBeTruthy();
    expect(customerNav.querySelector('a[aria-label*="Corrective Action"]')).toBeNull();
    unmountCustomer();


  });

  it('renders Customer tracking workspace on client portal and provides customer progress stages', () => {
    signInAs('CUSTOMER');
    renderInspectionPage({ route: '/client/inspections/inspection-1/tracking' });

    expect(screen.getByRole('heading', { name: 'Inspection workspace' })).toBeTruthy();
    const stageNav = screen.getByRole('navigation', { name: 'Inspection workflow stages' });
    expect(stageNav.querySelector('a[aria-label="Inspection Progress: In progress"]')).toBeTruthy();
    expect(stageNav.querySelector('a[aria-label*="Inspection Report"]')).toBeTruthy();
    expect(stageNav.querySelector('a[aria-label*="Acceptance & Payment"]')).toBeTruthy();
    expect(screen.getByRole('link', { name: /inspections/i }).getAttribute('href')).toBe(
      '/client/inspections',
    );
  });

  it('shows Findings as complete only while its confirmation is current', () => {
    mocks.inspectionQuery = {
      data: { id: 'inspection-1', assetId: 'asset-1', status: 'FIELD_COMPLETED' },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    mocks.workflowQuery = {
      data: { status: 'FIELD_COMPLETED', findingsConfirmedAt: null },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };

    const { rerender } = renderInspectionPage();
    const stageNav = screen.getByRole('navigation', { name: 'Inspection workflow stages' });
    expect(stageNav.querySelector('a[aria-label="Defect Findings: Ready"]')).toBeTruthy();

    mocks.evidenceQuery = {
      data: [{ id: 'evidence-1', isDeleted: false }],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    mocks.workflowQuery = {
      data: { status: 'FIELD_COMPLETED', findingsConfirmedAt: '2026-10-27T08:00:00Z' },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    rerender(<RouterProvider router={createMemoryRouter([
      {
        path: '/:portal/inspections/:inspectionId',
        element: <InspectionDetailPage />,
        children: [{ index: true, element: <InspectionStageTestOutlet /> }, { path: '*', element: <InspectionStageTestOutlet /> }],
      },
    ], { initialEntries: ['/operations/inspections/inspection-1/field-session'] })} />);
    expect(stageNav.querySelector('a[aria-label="Defect Findings: Complete"] svg')).not.toBeNull();
  });

  it('renders each workspace stage as direct navigation with a readiness state', () => {
    renderInspectionPage();

    const navigation = screen.getByRole('navigation', { name: 'Inspection workflow stages' });
    expect(navigation).toBeTruthy();
    expect(navigation.querySelector('a[aria-label*="Field Evidence: Waiting"]')).toBeTruthy();
    expect(navigation.querySelector('a[aria-label*="Defect Findings: Waiting"]')).toBeTruthy();
    expect(navigation.querySelector('a[aria-label*="Review & Submit: Waiting"]')).toBeTruthy();
    expect(navigation.querySelector('a[aria-label*="Flight Operation: In progress"]')).toBeTruthy();
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(navigation.querySelector('a[title="Complete the field session first."]')).toBeTruthy();
  });

  it('keeps every workflow stage directly navigable while prerequisites are unmet', () => {
    renderInspectionPage();
    const navigation = screen.getByRole('navigation', { name: 'Inspection workflow stages' });
    expect(navigation.querySelector('a[aria-label*="Field Evidence: Waiting"]')?.getAttribute('href')).toContain('evidence');
    expect(navigation.querySelector('a[aria-label*="Defect Findings: Waiting"]')?.getAttribute('href')).toContain('findings');
    expect(navigation.querySelector('a[aria-label*="Review & Submit: Waiting"]')?.getAttribute('href')).toContain('report');
    expect(navigation.querySelector('a[aria-label*="Flight Operation: In progress"]')?.getAttribute('href')).toContain('field-session');
  });

  it('renders the stage outlet', () => {
    const { container } = renderInspectionPage();

    // The layout owns the header and tabs; each stage renders through the outlet.
    expect(container.querySelector('.workspace-page--inspections')).toBeTruthy();
  });

  it('displays tailored step titles for initial inspection', () => {
    mocks.inspectionQuery = {
      data: { id: 'inspection-1', assetId: 'asset-1', status: 'IN_PROGRESS' },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };

    renderInspectionPage();

    const navigation = screen.getByRole('navigation', { name: 'Inspection workflow stages' });
    expect(navigation.querySelector('a[aria-label*="Flight Permit"]')).toBeTruthy();
    expect(navigation.querySelector('a[aria-label*="Pre-flight Check"]')).toBeTruthy();
    expect(navigation.querySelector('a[aria-label*="Flight Operation"]')).toBeTruthy();
    expect(navigation.querySelector('a[aria-label*="Post-flight & Items"]')).toBeTruthy();
    expect(navigation.querySelector('a[aria-label*="Field Evidence"]')).toBeTruthy();
    expect(navigation.querySelector('a[aria-label*="Defect Findings"]')).toBeTruthy();
    expect(navigation.querySelector('a[aria-label*="Review & Submit"]')).toBeTruthy();
  });

  it('blocks leaving when report edits are dirty, allowing cancel to stay', async () => {
    renderInspectionPage();

    fireEvent.click(screen.getByRole('button', { name: 'Mark report dirty' }));
    fireEvent.click(screen.getByRole('button', { name: 'Navigate to evidence' }));

    expect(screen.getByRole('dialog', { name: 'Unsaved report changes' })).toBeTruthy();
    expect(screen.getByTestId('current-path').textContent).toBe(
      '/operations/inspections/inspection-1/field-session',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Stay here' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Unsaved report changes' })).toBeNull();
    });
    expect(screen.getByTestId('current-path').textContent).toBe(
      '/operations/inspections/inspection-1/field-session',
    );
  });

  it('allows discarding report edits to proceed to another stage', async () => {
    renderInspectionPage();

    fireEvent.click(screen.getByRole('button', { name: 'Mark report dirty' }));
    fireEvent.click(screen.getByRole('button', { name: 'Navigate to evidence' }));

    expect(screen.getByRole('dialog', { name: 'Unsaved report changes' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Discard edits' }));
    await waitFor(() => {
      expect(screen.getByTestId('current-path').textContent).toBe(
        '/operations/inspections/inspection-1/evidence',
      );
    });
  });

  it('locks execution stages until INSPECTOR accepts a PENDING_ACCEPTANCE mission', () => {
    mocks.inspectionQuery = {
      data: {
        id: 'inspection-1',
        assetId: 'asset-1',
        status: 'SCHEDULED',
        assignmentStatus: 'PENDING_ACCEPTANCE',
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    mocks.workflowQuery = {
      data: { status: 'SCHEDULED', findingsConfirmedAt: null },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };

    renderInspectionPage({ route: '/operations/inspections/inspection-1/permit' });

    expect(screen.getByText('Assignment pending confirmation')).toBeTruthy();
    expect(screen.getByText('Accept assignment to begin')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Accept mission' }).length).toBeGreaterThan(0);
    expect(screen.queryByTestId('current-path')).toBeNull();
  });

  it('offers Manager recovery buttons directly in the aborted alert and in the workspace menu', async () => {
    signInAs('MANAGER');
    const futureStart = new Date(Date.now() + 3600_000).toISOString();
    const futureEnd = new Date(Date.now() + 7200_000).toISOString();
    mocks.inspectionQuery = {
      data: {
        id: 'inspection-1',
        assetId: 'asset-1',
        assetName: 'Cau Nhat Tan',
        status: 'SCHEDULED',
        plannedStartAt: futureStart,
        plannedEndAt: futureEnd,
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    mocks.workflowQuery = {
      data: { status: 'SCHEDULED', findingsConfirmedAt: null },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    mocks.sessionsQuery = {
      data: [
        {
          id: 'session-1',
          status: 'ABORTED',
          endedAt: '2026-11-14T10:00:00Z',
          abortReason: 'Sudden adverse weather / high wind',
        },
      ],
      isLoading: false,
      isError: false,
    };

    renderInspectionPage({ route: '/manager/inspections/inspection-1/audit' });

    expect(screen.getByText('Previous flight session was aborted')).toBeTruthy();
    const rescheduleBtn = screen.getByRole('button', { name: 'Reschedule' });
    expect(screen.getByRole('button', { name: 'Reassign Inspector & Drone' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancel inspection' })).toBeTruthy();

    fireEvent.click(rescheduleBtn);
    expect(screen.getByRole('dialog', { name: 'Reschedule flight window' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Reschedule flight window' })).toBeNull();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Inspection actions' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Reschedule' }));
    expect(screen.getByRole('dialog', { name: 'Reschedule flight window' })).toBeTruthy();
  });

  it('offers Manager recovery buttons in declined and overdue alerts while keeping Admin read-only', () => {
    signInAs('MANAGER');
    mocks.inspectionQuery = {
      data: {
        id: 'inspection-1',
        assetId: 'asset-1',
        status: 'SCHEDULED',
        reassignmentRequired: true,
        assignmentStatus: 'DECLINED',
        declineReason: 'Equipment unavailable',
        overdueNotifiedAt: '2026-11-14T10:00:00Z',
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    mocks.workflowQuery = {
      data: { status: 'SCHEDULED', findingsConfirmedAt: null },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };

    renderInspectionPage({ route: '/manager/inspections/inspection-1/audit' });

    expect(screen.getByText('Reassignment required — assigned inspector declined')).toBeTruthy();
    expect(screen.getByText('Scheduled window passed without starting')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Reschedule' }).length).toBe(2);
    expect(screen.getAllByRole('button', { name: 'Reassign Inspector & Drone' }).length).toBe(2);
    expect(screen.getAllByRole('button', { name: 'Cancel inspection' }).length).toBe(2);

    cleanup();
    signInAs('ADMIN');
    renderInspectionPage({ route: '/admin/inspections/inspection-1/audit' });

    expect(screen.getByText('Scheduled window passed without starting')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Reschedule' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reassign Inspector & Drone' })).toBeNull();
  });

  it('guides INSPECTOR from an aborted session alert to pre-flight or permit upload when window is open', async () => {
    signInAs('INSPECTOR');
    mocks.inspectionQuery = {
      data: {
        id: 'inspection-1',
        assetId: 'asset-1',
        status: 'SCHEDULED',
        assignmentStatus: 'ACCEPTED',
        flightPermitFileName: 'permit.pdf',
        plannedStartAt: new Date(Date.now() - 1800_000).toISOString(),
        plannedEndAt: new Date(Date.now() + 3600_000).toISOString(),
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    mocks.workflowQuery = {
      data: { status: 'SCHEDULED', findingsConfirmedAt: null },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    mocks.sessionsQuery = {
      data: [
        {
          id: 'session-1',
          status: 'ABORTED',
          endedAt: '2026-11-14T10:00:00Z',
          abortReason: 'UAV battery or hardware warning',
        },
      ],
      isLoading: false,
      isError: false,
    };

    renderInspectionPage({ route: '/operations/inspections/inspection-1/field-session' });

    expect(screen.getByText('Previous flight session was aborted')).toBeTruthy();
    expect(screen.queryByText(/Please reschedule the flight window/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Go to Pre-flight Check' }));
    await waitFor(() => {
      expect(screen.getByTestId('current-path').textContent).toBe(
        '/operations/inspections/inspection-1/pre-flight',
      );
    });

    cleanup();
    renderInspectionPage({ route: '/operations/inspections/inspection-1/pre-flight' });
    expect(screen.getByRole('button', { name: 'Complete Pre-flight Checklist' })).toBeTruthy();

    cleanup();
    mocks.inspectionQuery.data = {
      ...mocks.inspectionQuery.data,
      flightPermitFileName: null,
    };
    renderInspectionPage({ route: '/operations/inspections/inspection-1/field-session' });
    fireEvent.click(screen.getByRole('button', { name: 'Upload Flight Permit' }));
    await waitFor(() => {
      expect(screen.getByTestId('current-path').textContent).toBe(
        '/operations/inspections/inspection-1/permit',
      );
    });
    expect(screen.getByRole('button', { name: 'Upload Flight Permit' })).toBeTruthy();
  });

  it('tells INSPECTOR and CUSTOMER accurately when an aborted session cannot restart or dispatch', () => {
    signInAs('INSPECTOR');
    mocks.inspectionQuery = {
      data: {
        id: 'inspection-1',
        assetId: 'asset-1',
        status: 'SCHEDULED',
        assignmentStatus: 'ACCEPTED',
        flightPermitFileName: 'permit.pdf',
        plannedStartAt: new Date(Date.now() - 7200_000).toISOString(),
        plannedEndAt: new Date(Date.now() - 3600_000).toISOString(),
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    mocks.workflowQuery = {
      data: { status: 'SCHEDULED', findingsConfirmedAt: null },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    mocks.sessionsQuery = {
      data: [
        {
          id: 'session-1',
          status: 'ABORTED',
          endedAt: '2026-11-14T10:00:00Z',
          abortReason: 'UAV battery or hardware warning',
        },
      ],
      isLoading: false,
      isError: false,
    };

    renderInspectionPage({ route: '/operations/inspections/inspection-1/field-session' });

    expect(
      screen.getByText(/The scheduled flight window has elapsed\. Contact the Platform Manager to reschedule/i),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Go to Pre-flight Check' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reschedule' })).toBeNull();

    cleanup();
    signInAs('CUSTOMER');
    renderInspectionPage({ route: '/client/inspections/inspection-1/tracking' });

    expect(screen.getByText('Previous flight session was aborted')).toBeTruthy();
    expect(
      screen.getByText(/The Platform Manager will reschedule or reassign this inspection as needed/i),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Reschedule' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Go to Pre-flight Check' })).toBeNull();
  });

  it('keeps pre-flight locked while uploaded flight permit is PENDING_REVIEW or REJECTED', async () => {
    signInAs('INSPECTOR');
    mocks.inspectionQuery = {
      data: {
        id: 'inspection-1',
        assetId: 'asset-1',
        status: 'SCHEDULED',
        assignmentStatus: 'ACCEPTED',
        flightPermitFileName: 'permit.pdf',
        flightPermitVerificationStatus: 'PENDING_REVIEW',
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    mocks.workflowQuery = {
      data: {
        status: 'SCHEDULED',
        findingsConfirmedAt: null,
        flightPermitVerificationStatus: 'PENDING_REVIEW',
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };

    renderInspectionPage({ route: '/operations/inspections/inspection-1/pre-flight' });
    const navigationPending = screen.getByRole('navigation', { name: 'Inspection workflow stages' });
    expect(
      navigationPending.querySelector(
        'a[aria-label*="Pre-flight Check: Waiting. Flight permit is pending Platform Manager verification"]',
      ),
    ).toBeTruthy();

    cleanup();
    mocks.inspectionQuery.data = {
      ...mocks.inspectionQuery.data,
      flightPermitVerificationStatus: 'REJECTED',
    };
    mocks.workflowQuery.data = {
      status: 'SCHEDULED',
      findingsConfirmedAt: null,
      flightPermitVerificationStatus: 'REJECTED',
    };

    renderInspectionPage({ route: '/operations/inspections/inspection-1/pre-flight' });
    const navigationRejected = screen.getByRole('navigation', { name: 'Inspection workflow stages' });
    expect(
      navigationRejected.querySelector(
        'a[aria-label*="Pre-flight Check: Waiting. Flight permit was rejected by the Platform Manager"]',
      ),
    ).toBeTruthy();
  });
});
