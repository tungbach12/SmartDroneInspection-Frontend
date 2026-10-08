import { beforeEach, describe, expect, it, vi } from 'vitest';

const transport = vi.hoisted(() => ({
  postWithBrowserCsrf: vi.fn(),
}));

vi.mock('@/shared/api/client', () => ({
  postWithBrowserCsrf: transport.postWithBrowserCsrf,
  withBrowserRefreshLock: (operation: () => Promise<unknown>) => operation(),
}));

import * as authApi from './authApi';
import {
  completeInitialPasswordSetup,
  changePassword,
  login,
  logoutAllSessions,
  logoutCurrentSession,
  registerOrganization,
  restoreBrowserSession,
} from './authApi';


const user = {
  id: 'user-1',
  email: 'org-admin@example.com',
  fullName: 'Organization Admin',
  roles: ['ORG_ADMIN'],
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

  it('does not expose retired provider onboarding or team APIs', () => {
    expect(authApi).not.toHaveProperty('registerProvider');
    expect(authApi).not.toHaveProperty('activateProvider');
    expect(authApi).not.toHaveProperty('createProviderUser');
  });

  it('obtains CSRF protection before login and returns no refresh credential', async () => {
    transport.postWithBrowserCsrf.mockResolvedValue({ data: authenticatedFlow });

    const result = await login('org-admin@example.com', 'secret password');

    expect(transport.postWithBrowserCsrf).toHaveBeenCalledWith('/auth/login', {
      email: 'org-admin@example.com',
      password: 'secret password',
    }, 30_000);
    expect(result).toEqual(authenticatedFlow);
    expect(result.user).not.toHaveProperty('providerId');
    expect(result).not.toHaveProperty('refreshToken');
  });

  it('preserves canonical enterprise roles when parsing an authenticated user', async () => {
    transport.postWithBrowserCsrf.mockResolvedValue({
      data: {
        ...authenticatedFlow,
        user: {
          ...user,
          roles: [
            'ADMIN',
            'ORG_ADMIN',
            'INSPECTOR',
            'MAINTENANCE_ENGINEER',
            'UNKNOWN_ROLE',
          ],
        },
      },
    });

    const result = await login('org-admin@example.com', 'secret password');

    expect(result.user.roles).toEqual([
      'ADMIN',
      'ORG_ADMIN',
      'INSPECTOR',
      'MAINTENANCE_ENGINEER',
    ]);
  });

  it('rejects actor zones outside the canonical platform and organization zones', async () => {
    transport.postWithBrowserCsrf.mockResolvedValue({
      data: {
        ...authenticatedFlow,
        user: { ...user, actorZone: 'SERVICE_WORKFORCE' },
      },
    });

    await expect(login('org-admin@example.com', 'secret password')).rejects.toThrow(
      'The server returned an invalid account profile.',
    );
  });

  it('keeps the mandatory first-password step separate from an authenticated session', async () => {
    transport.postWithBrowserCsrf.mockResolvedValue({
      data: {
        step: 'PASSWORD_CHANGE_REQUIRED',
        accessTokenExpiresInSeconds: 0,
        user,
      },
    });

    const result = await login('org-admin@example.com', 'temporary password');

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

  it('registers an organization and normalizes canonical role data', async () => {
    transport.postWithBrowserCsrf.mockResolvedValue({
      data: {
        organizationId: 'org-1',
        organizationName: 'Example Org',
        organizationCode: 'EXAMPLE',
        user: { ...user, roles: ['ORG_ADMIN', 'UNKNOWN_ROLE'] },
      },
    });

    const result = await registerOrganization({
      email: 'org-admin@example.com',
      fullName: 'Organization Admin',
      organizationName: 'Example Org',
      organizationCode: 'EXAMPLE',
      password: 'a much longer secure password',
    });

    expect(transport.postWithBrowserCsrf).toHaveBeenCalledWith('/auth/register', {
      email: 'org-admin@example.com',
      fullName: 'Organization Admin',
      organizationName: 'Example Org',
      organizationCode: 'EXAMPLE',
      password: 'a much longer secure password',
    });
    expect(result.organizationCode).toBe('EXAMPLE');
    expect(result.user.roles).toEqual(['ORG_ADMIN']);
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
