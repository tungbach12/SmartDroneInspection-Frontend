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
    data: { status: 'IN_PROGRESS', findingsConfirmedAt: null as string | null, findingsSnapshotHash: null as string | null },
    isLoading: false,
    isError: false,
    error: null as Error | null,
    refetch: vi.fn(),
  },
  evidenceQuery: { data: [] as unknown[], isLoading: false, isError: false, error: null as Error | null, refetch: vi.fn() },
  findingsQuery: { data: [] as unknown[], isLoading: false, isError: false, error: null as Error | null, refetch: vi.fn() },
}));

vi.mock('../hooks/useInspections', () => ({
  useInspection: () => mocks.inspectionQuery,
  useInspectionWorkflowState: () => mocks.workflowQuery,
  useInspectionEvidence: () => mocks.evidenceQuery,
  useInspectionFindings: () => mocks.findingsQuery,
  useReportVersions: () => mocks.versionsQuery,
  useFieldSessions: () => ({ data: [], isLoading: false, isError: false }),
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
      actorZone: 'CUSTOMER_ORGANIZATION',
      organizationId: 'org-1',
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
    data: { status: 'IN_PROGRESS', findingsConfirmedAt: null, findingsSnapshotHash: null },
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  };
  mocks.evidenceQuery = { data: [], isLoading: false, isError: false, error: null, refetch: vi.fn() };
  mocks.findingsQuery = { data: [], isLoading: false, isError: false, error: null, refetch: vi.fn() };
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

    const back = screen.getByRole('button', { name: /back to inspections/i });
    back.click();
    expect(navigateMock).toHaveBeenCalledWith(-1);
  });

  it('renders a Platform Manager review workspace on admin portal and returns to the review queue', () => {
    signInAs('MANAGER');
    renderInspectionPage({ route: '/admin/inspections/inspection-1/review' });

    expect(screen.getByRole('heading', { name: 'Inspection review' })).toBeTruthy();
    // Reviewer steps are decision phases, presented as route navigation rather than a tab widget.
    expect(screen.getByRole('navigation', { name: 'Inspection workflow stages' })).toBeTruthy();
    const stageNav = screen.getByRole('navigation', { name: 'Inspection workflow stages' });
    expect(stageNav.querySelector('a[aria-label="Report Review: In progress"]')).toBeTruthy();
    expect(stageNav.querySelector('a[aria-label*="Evidence review"]')).toBeNull();
    expect(stageNav.querySelector('a[aria-label*="Findings overview"]')).toBeNull();
    expect(stageNav.querySelector('a[aria-label*="Report draft"]')).toBeNull();

    expect(stageNav.querySelector('a[href*="review"]')).toBeTruthy();
    screen.getByRole('button', { name: 'Back to review queue' }).click();
    expect(navigateMock).toHaveBeenCalledWith('/admin/inspections?view=reports');
  });

  it('renders Customer tracking workspace on client portal and provides customer progress stages', () => {
    signInAs('CUSTOMER');
    renderInspectionPage({ route: '/client/inspections/inspection-1/tracking' });

    expect(screen.getByRole('heading', { name: 'Inspection detail' })).toBeTruthy();
    const stageNav = screen.getByRole('navigation', { name: 'Inspection workflow stages' });
    expect(stageNav.querySelector('a[aria-label="Inspection Progress: In progress"]')).toBeTruthy();
    expect(stageNav.querySelector('a[aria-label*="Inspection Report"]')).toBeTruthy();
    screen.getByRole('button', { name: 'Back to inspections' }).click();
    expect(navigateMock).toHaveBeenCalledWith('/client/inspections');
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
      data: { status: 'FIELD_COMPLETED', findingsConfirmedAt: null, findingsSnapshotHash: null },
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
      data: { status: 'FIELD_COMPLETED', findingsConfirmedAt: '2026-10-27T08:00:00Z', findingsSnapshotHash: 'current-hash' },
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
    expect(navigation.querySelector('a[aria-label*="Inspection Report: Waiting"]')).toBeTruthy();
    expect(navigation.querySelector('a[aria-label*="Flight Operation: In progress"]')).toBeTruthy();
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(navigation.querySelector('a[title="Complete a field session before adding evidence."]')).toBeTruthy();
  });

  it('keeps every workflow stage directly navigable while prerequisites are unmet', () => {
    renderInspectionPage();
    const navigation = screen.getByRole('navigation', { name: 'Inspection workflow stages' });
    expect(navigation.querySelector('a[aria-label*="Field Evidence: Waiting"]')?.getAttribute('href')).toContain('evidence');
    expect(navigation.querySelector('a[aria-label*="Defect Findings: Waiting"]')?.getAttribute('href')).toContain('findings');
    expect(navigation.querySelector('a[aria-label*="Inspection Report: Waiting"]')?.getAttribute('href')).toContain('report');
    expect(navigation.querySelector('a[aria-label*="Flight Operation: In progress"]')?.getAttribute('href')).toContain('field-session');
  });

  it('renders the stage outlet', () => {
    const { container } = renderInspectionPage();

    // The layout owns the header and tabs; each stage renders through the outlet.
    expect(container.querySelector('.workspace-page--inspections')).toBeTruthy();
  });

  it('displays tailored step titles for initial inspection', () => {
    mocks.inspectionQuery = {
      data: { id: 'inspection-1', assetId: 'asset-1', status: 'IN_PROGRESS', inspectionType: 'INITIAL' },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };

    renderInspectionPage();

    const navigation = screen.getByRole('navigation', { name: 'Inspection workflow stages' });
    expect(navigation.querySelector('a[aria-label*="Flight Operation"]')).toBeTruthy();
    expect(navigation.querySelector('a[aria-label*="Field Evidence"]')).toBeTruthy();
    expect(navigation.querySelector('a[aria-label*="Defect Findings"]')).toBeTruthy();
    expect(navigation.querySelector('a[aria-label*="Inspection Report"]')).toBeTruthy();
  });

  it('displays tailored step titles for re-inspection post-repair (3-step workflow)', () => {
    mocks.inspectionQuery = {
      data: { id: 'inspection-1', assetId: 'asset-1', status: 'IN_PROGRESS', inspectionType: 'RE_INSPECTION' },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };

    renderInspectionPage();

    const navigation = screen.getByRole('navigation', { name: 'Inspection workflow stages' });
    expect(navigation.querySelector('a[aria-label*="Re-flight Operation"]')).toBeTruthy();
    expect(navigation.querySelector('a[aria-label*="Defect Verification"]')).toBeTruthy();
    expect(navigation.querySelector('a[aria-label*="Verification Report"]')).toBeTruthy();
    expect(screen.queryByText('Repair Evidence')).toBeNull();
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
});
