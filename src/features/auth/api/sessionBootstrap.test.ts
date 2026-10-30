import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ restoreBrowserSession: vi.fn() }));
vi.mock('./authApi', () => ({ restoreBrowserSession: mocks.restoreBrowserSession }));

import { useAuthStore } from '../store/authStore';
import { initializeBrowserSession } from './sessionBootstrap';

describe('MF1 browser session role handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().clearSession();
  });

  it.each([
    ['ADMIN', 'PLATFORM'],
    ['MANAGER', 'PLATFORM'],
    ['CUSTOMER', 'CUSTOMER_ORGANIZATION'],
    ['INSPECTOR', 'INSPECTOR_PARTNER'],
    ['MAINTENANCE_ENGINEER', 'CUSTOMER_ORGANIZATION'],
  ] as const)('restores the canonical %s role and %s actor zone', async (role, actorZone) => {
    useAuthStore.getState().setStatus('checking');
    mocks.restoreBrowserSession.mockResolvedValue({
      step: 'AUTHENTICATED',
      accessToken: 'memory-token',
      accessTokenExpiresInSeconds: 900,
      user: {
        id: 'user-1',
        email: 'user@example.test',
        fullName: 'Test User',
        roles: [role],
        actorZone,
        organizationId: actorZone === 'CUSTOMER_ORGANIZATION' ? 'org-1' : null,
      },
    });

    await initializeBrowserSession();

    expect(useAuthStore.getState().roles).toEqual([role]);
    expect(useAuthStore.getState().actorZone).toBe(actorZone);
  });
});
