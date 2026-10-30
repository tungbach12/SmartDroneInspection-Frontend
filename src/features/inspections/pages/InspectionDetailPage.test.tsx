import { cleanup, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import InspectionDetailPage from './InspectionDetailPage';
import { renderWithRouter as render } from '@/test/renderWithRouter';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useLocation } from 'react-router-dom';

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
}));

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({ inspectionId: 'inspection-1' }),
  };
});

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="route-path">{location.pathname}</div>;
}

function signInAs(role: 'INSPECTOR' | 'CUSTOMER') {
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
    render(<InspectionDetailPage />);

    expect(screen.getByText(/inspection-1/)).toBeTruthy();
  });

  it('offers a way back to the list', () => {
    render(<InspectionDetailPage />);

    const back = screen.getByRole('button', { name: /back to list/i });
    back.click();
    expect(navigateMock).toHaveBeenCalledWith(-1);
  });

  it('renders an Organization Manager review workspace first and returns to the review queue', () => {
    signInAs('CUSTOMER');
    render(<><InspectionDetailPage /><LocationProbe /></>, { route: '/client/inspections/inspection-1' });

    expect(screen.getByRole('heading', { name: 'Inspection review' })).toBeTruthy();
    // The reviewer's tabs are decision phases, not data types: there is no per-evidence or
    // per-finding tab beside the decisions.
    expect(screen.getByRole('tab', { name: 'Report review' })).toBeTruthy();
    expect(screen.queryByRole('tab', { name: 'Evidence review' })).toBeNull();
    expect(screen.queryByRole('tab', { name: 'Findings overview' })).toBeNull();
    expect(screen.queryByRole('tab', { name: 'Report draft' })).toBeNull();

    expect(screen.getByRole('tab', { name: 'Report review' }).getAttribute('href')).toContain('review');
    screen.getByRole('button', { name: 'Back to review queue' }).click();
    expect(navigateMock).toHaveBeenCalledWith('/client/inspections?view=reports');
  });

  it('shows Findings as complete only while its confirmation is current', () => {
    mocks.inspectionQuery = {
      data: { id: 'inspection-1', assetId: 'asset-1', status: 'REPORT_DRAFT' },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    mocks.workflowQuery = {
      data: { status: 'REPORT_DRAFT', findingsConfirmedAt: null, findingsSnapshotHash: null },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };

    const { rerender } = render(<InspectionDetailPage />);
    expect(screen.getByRole('tab', { name: 'Findings' }).textContent).toContain('3');

    mocks.workflowQuery = {
      data: { status: 'REPORT_DRAFT', findingsConfirmedAt: '2026-10-27T08:00:00Z', findingsSnapshotHash: 'current-hash' },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    rerender(<InspectionDetailPage />);
    expect(screen.getByRole('tab', { name: 'Findings' }).querySelector('svg')).not.toBeNull();
  });

  it('renders one tab per workspace stage', () => {
    render(<InspectionDetailPage />);

    expect(screen.getByRole('tab', { name: 'Evidence' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Findings' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Report draft' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Field session' })).toBeTruthy();
    expect(screen.queryByRole('tab', { name: 'Preparation' })).toBeNull();
  });

  it('links each stage to its nested route', () => {
    render(<InspectionDetailPage />);

    expect(screen.getByRole('tab', { name: 'Evidence' }).getAttribute('href')).toContain(
      'evidence',
    );
    expect(screen.getByRole('tab', { name: 'Findings' }).getAttribute('href')).toContain(
      'findings',
    );
    expect(screen.getByRole('tab', { name: 'Report draft' }).getAttribute('href')).toContain(
      'report',
    );
    expect(screen.getByRole('tab', { name: 'Field session' }).getAttribute('href')).toContain(
      'field-session',
    );
  });

  it('renders the stage outlet', () => {
    const { container } = render(<InspectionDetailPage />);

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

    render(<InspectionDetailPage />);

    expect(screen.getByText('Flight Operation')).toBeTruthy();
    expect(screen.getByText('Field Evidence')).toBeTruthy();
    expect(screen.getByText('Defect Findings')).toBeTruthy();
    expect(screen.getByText('Inspection Report')).toBeTruthy();
  });

  it('displays tailored step titles for re-inspection post-repair (3-step workflow)', () => {
    mocks.inspectionQuery = {
      data: { id: 'inspection-1', assetId: 'asset-1', status: 'IN_PROGRESS', inspectionType: 'RE_INSPECTION' },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };

    render(<InspectionDetailPage />);

    expect(screen.getByText('Re-flight Operation')).toBeTruthy();
    expect(screen.queryByText('Repair Evidence')).toBeNull();
    expect(screen.getByText('Defect Verification')).toBeTruthy();
    expect(screen.getByText('Verification Report')).toBeTruthy();
  });
});
