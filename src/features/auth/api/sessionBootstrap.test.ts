import { beforeEach, describe, expect, it, vi } from 'vitest';

const restore = vi.hoisted(() => vi.fn());

vi.mock('./authApi', () => ({ restoreBrowserSession: restore }));

import { initializeBrowserSession } from './sessionBootstrap';
import { useAuthStore } from '../store/authStore';

const authenticatedFlow = {
  step: 'AUTHENTICATED' as const,
  accessToken: 'restored-memory-token',
  accessTokenExpiresInSeconds: 900,
  user: {
    id: 'user-1',
    email: 'client@example.com',
    fullName: 'Client User',
    roles: ['CLIENT'] as const,
    actorZone: 'CUSTOMER_ORGANIZATION',
    organizationId: 'org-1',
  },
};

describe('browser session bootstrap', () => {
  beforeEach(() => {
    restore.mockReset();
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
      email: 'client@example.com',
      roles: ['CLIENT'],
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
});
