import { beforeEach, describe, expect, it, vi } from 'vitest';

const restore = vi.hoisted(() => vi.fn());

vi.mock('./authApi', () => ({ restoreBrowserSession: restore }));

import { initializeBrowserSession } from './sessionBootstrap';
import type { AuthFlowResponse } from './authApi';
import { useAuthStore, type Role } from '../store/authStore';

const authenticatedFlow: AuthFlowResponse = {
  step: 'AUTHENTICATED' as const,
  accessToken: 'restored-memory-token',
  accessTokenExpiresInSeconds: 900,
  user: {
    id: 'user-1',
    email: 'org-admin@example.com',
    fullName: 'Organization Admin',
    roles: ['ORG_ADMIN'] as Role[],
    actorZone: 'CUSTOMER_ORGANIZATION',
    organizationId: 'org-1',
  },
};

describe('browser session bootstrap', () => {
  beforeEach(() => {
    restore.mockReset();
    localStorage.removeItem('sdi_dev_session');
    useAuthStore.setState({
      status: 'checking',
      accessToken: null,
      user: null,
      userId: null,
      userName: null,
      email: null,
      roles: [],
      actorZone: null,
      organizationId: null,
    });
  });

  it('restores the profile and access token into memory', async () => {
    restore.mockResolvedValue(authenticatedFlow);

    await initializeBrowserSession();

    expect(useAuthStore.getState()).toMatchObject({
      status: 'authenticated',
      accessToken: 'restored-memory-token',
      email: 'org-admin@example.com',
      roles: ['ORG_ADMIN'],
    });
  });

  it('ends the bootstrap as signed out when refresh is rejected', async () => {
    restore.mockRejectedValue(new Error('Refresh cookie is no longer valid.'));

    await initializeBrowserSession();

    expect(useAuthStore.getState()).toMatchObject({
      status: 'anonymous',
      accessToken: null,
      roles: [],
    });
  });

  it('shares one in-tab restoration request when mounted concurrently', async () => {
    let complete: ((value: typeof authenticatedFlow) => void) | undefined;
    restore.mockImplementation(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );

    const first = initializeBrowserSession();
    const second = initializeBrowserSession();
    expect(restore).toHaveBeenCalledTimes(1);

    complete?.(authenticatedFlow);
    await Promise.all([first, second]);
    expect(useAuthStore.getState().status).toBe('authenticated');
  });

  it('does not let a stale refresh response overwrite a newer successful login', async () => {
    let completeRestore: ((value: AuthFlowResponse) => void) | undefined;
    const staleFlow = {
      step: 'AUTHENTICATED' as const,
      accessToken: 'stale-refresh-token',
      accessTokenExpiresInSeconds: 900,
      user: {
        id: 'stale-user',
        email: 'stale-inspector@example.test',
        fullName: 'Stale Inspector',
        roles: ['INSPECTOR'] as Role[],
        actorZone: 'CUSTOMER_ORGANIZATION' as const,
        organizationId: 'org-1',
      },
    };
    restore.mockImplementation(
      () =>
        new Promise((resolve) => {
          completeRestore = resolve;
        }),
    );

    const bootstrap = initializeBrowserSession();
    useAuthStore.getState().setSession({
      accessToken: 'fresh-login-token',
      user: {
        id: 'fresh-user',
        email: 'fresh-admin@example.test',
        fullName: 'Fresh Admin',
        roles: ['ORG_ADMIN'],
        actorZone: 'CUSTOMER_ORGANIZATION',
        organizationId: 'org-2',
      },
    });

    completeRestore?.(staleFlow);
    await bootstrap;

    expect(useAuthStore.getState()).toMatchObject({
      status: 'authenticated',
      accessToken: 'fresh-login-token',
      email: 'fresh-admin@example.test',
      roles: ['ORG_ADMIN'],
    });
  });
});
