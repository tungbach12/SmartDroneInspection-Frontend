import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, postWithBrowserCsrf } from './client';

describe('postWithBrowserCsrf', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends Spring’s CSRF response token in its declared header before the POST', async () => {
    const get = vi
      .spyOn(api, 'get')
      .mockResolvedValue({
        data: { headerName: 'X-XSRF-TOKEN', token: 'masked-csrf-token' },
      } as never);
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { ok: true } } as never);

    await postWithBrowserCsrf('/auth/login', { email: 'user@example.com' }, 4_000);

    expect(get).toHaveBeenCalledWith('/auth/csrf', { timeout: 4_000 });
    expect(post).toHaveBeenCalledWith(
      '/auth/login',
      { email: 'user@example.com' },
      {
        timeout: 4_000,
        withXSRFToken: false,
        headers: { 'X-XSRF-TOKEN': 'masked-csrf-token' },
      },
    );
    expect(get.mock.invocationCallOrder[0]).toBeLessThan(
      post.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER,
    );
  });

  it('uses the safe default header and rejects a missing token', async () => {
    const get = vi.spyOn(api, 'get');
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: undefined } as never);
    get.mockResolvedValueOnce({ data: { token: 'csrf-token' } } as never);

    await postWithBrowserCsrf('/auth/logout');
    expect(post).toHaveBeenCalledWith(
      '/auth/logout',
      undefined,
      expect.objectContaining({
        headers: { 'X-XSRF-TOKEN': 'csrf-token' },
      }),
    );

    get.mockResolvedValueOnce({ data: { token: '' } } as never);
    await expect(postWithBrowserCsrf('/auth/logout')).rejects.toThrow(
      'The server did not provide a CSRF token.',
    );
    expect(post).toHaveBeenCalledTimes(1);
  });
});
