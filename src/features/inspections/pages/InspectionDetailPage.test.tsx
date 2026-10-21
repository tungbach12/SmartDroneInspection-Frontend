import { cleanup, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import InspectionDetailPage from './InspectionDetailPage';
import { renderWithRouter as render } from '@/test/renderWithRouter';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useLocation } from 'react-router-dom';

const mocks = vi.hoisted(() => ({
  preparationsQuery: {
    data: [] as { id: string }[] | undefined,
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
}));

vi.mock('../hooks/useInspections', () => ({
  useInspectionPreparations: () => mocks.preparationsQuery,
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

function signInAs(role: 'INSPECTOR' | 'ORG_ADMIN') {
  useAuthStore.getState().setSession({
    accessToken: 'test-token',
    user: {
      id: role === 'ORG_ADMIN' ? 'org-admin-1' : 'inspector-1',
      email: 'user@example.test',
      fullName: role === 'ORG_ADMIN' ? 'Organization Admin' : 'Inspector',
      roles: [role],
      actorZone: 'CUSTOMER_ORGANIZATION',
      organizationId: 'org-1',
    },
  });
}

beforeEach(() => {
  navigateMock.mockClear();
  signInAs('INSPECTOR');
  mocks.preparationsQuery = {
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  };
  mocks.versionsQuery = {
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  };
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

  it('renders an Organization Admin review workspace first and returns to the review queue', () => {
    signInAs('ORG_ADMIN');
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

  it('renders one tab per workspace stage', () => {
    render(<InspectionDetailPage />);

    expect(screen.getByRole('tab', { name: 'Evidence' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Findings' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Report draft' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Preparation' })).toBeTruthy();
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
    expect(screen.getByRole('tab', { name: 'Preparation' }).getAttribute('href')).toContain(
      'preparation',
    );
  });

  it('renders the stage outlet', () => {
    const { container } = render(<InspectionDetailPage />);

    // The layout owns the header and tabs; each stage renders through the outlet.
    expect(container.querySelector('.workspace-page--inspections')).toBeTruthy();
  });
});
