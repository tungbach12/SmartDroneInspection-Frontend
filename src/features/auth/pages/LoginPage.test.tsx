import { ThemeProvider } from '@mui/material/styles';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { theme } from '@/app/theme/theme';
import { useAuthStore, type Role } from '../store/authStore';
import LoginPage from './LoginPage';

const authMocks = vi.hoisted(() => ({
  login: vi.fn(),
  completeInitialPasswordSetup: vi.fn(),
  getAuthErrorMessage: vi.fn((error: unknown) => error instanceof Error ? error.message : 'Sign in failed.'),
}));

vi.mock('../api/authApi', () => ({
  login: authMocks.login,
  completeInitialPasswordSetup: authMocks.completeInitialPasswordSetup,
  getAuthErrorMessage: authMocks.getAuthErrorMessage,
}));

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="Current location">{location.pathname}</output>;
}

const roleCases: { role: Role; path: string; actorZone: 'PLATFORM' | 'CUSTOMER_ORGANIZATION' }[] = [
  { role: 'ADMIN', path: '/admin/dashboard', actorZone: 'PLATFORM' },
  { role: 'ORG_ADMIN', path: '/client/dashboard', actorZone: 'CUSTOMER_ORGANIZATION' },
  { role: 'INSPECTOR', path: '/operations/dashboard', actorZone: 'CUSTOMER_ORGANIZATION' },
  { role: 'MAINTENANCE_ENGINEER', path: '/operations/dashboard', actorZone: 'CUSTOMER_ORGANIZATION' },
];

function renderLogin(initialEntry = '/login') {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin/dashboard" element={<div>Admin dashboard</div>} />
          <Route path="/client/dashboard" element={<div>Client dashboard</div>} />
          <Route path="/operations/dashboard" element={<div>Operations dashboard</div>} />
          <Route path="/operations/inspections" element={<div>Inspection detail</div>} />
          <Route path="/forbidden" element={<div>Access denied</div>} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('role-aware sign-in flow', () => {
  afterEach(cleanup);

  beforeEach(() => {
    authMocks.login.mockReset();
    authMocks.completeInitialPasswordSetup.mockReset();
    useAuthStore.getState().clearSession();
  });

  it.each(roleCases)('routes $role to $path from the server-assigned role', async ({ role, path, actorZone }) => {
    authMocks.login.mockResolvedValue({
      step: 'AUTHENTICATED',
      accessToken: 'memory-access-token',
      accessTokenExpiresInSeconds: 900,
      user: {
        id: `${role.toLowerCase()}-user`,
        email: `${role.toLowerCase()}@example.test`,
        fullName: 'Role User',
        roles: [role],
        actorZone,
        organizationId: actorZone === 'PLATFORM' ? null : 'org-1',
      },
    });

    renderLogin();
    fireEvent.change(screen.getByRole('textbox', { name: /email address/i }), {
      target: { value: `${role.toLowerCase()}@example.test` },
    });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'valid-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await screen.findByText(role === 'ADMIN' ? 'Admin dashboard' : role === 'ORG_ADMIN' ? 'Client dashboard' : 'Operations dashboard');
    expect(screen.getByLabelText('Current location').textContent).toBe(path);
    expect(useAuthStore.getState()).toMatchObject({ status: 'authenticated', accessToken: 'memory-access-token', roles: [role] });
  });

  it('completes mandatory first-password setup before routing the role', async () => {
    authMocks.login.mockResolvedValue({
      step: 'PASSWORD_CHANGE_REQUIRED',
      accessToken: null,
      accessTokenExpiresInSeconds: 0,
      user: { id: 'field-user', email: 'field@example.test', fullName: 'Field User', roles: ['INSPECTOR'], actorZone: 'CUSTOMER_ORGANIZATION', organizationId: 'org-1' },
    });
    authMocks.completeInitialPasswordSetup.mockResolvedValue({
      step: 'AUTHENTICATED',
      accessToken: 'new-memory-token',
      accessTokenExpiresInSeconds: 900,
      user: { id: 'field-user', email: 'field@example.test', fullName: 'Field User', roles: ['INSPECTOR'], actorZone: 'CUSTOMER_ORGANIZATION', organizationId: 'org-1' },
    });

    renderLogin();
    fireEvent.change(screen.getByRole('textbox', { name: /email address/i }), { target: { value: 'field@example.test' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'temporary-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await screen.findByRole('heading', { name: 'Set your password' });
    fireEvent.change(screen.getByLabelText('Temporary password'), { target: { value: 'temporary-password' } });
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'new-password-long-enough' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'new-password-long-enough' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save password and continue' }));

    await screen.findByText('Operations dashboard');
    expect(authMocks.completeInitialPasswordSetup).toHaveBeenCalledWith('field@example.test', 'temporary-password', 'new-password-long-enough');
    expect(useAuthStore.getState()).toMatchObject({ status: 'authenticated', roles: ['INSPECTOR'] });
  });

  it('preserves a permitted protected destination after sign-in', async () => {
    authMocks.login.mockResolvedValue({
      step: 'AUTHENTICATED', accessToken: 'memory-access-token', accessTokenExpiresInSeconds: 900,
      user: { id: 'field-user', email: 'field@example.test', fullName: 'Field User', roles: ['INSPECTOR'], actorZone: 'CUSTOMER_ORGANIZATION', organizationId: 'org-1' },
    });
    renderLogin('/login?returnTo=%2Foperations%2Finspections');
    fireEvent.change(screen.getByRole('textbox', { name: /email address/i }), { target: { value: 'field@example.test' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'valid-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await screen.findByText('Inspection detail');
    expect(screen.getByLabelText('Current location').textContent).toBe('/operations/inspections');
  });

  it('shows rejected credentials without creating a session', async () => {
    authMocks.login.mockRejectedValue(new Error('Check your email and password.'));
    renderLogin();
    fireEvent.change(screen.getByRole('textbox', { name: /email address/i }), { target: { value: 'person@example.test' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'incorrect-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Check your email and password.');
    await waitFor(() => expect(useAuthStore.getState().status).toBe('anonymous'));
  });
});
