import { cleanup, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import InspectionDetailPage from './InspectionDetailPage';
import { renderWithRouter as render } from '@/test/renderWithRouter';
import { useAuthStore } from '@/features/auth/store/authStore';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({ inspectionId: 'inspection-1' }),
  };
});

function signInAsInspector() {
  useAuthStore.getState().setSession({
    accessToken: 'test-token',
    user: {
      id: 'inspector-1',
      email: 'inspector@example.test',
      fullName: 'Inspector',
      roles: ['INSPECTOR'],
      actorZone: 'CUSTOMER_ORGANIZATION',
      organizationId: 'org-1',
    },
  });
}

beforeEach(() => {
  navigateMock.mockClear();
  signInAsInspector();
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
