import { ThemeProvider } from '@mui/material/styles';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { theme } from '@/app/theme/theme';
import { useAuthStore, type Role } from '../store/authStore';
import LoginPage from './LoginPage';

const authMocks = vi.hoisted(() => ({
  login: vi.fn(),
  logoutCurrentSession: vi.fn(),
  sendLoginOtp: vi.fn(),
  verifyLoginOtp: vi.fn(),
  completeInitialPasswordSetup: vi.fn(),
  getAuthErrorMessage: vi.fn((error: unknown) => error instanceof Error ? error.message : 'Sign in failed.'),
}));

vi.mock('../api/authApi', () => ({
  login: authMocks.login,
  logoutCurrentSession: authMocks.logoutCurrentSession,
  sendLoginOtp: authMocks.sendLoginOtp,
  verifyLoginOtp: authMocks.verifyLoginOtp,
  completeInitialPasswordSetup: authMocks.completeInitialPasswordSetup,
  getAuthErrorMessage: authMocks.getAuthErrorMessage,
}));

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="Current location">{location.pathname}</output>;
}

const roleCases: { role: Role; path: string; from: string }[] = [
  { role: 'ADMIN', path: '/admin/dashboard', from: '/login' },
  { role: 'MANAGER', path: '/manager/dashboard', from: '/staff/login' },
  { role: 'CUSTOMER', path: '/client/dashboard', from: '/customer/login' },
];

