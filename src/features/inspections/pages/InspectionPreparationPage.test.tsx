import { cleanup, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithRouter } from '@/test/renderWithRouter';
import { useAuthStore } from '@/features/auth/store/authStore';

const mocks = vi.hoisted(() => ({
  preparationsQuery: {
    data: [] as unknown[] | undefined,
    isLoading: false,
    isError: false,
    error: null as Error | null,
    refetch: vi.fn(),
  },
}));

vi.mock('../hooks/useInspections', () => ({
  useInspectionPreparations: () => mocks.preparationsQuery,
}));

vi.mock('./InspectionPreparationPanel', () => ({
  default: () => <div data-testid="preparation-panel" />,
}));
vi.mock('./ReadinessReviewPanel', () => ({
  default: () => <div data-testid="readiness-panel" />,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ inspectionId: 'inspection-1' }),
  };
});

import InspectionPreparationPage from './InspectionPreparationPage';

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

describe('InspectionPreparationPage', () => {
  beforeEach(() => {
    cleanup();
    signInAsInspector();
    mocks.preparationsQuery = {
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

  it('mounts the preparation panel with a return link to the inspection', () => {
    renderWithRouter(<InspectionPreparationPage />);

    expect(screen.getByTestId('preparation-panel')).toBeTruthy();
    expect(screen.getByRole('link', { name: /back to inspection/i })).toBeTruthy();
  });
});
