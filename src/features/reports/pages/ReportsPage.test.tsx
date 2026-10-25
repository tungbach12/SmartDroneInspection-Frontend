import { cleanup } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderWithRouter as render } from '@/test/renderWithRouter';
import { useAuthStore } from '@/features/auth/store/authStore';
import type { Role } from '@/features/auth/store/authStore';
import ReportsPage from './ReportsPage';

function setRole(roles: Role[]) {
  useAuthStore.setState({
    user: {
      id: 'admin-1',
      email: 'admin@example.test',
      fullName: 'Reviewer',
      roles,
      actorZone: 'CUSTOMER_ORGANIZATION',
      organizationId: 'org-1',
    },
    userId: 'admin-1',
    userName: 'Reviewer',
    email: 'admin@example.test',
    roles,
    accessToken: 'test-token',
  });
}

/** Proves where the redirect actually went, since the page navigates rather than renders. */
function LocationProbe() {
  const location = useLocation();
  return (
    <div data-testid="location">
      {location.pathname}
      {location.search}
    </div>
  );
}

describe('ReportsPage', () => {
  beforeEach(() => {
    cleanup();
    setRole(['ORG_MANAGER']);
  });

  afterEach(() => {
    cleanup();
    useAuthStore.getState().clearSession();
  });

  it('redirects to the inspections list with the report filter', () => {
    render(
      <>
        <ReportsPage />
        <LocationProbe />
      </>,
      { route: '/operations/reports' },
    );

    // The report queue is the owning portal's inspections list with ?view=reports, so saved
    // /reports links survive as that filtered view.
    expect(document.querySelector('[data-testid="location"]')?.textContent).toBe(
      '/operations/inspections?view=reports',
    );
  });
});
