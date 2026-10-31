import { ThemeProvider } from '@mui/material/styles';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { theme } from '@/app/theme/theme';
import { useAuthStore } from '../store/authStore';
import OAuthCallbackPage from './OAuthCallbackPage';

const authMocks = vi.hoisted(() => ({
  fetchCurrentUser: vi.fn(),
  getAuthErrorMessage: vi.fn((error: unknown) =>
    error instanceof Error ? error.message : 'Sign in failed.',
  ),
}));

vi.mock('../api/authApi', () => ({
  fetchCurrentUser: authMocks.fetchCurrentUser,
  getAuthErrorMessage: authMocks.getAuthErrorMessage,
}));

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="Current location">{location.pathname}</output>;
}

function renderCallback(initialEntry: string) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/auth/callback" element={<OAuthCallbackPage />} />
          <Route path="/login" element={<div>Login page</div>} />
          <Route path="/client/dashboard" element={<div>Client dashboard</div>} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('OAuthCallbackPage', () => {
  afterEach(cleanup);

  beforeEach(() => {
    authMocks.fetchCurrentUser.mockReset();
    useAuthStore.getState().clearSession();
  });

  it('handles error query parameter and displays alert', async () => {
    renderCallback('/auth/callback?error=access_denied');

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain(
      'Google Sign-In was cancelled or access was denied.',
    );
  });

  it('fetches user, establishes session, and redirects on successful token', async () => {
    authMocks.fetchCurrentUser.mockResolvedValue({
      id: 'google-user-1',
      email: 'customer@example.com',
      fullName: 'Google Customer',
      roles: ['CUSTOMER'],
      actorZone: 'CUSTOMER_ORGANIZATION',
      organizationId: null,
      visionFallbackEnabled: true,
    });

    renderCallback('/auth/callback?accessToken=mock-google-access-token');

    await waitFor(() => {
      expect(authMocks.fetchCurrentUser).toHaveBeenCalledWith(
        'mock-google-access-token',
      );
      expect(useAuthStore.getState().status).toBe('authenticated');
      expect(useAuthStore.getState().user?.email).toBe('customer@example.com');
      expect(screen.getByLabelText('Current location').textContent).toBe(
        '/client/dashboard',
      );
    });
  });
});
