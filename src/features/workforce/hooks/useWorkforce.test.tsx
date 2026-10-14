import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useToastStore } from '@/shared/ui/Toast';
import { workforceApi, workforceKeys, type WorkforceUser } from '../api/workforceApi';
import {
  useCreateWorkforceCredential,
  useProvisionWorkforceUser,
  useReviewWorkforceCredential,
  useWorkforceCredentials,
  useUpdateWorkforceUserRoles,
  useUpdateWorkforceUserStatus,
  useWorkforceUsers,
} from './useWorkforce';

vi.mock('../api/workforceApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/workforceApi')>();
  return {
    ...actual,
    workforceApi: {
      listUsers: vi.fn(),
      provisionUser: vi.fn(),
      updateUserStatus: vi.fn(),
      updateUserRoles: vi.fn(),
      listCredentials: vi.fn(),
      createCredential: vi.fn(),
      reviewCredential: vi.fn(),
    },
  };
});

const MEMBER: WorkforceUser = {
  userId: '3f1d6c3e-2a54-4a1f-9c0e-7a2b5d6e8f10',
  email: 'ivy.inspector@example.test',
  fullName: 'Ivy Inspector',
  roles: ['INSPECTOR'],
  status: 'ACTIVE',
  organizationId: '9a2f7d61-4c0b-4c6a-8f31-2b8c4d1e5a77',
};

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

