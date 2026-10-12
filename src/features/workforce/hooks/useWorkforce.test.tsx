import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useToastStore } from '@/shared/ui/Toast';
import { workforceApi, workforceKeys, type WorkforceUser } from '../api/workforceApi';
import {
  useProvisionWorkforceUser,
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

  it('lists members under the workforce users query key', async () => {
    vi.mocked(workforceApi.listUsers).mockResolvedValue([MEMBER]);

    const { result } = renderHook(() => useWorkforceUsers(), { wrapper: wrapper(client) });

    await waitFor(() => expect(result.current.data).toEqual([MEMBER]));
    expect(client.getQueryData(workforceKeys.users())).toEqual([MEMBER]);
  });

  it('roots every workforce query key at ["workforce"]', () => {
    expect(workforceKeys.all).toEqual(['workforce']);
    expect(workforceKeys.users()[0]).toBe('workforce');
  });

  it('invalidates the workforce list after a successful provisioning', async () => {
    client.setQueryData(workforceKeys.users(), [MEMBER]);
    vi.mocked(workforceApi.provisionUser).mockResolvedValue({
      user: MEMBER,
      temporaryPassword: 'Temp-Password-1',
    });
    const { result } = renderHook(() => useProvisionWorkforceUser(), { wrapper: wrapper(client) });

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

  it('never places the one-time temporary password in the query cache', async () => {
    client.setQueryData(workforceKeys.users(), [MEMBER]);
    vi.mocked(workforceApi.provisionUser).mockResolvedValue({
      user: MEMBER,
      temporaryPassword: 'Temp-Password-1',
    });
    const { result } = renderHook(() => useProvisionWorkforceUser(), { wrapper: wrapper(client) });

    let provisioned: Awaited<ReturnType<typeof workforceApi.provisionUser>> | undefined;
    await act(async () => {
      provisioned = await result.current.mutateAsync({
        email: MEMBER.email,
        fullName: MEMBER.fullName,
        roles: ['INSPECTOR'],
      });
    });

    // The password reaches the caller through the mutation result and nowhere else. Caching it
    // would keep a credential alive in memory and in any devtools query inspection long after the
    // ORG_ADMIN dismissed the one-time surface.
    expect(provisioned?.temporaryPassword).toBe('Temp-Password-1');
    expect(JSON.stringify(client.getQueryCache().getAll())).not.toContain('Temp-Password-1');
    expect(JSON.stringify(client.getQueryData(workforceKeys.users()))).not.toContain(
      'Temp-Password-1',
    );
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