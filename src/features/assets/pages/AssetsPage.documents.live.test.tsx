import {
  AxiosError,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/shared/api/client';

/**
 * F-4, observed where the user sees it.
 *
 * The drawer's document list and the streaming download both run through the real hooks and the real
 * shared `api` client. Only the socket is substituted, with an adapter that answers the way the
 * server does: a Problem Details body served as raw bytes, which is what arrives on a blob request
 * and is exactly what used to be lost. Asset rows are fixture data because no asset endpoint is
 * under test here.
 */
vi.mock('@/features/auth/store/authStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/auth/store/authStore')>();
  return {
    ...actual,
    useAuthStore: Object.assign(
      (selector: (state: unknown) => unknown) => selector({ roles: ['CLIENT'] }),
      { getState: () => ({ roles: ['CLIENT'], accessToken: 'token-1' }) },
    ),
  };
});

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));

vi.mock('../hooks/useAssets', () => ({
  useAssets: () => ({
    data: {
      items: [
        {
          id: 'a1',
          code: 'BR-1',
          name: 'North bridge',
          description: null,
          locationText: 'District 1',
          latitude: null,
          longitude: null,
          status: 'ACTIVE',
          categoryId: 'c1',
          createdAt: '2026-09-25T00:00:00Z',
        },
      ],
      page: 1,
      pageSize: 50,
      totalCount: 1,
      totalPages: 1,
    },
    isLoading: false,
  }),
  useCreateAsset: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
}));

vi.mock('../hooks/useCatalog', () => ({ useCategories: () => ({ data: [] }) }));

import { AssetsPage } from './AssetsPage';

const DOCUMENT = {
  id: 'd1',
  documentType: 'OWNERSHIP',
  fileName: 'deed.pdf',
  contentType: 'application/pdf',
  sizeBytes: 2048,
  checksumSha256: 'abc123',
  documentDate: null,
  createdAt: '2026-09-25T00:00:00Z',
};

const CONTENT_URL = '/assets/a1/documents/d1/content';
const requested: string[] = [];

const serverTransport = ((config: InternalAxiosRequestConfig) => {
  const url = config.url ?? '';
  requested.push(url);

  if (url.includes(CONTENT_URL)) {
    // Exactly what Spring's ProblemDetail handler emits for the 403 this endpoint raises, served as
    // the raw bytes axios delivers when the request asked for a blob.
    return Promise.reject(
      new AxiosError(
        'Request failed with status code 403',
        AxiosError.ERR_BAD_RESPONSE,
        config,
        {},
        {
          data: new Blob(
            [
              JSON.stringify({
                type: 'about:blank',
                title: 'Forbidden',
                status: 403,
                detail: 'No organization scope',
                code: 'FORBIDDEN',
                instance: `/api/v1${CONTENT_URL}`,
                traceId: 'trace-1',
              }),
            ],
            { type: 'application/problem+json' },
          ),
          status: 403,
          statusText: 'Forbidden',
          headers: {},
          config,
        },
      ),
    );
  }

  return Promise.resolve<AxiosResponse>({
    data: { success: true, message: 'Success', data: [DOCUMENT] },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  });
}) as unknown as AxiosAdapter;

describe('AssetsPage streaming a document the server refuses', () => {
  // exactOptionalPropertyTypes: only assign back a value axios actually had.
  const defaultAdapter: typeof api.defaults.adapter = api.defaults.adapter;

  beforeEach(() => {
    requested.length = 0;
    api.defaults.adapter = serverTransport;
    URL.createObjectURL = vi.fn().mockReturnValue('blob:stub');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    cleanup();
    if (defaultAdapter === undefined) {
      delete api.defaults.adapter;
    } else {
      api.defaults.adapter = defaultAdapter;
    }
    vi.restoreAllMocks();
  });

  function renderWithQueryClient(ui: ReactNode) {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
  }

  it('reports the server reason, not the transport placeholder, for a denied stream', async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockReturnValue();

    renderWithQueryClient(<AssetsPage />);
    (await screen.findByText('North bridge')).click();
    const open = await screen.findByRole('button', { name: /Open/ }, { timeout: 4000 });
    open.click();

    const alert = await screen.findByTestId('document-access-denied');
    await waitFor(() => expect(alert.textContent).toContain('No organization scope'));
    expect(alert.textContent).not.toContain('Request failed with status code 403');
    // the refusal was the server's, and it arrived on the content endpoint
    expect(requested.some((url) => url.includes(CONTENT_URL))).toBe(true);
    // nothing was handed to the browser, because no bytes were ever received
    expect(clickSpy).not.toHaveBeenCalled();
  });
});