describe('useWorkforce hooks', () => {
  let client: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    useToastStore.setState({ open: false, message: '', severity: 'success' });
    client = makeClient();
  });

  it('lists credentials under the workforce credentials query key', async () => {
    const credential = { id: 'cred-1', userId: MEMBER.userId, organizationId: MEMBER.organizationId, credentialType: 'PILOT_LICENSE', issuer: null, credentialReference: null, issuedAt: null, expiresAt: null, status: 'PENDING_REVIEW', evidenceId: null, verifiedByUserId: null, verifiedAt: null, verificationReason: null, createdAt: '', updatedAt: '' } as const;
    vi.mocked(workforceApi.listCredentials).mockResolvedValue([credential]);

    const { result } = renderHook(() => useWorkforceCredentials(), { wrapper: wrapper(client) });

    await waitFor(() => expect(result.current.data).toEqual([credential]));
    expect(client.getQueryData(workforceKeys.credentials())).toEqual([credential]);
  });

  it('invalidates credentials and users after a successful review', async () => {
    const credential = { id: 'cred-1', userId: MEMBER.userId, organizationId: MEMBER.organizationId, credentialType: 'PILOT_LICENSE', issuer: null, credentialReference: null, issuedAt: null, expiresAt: null, status: 'ACTIVE', evidenceId: null, verifiedByUserId: null, verifiedAt: null, verificationReason: null, createdAt: '', updatedAt: '' } as const;
    client.setQueryData(workforceKeys.credentials(), [credential]);
    client.setQueryData(workforceKeys.users(), [MEMBER]);
    vi.mocked(workforceApi.reviewCredential).mockResolvedValue(credential as never);
    const { result } = renderHook(() => useReviewWorkforceCredential(), { wrapper: wrapper(client) });

    await act(async () => {
      await result.current.mutateAsync({ id: 'cred-1', decision: 'APPROVE', reason: 'Verified internally' });
    });

    await waitFor(() => {
      expect(client.getQueryState(workforceKeys.credentials())?.isInvalidated).toBe(true);
      expect(client.getQueryState(workforceKeys.users())?.isInvalidated).toBe(true);
    });
  });

  it('does not swallow a failed credential creation', async () => {
    const failure = new Error('Credential type is not allowed.');
    vi.mocked(workforceApi.createCredential).mockRejectedValue(failure);
    const { result } = renderHook(() => useCreateWorkforceCredential(), { wrapper: wrapper(client) });

    await act(async () => {
      await result.current.mutateAsync({ userId: MEMBER.userId, credentialType: 'PILOT_LICENSE' }).catch(() => undefined);
    });

    await waitFor(() => expect(result.current.error).toBe(failure));
    expect(result.current.isSuccess).toBe(false);
  });

  it('lists members under the workforce users query key', async () => {
    vi.mocked(workforceApi.listUsers).mockResolvedValue([MEMBER]);

    const { result } = renderHook(() => useWorkforceUsers(), { wrapper: wrapper(client) });

    await waitFor(() => expect(result.current.data).toEqual([MEMBER]));
    expect(client.getQueryData(workforceKeys.users())).toEqual([MEMBER]);
  });

  it('invalidates the workforce list after a successful provisioning', async () => {
    client.setQueryData(workforceKeys.users(), [MEMBER]);
    vi.mocked(workforceApi.provisionUser).mockResolvedValue({
      user: MEMBER,
      temporaryPassword: 'Temp-Password-1',
    });
    const { result } = renderHook(() => useProvisionWorkforceUser(() => undefined), { wrapper: wrapper(client) });

    await act(async () => {
      await result.current.mutateAsync({
        email: MEMBER.email,
        fullName: MEMBER.fullName,
        roles: ['INSPECTOR'],
      });
    });

    // The new member must reach the list, so every workforce query is marked stale.
    await waitFor(() =>
      expect(client.getQueryState(workforceKeys.users())?.isInvalidated).toBe(true),
    );
  });

  it('keeps the temporary password out of the mutation and query caches', async () => {
    client.setQueryData(workforceKeys.users(), [MEMBER]);
    vi.mocked(workforceApi.provisionUser).mockResolvedValue({
      user: MEMBER,
      temporaryPassword: 'Temp-Password-1',
    });
    const issued: unknown[] = [];
    const { result } = renderHook(
      () => useProvisionWorkforceUser((credential) => issued.push(credential)),
      { wrapper: wrapper(client) },
    );

    let mutationData: unknown;
    await act(async () => {
      mutationData = await result.current.mutateAsync({
        email: MEMBER.email,
        fullName: MEMBER.fullName,
        roles: ['INSPECTOR'],
      });
    });

    expect(mutationData).toEqual(MEMBER);
    expect(issued).toEqual([{ user: MEMBER, temporaryPassword: 'Temp-Password-1' }]);
    expect(JSON.stringify(client.getQueryCache().getAll())).not.toContain('Temp-Password-1');
    expect(JSON.stringify(client.getQueryData(workforceKeys.users()))).not.toContain(
      'Temp-Password-1',
    );
    expect(JSON.stringify(client.getMutationCache().getAll())).not.toContain('Temp-Password-1');
  });

  it('does not turn a successful provision into a failed mutation if the local password callback throws', async () => {
    client.setQueryData(workforceKeys.users(), [MEMBER]);
    vi.mocked(workforceApi.provisionUser).mockResolvedValue({
      user: MEMBER,
      temporaryPassword: 'Temp-Password-Callback',
    });
    const { result } = renderHook(
      () => useProvisionWorkforceUser(() => { throw new Error('dialog callback failed'); }),
      { wrapper: wrapper(client) },
    );

    await expect(
      act(async () => result.current.mutateAsync({
        email: MEMBER.email,
        fullName: MEMBER.fullName,
        roles: ['INSPECTOR'],
      })),
    ).resolves.toEqual(MEMBER);
    expect(client.getQueryState(workforceKeys.users())?.isInvalidated).toBe(true);
  });

  it('resets a provisioning error when reset is called', async () => {
    const { result } = renderHook(
      () => useProvisionWorkforceUser(() => undefined),
      { wrapper: wrapper(client) },
    );

    expect(typeof result.current.reset).toBe('function');
    await act(async () => result.current.reset());
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeNull();
  });

  it('exposes reset so the page can drop an error after the provision dialog closes', async () => {
    const client = new QueryClient();
    const { result } = renderHook(() => useProvisionWorkforceUser(() => undefined), { wrapper: wrapper(client) });

    expect(typeof result.current.reset).toBe('function');
    await act(async () => {
      result.current.reset();
    });
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeNull();
  });

  it('invalidates the workforce list after a status change', async () => {
    client.setQueryData(workforceKeys.users(), [MEMBER]);
    vi.mocked(workforceApi.updateUserStatus).mockResolvedValue({ ...MEMBER, status: 'SUSPENDED' });
    const { result } = renderHook(() => useUpdateWorkforceUserStatus(), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ userId: MEMBER.userId, status: 'SUSPENDED' });
    });

    await waitFor(() =>
      expect(client.getQueryState(workforceKeys.users())?.isInvalidated).toBe(true),
    );
  });

  it('invalidates the workforce list after a role change', async () => {
    client.setQueryData(workforceKeys.users(), [MEMBER]);
    vi.mocked(workforceApi.updateUserRoles).mockResolvedValue({
      ...MEMBER,
      roles: ['INSPECTOR', 'MAINTENANCE_ENGINEER'],
    });
    const { result } = renderHook(() => useUpdateWorkforceUserRoles(), { wrapper: wrapper(client) });

    await act(async () => {
      await result.current.mutateAsync({
        userId: MEMBER.userId,
        roles: ['INSPECTOR', 'MAINTENANCE_ENGINEER'],
      });
    });

    await waitFor(() =>
      expect(client.getQueryState(workforceKeys.users())?.isInvalidated).toBe(true),
    );
  });

  it('preserves the server error on a failed status change instead of swallowing it', async () => {
    const denied = new Error('User was not found.');
    vi.mocked(workforceApi.updateUserStatus).mockRejectedValue(denied);
    const { result } = renderHook(() => useUpdateWorkforceUserStatus(), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ userId: MEMBER.userId, status: 'DISABLED' }).catch(
        () => undefined,
      );
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    // The caller's own wording is what the page renders; a failed write must not be reduced to a
    // generic message and it must not be treated as a successful change.
    expect(result.current.error).toBe(denied);
    expect(result.current.isSuccess).toBe(false);
    expect(useToastStore.getState().open).toBe(false);
  });
});