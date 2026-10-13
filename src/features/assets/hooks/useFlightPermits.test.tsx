import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { permitApi, permitKeys } from '../api/permitApi';
import { useCreateFlightPermit, useFlightPermits, useReviewFlightPermit } from './useFlightPermits';

vi.mock('../api/permitApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/permitApi')>();
  return {
    ...actual,
    permitApi: {
      ...actual.permitApi,
      list: vi.fn(),
      create: vi.fn(),
      review: vi.fn(),
    },
  };
});

function createWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('useFlightPermits', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads permits into the feature query key', async () => {
    const permits = [{ id: 'permit-1', permitType: 'FLIGHT', status: 'APPLICATION' }];
    vi.mocked(permitApi.list).mockResolvedValue(permits as never);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useFlightPermits(), { wrapper: createWrapper(client) });

    await waitFor(() => expect(result.current.data).toEqual(permits));
    expect(client.getQueryData(permitKeys.list())).toEqual(permits);
  });

  it('invalidates permits after creating one', async () => {
    vi.mocked(permitApi.create).mockResolvedValue({ id: 'permit-1' } as never);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useCreateFlightPermit(), { wrapper: createWrapper(client) });

    result.current.mutate({ permitType: 'FLIGHT' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: permitKeys.all });
  });

  it('invalidates permits after internal review', async () => {
    vi.mocked(permitApi.review).mockResolvedValue({ id: 'permit-1', status: 'ACTIVE' } as never);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useReviewFlightPermit(), { wrapper: createWrapper(client) });

    result.current.mutate({
      id: 'permit-1',
      input: { status: 'ACTIVE', reason: 'Recorded from organization-held document' },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: permitKeys.all });
  });
});
