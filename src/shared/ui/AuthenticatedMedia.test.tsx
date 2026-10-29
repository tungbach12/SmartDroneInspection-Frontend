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
  it('renders an interactive video element with controls when contentType is video/mp4', async () => {
    let requestConfig: InternalAxiosRequestConfig | undefined;
    const responseBlob = new Blob(['video-bytes'], { type: 'video/mp4' });
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
    URL.createObjectURL = vi.fn().mockReturnValue('blob:flight-video');
    URL.revokeObjectURL = vi.fn();
    useAuthStore.setState({ accessToken: 'manager-access-token' });

    const { unmount } = render(
      <AuthenticatedMedia
        src="/api/v1/inspections/i1/evidence/e1/content"
        alt="drone flight video"
        contentType="video/mp4"
      />,
    );
    await flushMediaRequest();

    expect(requestConfig?.url).toBe('/inspections/i1/evidence/e1/content');
    expect(requestConfig?.headers.Authorization).toBe('Bearer manager-access-token');
    expect(requestConfig?.responseType).toBe('blob');

    const videoElement = screen.getByLabelText('drone flight video') as HTMLVideoElement;
    expect(videoElement.tagName.toLowerCase()).toBe('video');
    expect(videoElement.controls).toBe(true);
    expect(videoElement.getAttribute('src')).toBe('blob:flight-video');

    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:flight-video');
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
