import { cleanup, render, screen, waitFor } from '@testing-library/react';
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/features/auth/store/authStore';
import { api } from '@/shared/api/client';
import { AuthenticatedMedia } from './AuthenticatedMedia';

const originalAdapter = api.defaults.adapter;
const originalCreateObjectUrl = URL.createObjectURL;
const originalRevokeObjectUrl = URL.revokeObjectURL;

async function flushMediaRequest() {
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

describe('AuthenticatedMedia', () => {
  it('streams video via scoped media ticket and HTTP Range URL without downloading a full Blob', async () => {
    const requests: InternalAxiosRequestConfig[] = [];
    api.defaults.adapter = ((config: InternalAxiosRequestConfig) => {
      requests.push(config);
      if (config.method?.toLowerCase() === 'post') {
        return Promise.resolve<AxiosResponse>({
          data: {
            ticket: 'signed-ticket',
            streamUrl: '/api/v1/inspections/i1/evidence/e1/stream?ticket=signed-ticket',
            expiresAt: '2026-11-15T05:00:00Z',
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        });
      }
      return Promise.resolve<AxiosResponse>({
        data: new Blob(['poster-thumb'], { type: 'image/jpeg' }),
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      });
    }) as AxiosAdapter;
    URL.createObjectURL = vi.fn().mockReturnValue('blob:poster-thumb');
    URL.revokeObjectURL = vi.fn();
    useAuthStore.setState({ accessToken: 'manager-access-token' });

    const { unmount } = render(
      <AuthenticatedMedia
        src="/api/v1/inspections/i1/evidence/e1/content"
        posterSrc="/api/v1/inspections/i1/evidence/e1/content?variant=thumb"
        alt="drone flight video"
        contentType="video/mp4"
      />,
    );

    const videoElement = (await screen.findByLabelText('drone flight video')) as HTMLVideoElement;
    expect(videoElement.tagName.toLowerCase()).toBe('video');
    expect(videoElement.controls).toBe(true);
    expect(videoElement.getAttribute('src')).toBe(
      '/api/v1/inspections/i1/evidence/e1/stream?ticket=signed-ticket',
    );
    await waitFor(() => {
      expect(videoElement.getAttribute('poster')).toBe('blob:poster-thumb');
    });

    const ticketRequest = requests.find((req) => req.method?.toLowerCase() === 'post');
    expect(ticketRequest?.url).toBe('/inspections/i1/evidence/e1/media-ticket');
    expect(ticketRequest?.headers.Authorization).toBe('Bearer manager-access-token');
    expect(
      requests.some((req) => req.url === '/inspections/i1/evidence/e1/content'),
    ).toBe(false);

    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:poster-thumb');
  });

  it('renders an img element when contentType is image/jpeg', async () => {
    const responseBlob = new Blob(['photo-bytes'], { type: 'image/jpeg' });
    api.defaults.adapter = ((config: InternalAxiosRequestConfig) =>
      Promise.resolve<AxiosResponse>({
        data: responseBlob,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      })) as AxiosAdapter;
    URL.createObjectURL = vi.fn().mockReturnValue('blob:defect-photo');
    URL.revokeObjectURL = vi.fn();

    render(
      <AuthenticatedMedia
        src="/api/v1/inspections/i1/evidence/e2/content"
        alt="defect photo"
        contentType="image/jpeg"
      />,
    );
    await flushMediaRequest();

    const imgElement = screen.getByRole('img', { name: 'defect photo' });
    expect(imgElement.getAttribute('src')).toBe('blob:defect-photo');
  });

  it('shows error placeholder when request fails', async () => {
    api.defaults.adapter = (() => Promise.reject(new Error('Network error'))) as AxiosAdapter;
    render(
      <AuthenticatedMedia
        src="/api/v1/inspections/i1/evidence/e3/content"
        alt="unavailable"
        contentType="video/mp4"
      />,
    );

    expect(await screen.findByText('Could not load preview')).not.toBeNull();
  });
});