function renderLogin(initialEntry = '/login') {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/login" element={<LoginPage key="default" />} />
          <Route path="/customer/login" element={<LoginPage key="customer" audience="customer" />} />
          <Route path="/inspector/login" element={<LoginPage key="inspector" audience="inspector" />} />
          <Route path="/staff/login" element={<LoginPage key="staff" audience="staff" />} />
          <Route path="/admin/dashboard" element={<div>Admin dashboard</div>} />
          <Route path="/manager/dashboard" element={<div>Manager dashboard</div>} />
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
    authMocks.logoutCurrentSession.mockReset().mockResolvedValue(undefined);
    authMocks.sendLoginOtp.mockReset();
    authMocks.verifyLoginOtp.mockReset();
    authMocks.completeInitialPasswordSetup.mockReset();
    useAuthStore.getState().clearSession();
  });

  it.each(roleCases)('routes $role from $from to $path', async ({ role, path, from }) => {
    authMocks.login.mockResolvedValue({
      step: 'AUTHENTICATED',
      accessToken: 'memory-access-token',
      accessTokenExpiresInSeconds: 900,
      user: {
        id: `${role.toLowerCase()}-user`,
        email: `${role.toLowerCase()}@example.test`,
        fullName: 'Role User',
        roles: [role],
      },
    });

    renderLogin(from);
    fireEvent.change(screen.getByRole('textbox', { name: /email address/i }), {
      target: { value: `${role.toLowerCase()}@example.test` },
    });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'valid-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await screen.findByText(
      role === 'ADMIN'
        ? 'Admin dashboard'
        : role === 'MANAGER'
          ? 'Manager dashboard'
          : 'Client dashboard',
    );
    expect(screen.getByLabelText('Current location').textContent).toBe(path);
    expect(useAuthStore.getState()).toMatchObject({ status: 'authenticated', accessToken: 'memory-access-token', roles: [role] });
  });

  it('blocks Inspector accounts on Customer /login and routes Inspector login via /inspector/login', async () => {
    authMocks.login.mockResolvedValue({
      step: 'AUTHENTICATED',
      accessToken: 'memory-access-token',
      accessTokenExpiresInSeconds: 900,
      user: { id: 'field-user', email: 'field@example.test', fullName: 'Field User', roles: ['INSPECTOR'] },
    });

    renderLogin();
    expect(screen.getByRole('link', { name: 'Sign up' }).getAttribute('href')).toBe('/register');
    expect(screen.queryByRole('link', { name: /inspector/i })).toBeNull();

    fireEvent.change(screen.getByRole('textbox', { name: /email address/i }), { target: { value: 'field@example.test' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'valid-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    const notice = await screen.findByRole('alert');
    const switchLink = within(notice).getByRole('link', { name: 'Inspector sign-in' });
    expect(switchLink.getAttribute('href')).toBe('/inspector/login');
    expect(authMocks.logoutCurrentSession).toHaveBeenCalledOnce();
    expect(authMocks.logoutCurrentSession).toHaveBeenCalledWith('memory-access-token');
    expect(useAuthStore.getState().status).toBe('anonymous');

    fireEvent.click(switchLink);
    await screen.findByRole('heading', { name: 'Inspector sign-in' });
    expect(screen.getByRole('link', { name: 'Register as Inspector' }).getAttribute('href')).toBe('/inspector/register');
    expect(screen.queryByText(/Continue with Google/i)).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect((screen.getByRole('textbox', { name: /email address/i }) as HTMLInputElement).value).toBe('field@example.test');
    expect((screen.getByLabelText('Password') as HTMLInputElement).value).toBe('');
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'valid-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await screen.findByText('Operations dashboard');
    expect(screen.getByLabelText('Current location').textContent).toBe('/operations/dashboard');
  });

  it.each([
    { from: '/inspector/login', role: 'CUSTOMER', label: 'Customer sign-in', path: '/customer/login' },
    { from: '/inspector/login', role: 'MANAGER', label: 'Manager / Admin sign-in', path: '/staff/login' },
    { from: '/customer/login', role: 'ADMIN', label: 'Manager / Admin sign-in', path: '/staff/login' },
    { from: '/staff/login', role: 'CUSTOMER', label: 'Customer sign-in', path: '/customer/login' },
  ] as const)('shows only the $role account’s sign-in link after attempting $from', async ({ from, role, label, path }) => {
    authMocks.login.mockResolvedValue({
      step: 'AUTHENTICATED',
      accessToken: 'memory-access-token',
      accessTokenExpiresInSeconds: 900,
      user: { id: 'test-user', email: 'user@example.test', fullName: 'Test User', roles: [role] },
    });

    renderLogin(from);
    expect(screen.queryByRole('link', { name: /sign-in$/i })).toBeNull();
    fireEvent.change(screen.getByRole('textbox', { name: /email address/i }), { target: { value: 'user@example.test' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'valid-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    const notice = await screen.findByRole('alert');
    expect(within(notice).getByRole('link', { name: label }).getAttribute('href')).toBe(path);
    expect(within(notice).getAllByRole('link')).toHaveLength(1);
    expect(useAuthStore.getState().status).toBe('anonymous');
  });

  it('completes mandatory first-password setup before routing the role', async () => {
    authMocks.login.mockResolvedValue({
      step: 'PASSWORD_CHANGE_REQUIRED',
      accessToken: null,
      accessTokenExpiresInSeconds: 0,
      user: { id: 'field-user', email: 'field@example.test', fullName: 'Field User', roles: ['INSPECTOR'] },
    });
    authMocks.completeInitialPasswordSetup.mockResolvedValue({
      step: 'AUTHENTICATED',
      accessToken: 'new-memory-token',
      accessTokenExpiresInSeconds: 900,
      user: { id: 'field-user', email: 'field@example.test', fullName: 'Field User', roles: ['INSPECTOR'] },
    });

    renderLogin('/inspector/login');
    fireEvent.change(screen.getByRole('textbox', { name: /email address/i }), { target: { value: 'field@example.test' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'temporary-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await screen.findByRole('heading', { name: 'Set your password' });
    fireEvent.change(screen.getByLabelText('Temporary password'), { target: { value: 'temporary-password' } });
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'NewPassword123!' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'NewPassword123!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save password and continue' }));

    await screen.findByText('Operations dashboard');
    expect(authMocks.completeInitialPasswordSetup).toHaveBeenCalledWith('field@example.test', 'temporary-password', 'NewPassword123!');
    expect(useAuthStore.getState()).toMatchObject({ status: 'authenticated', roles: ['INSPECTOR'] });
  });

  it('preserves a permitted protected destination after sign-in', async () => {
    authMocks.login.mockResolvedValue({
      step: 'AUTHENTICATED', accessToken: 'memory-access-token', accessTokenExpiresInSeconds: 900,
      user: { id: 'field-user', email: 'field@example.test', fullName: 'Field User', roles: ['INSPECTOR'] },
    });
    renderLogin('/inspector/login?returnTo=%2Foperations%2Finspections');
    fireEvent.change(screen.getByRole('textbox', { name: /email address/i }), { target: { value: 'field@example.test' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'valid-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await screen.findByText('Inspection detail');
    expect(screen.getByLabelText('Current location').textContent).toBe('/operations/inspections');
  });

  it('requires an Inspector email or SMS code before creating a web session', async () => {
    authMocks.login.mockResolvedValue({
      step: 'OTP_REQUIRED',
      accessToken: null,
      accessTokenExpiresInSeconds: 0,
      user: null,
      challengeToken: 'challenge-token',
      availableOtpChannels: ['EMAIL', 'SMS'],
    });
    authMocks.sendLoginOtp.mockResolvedValue(undefined);
    authMocks.verifyLoginOtp.mockResolvedValue({
      step: 'AUTHENTICATED',
      accessToken: 'otp-verified-token',
      accessTokenExpiresInSeconds: 900,
      user: {
        id: 'field-user',
        email: 'field@example.test',
        fullName: 'Field User',
        roles: ['INSPECTOR'],
      },
    });

    renderLogin('/inspector/login');
    fireEvent.change(screen.getByRole('textbox', { name: /email address/i }), {
      target: { value: 'field@example.test' },
    });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'valid-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await screen.findByRole('heading', { name: 'Verify it’s you' });
    expect(useAuthStore.getState().status).toBe('anonymous');
    fireEvent.click(screen.getByRole('button', { name: 'Send verification code' }));
    await waitFor(() => expect(authMocks.sendLoginOtp).toHaveBeenCalledWith('challenge-token', 'EMAIL'));
    fireEvent.change(screen.getByRole('textbox', { name: 'Verification code' }), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Verify and sign in' }));

    await screen.findByText('Operations dashboard');
    expect(authMocks.verifyLoginOtp).toHaveBeenCalledWith('challenge-token', '123456');
    expect(useAuthStore.getState()).toMatchObject({
      status: 'authenticated',
      accessToken: 'otp-verified-token',
      roles: ['INSPECTOR'],
    });
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
