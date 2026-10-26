import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { droneApi, droneKeys } from '../api/droneApi';
import { useCreateDrone, useDrones } from './useDrones';

vi.mock('../api/droneApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/droneApi')>();
  return {
    ...actual,
    droneApi: {
      ...actual.droneApi,
      list: vi.fn(),
      create: vi.fn(),
    },
  };
});

function createWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

describe('useDrones', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads drones through the feature query key', async () => {
    const drones = [
      { id: 'drone-1', serialNumber: 'SDI-01', serviceability: 'ACTIVE' },
    ];
    vi.mocked(droneApi.list).mockResolvedValue(drones as never);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { result } = renderHook(() => useDrones(), {
      wrapper: createWrapper(client),
    });

    await waitFor(() => expect(result.current.data).toEqual(drones));
    expect(client.getQueryData(droneKeys.list())).toEqual(drones);
  });

  it('invalidates drone lists after creating a drone', async () => {
    vi.mocked(droneApi.create).mockResolvedValue({ id: 'drone-1' } as never);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidate = vi.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useCreateDrone(), {
      wrapper: createWrapper(client),
    });
    result.current.mutate({ serialNumber: 'SDI-01' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: droneKeys.all });
  });
});
