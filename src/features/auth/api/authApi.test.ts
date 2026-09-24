import { beforeEach, describe, expect, it, vi } from 'vitest';

const transport = vi.hoisted(() => ({
  postWithBrowserCsrf: vi.fn(),
}));

vi.mock('@/shared/api/client', () => ({
  postWithBrowserCsrf: transport.postWithBrowserCsrf,
  withBrowserRefreshLock: (operation: () => Promise<unknown>) => operation(),
}));

import {
  completeInitialPasswordSetup,
  changePassword,
  login,
  logoutAllSessions,
  logoutCurrentSession,
  registerClient,
  restoreBrowserSession,
} from './authApi';

const user = {
  id: 'user-1',
  email: 'client@example.com',
  fullName: 'Client User',
  roles: ['CLIENT'],
  actorZone: 'CUSTOMER_ORGANIZATION',
  organizationId: 'org-1',
};

const authenticatedFlow = {
  step: 'AUTHENTICATED',
  accessToken: 'memory-only-access-token',
  accessTokenExpiresInSeconds: 900,
  user,
};

describe('browser auth API', () => {
  beforeEach(() => {
    transport.postWithBrowserCsrf.mockReset();
  });

  it('obtains CSRF protection before login and returns no refresh credential', async () => {
    transport.postWithBrowserCsrf.mockResolvedValue({ data: authenticatedFlow });

    const result = await login('client@example.com', 'secret password');

    expect(transport.postWithBrowserCsrf).toHaveBeenCalledWith('/auth/login', {
      email: 'client@example.com',
      password: 'secret password',
    }, 30_000);
    expect(result).toEqual(authenticatedFlow);
    expect(result).not.toHaveProperty('refreshToken');
  });

  it('keeps the mandatory first-password step separate from an authenticated session', async () => {
    transport.postWithBrowserCsrf.mockResolvedValue({
      data: {
        step: 'PASSWORD_CHANGE_REQUIRED',
        accessTokenExpiresInSeconds: 0,
        user,
      },
    });

    const result = await login('client@example.com', 'temporary password');

    expect(result.step).toBe('PASSWORD_CHANGE_REQUIRED');
    expect(result.accessToken).toBeNull();
  });

  it('completes the required first-password setup and allows the server to set its cookie', async () => {
    transport.postWithBrowserCsrf.mockResolvedValue({ data: authenticatedFlow });

    await completeInitialPasswordSetup(
      'admin@example.com',
      'temporary password',
      'a much longer secure password',
    );

    expect(transport.postWithBrowserCsrf).toHaveBeenCalledWith(
      '/auth/password/setup',
      {
      email: 'admin@example.com',
      currentPassword: 'temporary password',
      password: 'a much longer secure password',
      },
      30_000,
    );
  });

  it('restores the browser session only through the cookie-backed refresh endpoint', async () => {
    transport.postWithBrowserCsrf.mockResolvedValue({ data: authenticatedFlow });

    const result = await restoreBrowserSession();

    expect(transport.postWithBrowserCsrf).toHaveBeenCalledWith(
      '/auth/refresh',
      undefined,
      5_000,
    );
    expect(result.accessToken).toBe('memory-only-access-token');
  });

  it('registers only the Client onboarding contract and normalizes known role data', async () => {
    transport.postWithBrowserCsrf.mockResolvedValue({
      data: {
        organizationId: 'org-1',
        organizationName: 'Example Org',
        organizationCode: 'EXAMPLE',
        user: { ...user, roles: ['CLIENT', 'UNKNOWN_ROLE'] },
      },
    });

    const result = await registerClient({
      email: 'client@example.com',
      fullName: 'Client User',
      organizationName: 'Example Org',
      organizationCode: 'EXAMPLE',
      password: 'a much longer secure password',
    });

    expect(transport.postWithBrowserCsrf).toHaveBeenCalledWith('/auth/register', {
      email: 'client@example.com',
      fullName: 'Client User',
      organizationName: 'Example Org',
      organizationCode: 'EXAMPLE',
      password: 'a much longer secure password',
    });
    expect(result.user.roles).toEqual(['CLIENT']);
  });

  it('uses CSRF-protected browser endpoints for one-device and all-device logout', async () => {
    transport.postWithBrowserCsrf.mockResolvedValue({ data: undefined });

    await logoutCurrentSession();
    await logoutAllSessions();

    expect(transport.postWithBrowserCsrf).toHaveBeenNthCalledWith(1, '/auth/logout');
    expect(transport.postWithBrowserCsrf).toHaveBeenNthCalledWith(2, '/auth/logout-all');
  });

  it('changes the authenticated account password through the browser API', async () => {
    transport.postWithBrowserCsrf.mockResolvedValue({ data: undefined });

    await changePassword('current password', 'a much longer secure password');

    expect(transport.postWithBrowserCsrf).toHaveBeenCalledWith(
      '/auth/password/change',
      {
        currentPassword: 'current password',
        newPassword: 'a much longer secure password',
      },
    );
  });
});
