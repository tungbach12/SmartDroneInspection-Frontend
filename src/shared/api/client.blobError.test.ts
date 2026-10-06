import {
  AxiosError,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { describe, expect, it } from 'vitest';
import { api } from './client';
import { getErrorMessage } from './errorMessage';

const FORBIDDEN_PROBLEM = {
  type: 'about:blank',
  title: 'Forbidden',
  status: 403,
  detail: 'No organization scope',
  code: 'FORBIDDEN',
  instance: '/api/v1/assets/a1/documents/d1/content',
};

/**
 * F-4: a blob download whose failure is what the server actually sends.
 *
 * The transport answers the way the browser's XMLHttpRequest does — a failed status arrives as a
 * rejected AxiosError whose body is a Blob of raw bytes, a success arrives as a Blob. It is an
 * adapter rather than a live socket because jsdom's XMLHttpRequest cannot open one; everything under
 * test is the shared client's own rejection path and getErrorMessage, not the socket.
 */
const browserLikeTransport = ((config: InternalAxiosRequestConfig) => {
  if (config.url === '/ok') {
    return Promise.resolve<AxiosResponse>({
      data: new Blob(['%PDF-1.7'], { type: 'application/pdf' }),
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    });
  }

  return Promise.reject(
    new AxiosError(
      'Request failed with status code 403',
      AxiosError.ERR_BAD_RESPONSE,
      config,
      {},
      {
        data: new Blob([JSON.stringify(FORBIDDEN_PROBLEM)], {
          type: 'application/problem+json',
        }),
        status: 403,
        statusText: 'Forbidden',
        headers: {},
        config,
      },
    ),
  );
}) as unknown as AxiosAdapter;

describe('shared api client blob error handling', () => {
  it('surfaces the server detail for a blob request denied by the server', async () => {
    const error = await api
      .get('/denied', { adapter: browserLikeTransport, responseType: 'blob' })
      .then(() => undefined)
      .catch((caught: unknown) => caught);

    expect(error).toBeDefined();
    expect(getErrorMessage(error, 'Permission required.')).toBe('No organization scope');
  });

  it('leaves a successful blob response as the raw bytes the transport produced', async () => {
    const response = await api.get('/ok', { adapter: browserLikeTransport, responseType: 'blob' });

    expect(response.data).toBeInstanceOf(Blob);
    expect(await (response.data as Blob).text()).toBe('%PDF-1.7');
  });

  it('still reads the parsed body on the ordinary JSON failure path', async () => {
    // The regression this fixes must not come at the cost of the path non-WF1 screens rely on.
    const jsonTransport = ((config: InternalAxiosRequestConfig) =>
      Promise.reject(
        new AxiosError(
          'Request failed with status code 409',
          AxiosError.ERR_BAD_RESPONSE,
          config,
          {},
          {
            data: { ...FORBIDDEN_PROBLEM, status: 409, detail: 'Asset already has an active schedule' },
            status: 409,
            statusText: 'Conflict',
            headers: {},
            config,
          },
        ),
      )) as unknown as AxiosAdapter;

    const error = await api
      .get('/conflict', { adapter: jsonTransport })
      .then(() => undefined)
      .catch((caught: unknown) => caught);

    expect(getErrorMessage(error, 'fallback')).toBe('Asset already has an active schedule');
  });
});