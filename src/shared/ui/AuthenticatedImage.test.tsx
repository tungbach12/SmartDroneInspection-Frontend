import { cleanup, render, screen, waitFor } from '@testing-library/react';
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/features/auth/store/authStore';
import { api } from '@/shared/api/client';
import { AuthenticatedImage } from './AuthenticatedImage';

const originalAdapter = api.defaults.adapter;
const originalCreateObjectUrl = URL.createObjectURL;
const originalRevokeObjectUrl = URL.revokeObjectURL;
async function flushImageRequest() {
  await waitFor(() => {
    expect(URL.createObjectURL).toHaveBeenCalled();
  });
}

afterEach(() => {
  cleanup();
  if (originalAdapter) {
    api.defaults.adapter = originalAdapter;
  } else {
    delete api.defaults.adapter;
  }
  URL.createObjectURL = originalCreateObjectUrl;
  URL.revokeObjectURL = originalRevokeObjectUrl;
  useAuthStore.setState({ accessToken: null });
});

describe('AuthenticatedImage', () => {
  it('loads evidence through the shared client with the current bearer token', async () => {
    let requestConfig: InternalAxiosRequestConfig | undefined;
    const responseBlob = new Blob(['image'], { type: 'image/png' });
    api.defaults.adapter = ((config: InternalAxiosRequestConfig) => {
      requestConfig = config;
      return Promise.resolve<AxiosResponse>({
        data: responseBlob,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      });
    }) as AxiosAdapter;
    URL.createObjectURL = vi.fn().mockReturnValue('blob:evidence');
    URL.revokeObjectURL = vi.fn();
    useAuthStore.setState({ accessToken: 'current-access-token' });

    render(<AuthenticatedImage src="/api/v1/inspections/i1/evidence/e1/content" alt="evidence" />);
    await flushImageRequest();

    expect(requestConfig?.url).toBe('/inspections/i1/evidence/e1/content');
    expect(requestConfig?.headers.Authorization).toBe('Bearer current-access-token');
    expect(requestConfig?.responseType).toBe('blob');
    expect(URL.createObjectURL).toHaveBeenCalledWith(responseBlob);
    expect(screen.getByRole('img', { name: 'evidence' }).getAttribute('src')).toBe('blob:evidence');
  });

  it('shows the fallback when the authenticated request is rejected', async () => {
    api.defaults.adapter = (() => Promise.reject(new Error('Unauthorized'))) as AxiosAdapter;
    render(<AuthenticatedImage src="/api/v1/inspections/i1/evidence/e1/content" alt="evidence" />);

    expect(await screen.findByText('Could not load preview')).not.toBeNull();
  });
});
