import axios, {
  AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { useAuthStore } from '@/features/auth/store/authStore';

interface AuthenticatedRefreshResponse {
  step: 'AUTHENTICATED';
  accessToken: string;
  user: NonNullable<ReturnType<typeof useAuthStore.getState>['user']>;
}

const NO_REFRESH_ENDPOINTS = [
  '/auth/csrf',
  '/auth/login',
  '/auth/register',
  '/auth/password/setup',
  '/auth/refresh',
];

const NO_BEARER_ENDPOINTS = [
  '/auth/csrf',
  '/auth/login',
  '/auth/register',
  '/auth/password/setup',
  '/auth/refresh',
];

interface CsrfResponse {
  headerName?: unknown;
  token?: unknown;
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  timeout: 30_000,
  withCredentials: true,
  withXSRFToken: false,
});

let refreshPromise: Promise<string> | null = null;

export function withBrowserRefreshLock<T>(
  operation: () => Promise<T>,
): Promise<T> {
  if (typeof navigator === 'undefined' || !navigator.locks) {
    return operation();
  }

  return navigator.locks.request('sdi-browser-auth-refresh', () => operation());
}

export async function postWithBrowserCsrf<TResponse = unknown>(
  url: string,
  body?: unknown,
  timeout = 30_000,
): Promise<AxiosResponse<TResponse>> {
  const { data } = await api.get<CsrfResponse>('/auth/csrf', { timeout });
  if (typeof data.token !== 'string' || data.token.length === 0) {
    throw new Error('The server did not provide a CSRF token.');
  }

  const headerName =
    data.headerName === 'X-CSRF-TOKEN' ||
    data.headerName === 'X-XSRF-TOKEN'
      ? data.headerName
      : 'X-XSRF-TOKEN';

  return api.post<TResponse>(url, body, {
    timeout,
    withXSRFToken: false,
    headers: { [headerName]: data.token },
  });
}

function shouldSkipAutomaticRefresh(url: string | undefined): boolean {
  if (!url) {
    return false;
  }

  const path = url.split('?')[0]?.replace(/\/$/, '') ?? '';
  return NO_REFRESH_ENDPOINTS.some(
    (endpoint) => path === endpoint || path.endsWith(endpoint),
  );
}

function shouldSkipBearerToken(url: string | undefined): boolean {
  if (!url) {
    return false;
  }

  const path = url.split('?')[0]?.replace(/\/$/, '') ?? '';
  return NO_BEARER_ENDPOINTS.some(
    (endpoint) => path === endpoint || path.endsWith(endpoint),
  );
}

function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = withBrowserRefreshLock(async () => {
      const { data } = await postWithBrowserCsrf<AuthenticatedRefreshResponse>(
        '/auth/refresh',
        undefined,
        5_000,
      );
      if (
        data.step !== 'AUTHENTICATED' ||
        typeof data.accessToken !== 'string' ||
        !data.user
      ) {
        throw new Error('The refresh response is incomplete.');
      }
      useAuthStore.getState().setSession({
        accessToken: data.accessToken,
        user: data.user,
      });
      return data.accessToken;
    }).finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

function redirectToLogin(): void {
  const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (currentPath === '/login' || currentPath.startsWith('/login?')) {
    return;
  }
  window.location.assign(`/login?returnTo=${encodeURIComponent(currentPath)}`);
}

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token && !shouldSkipBearerToken(config.url)) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    if (
      error.response?.status !== 401 ||
      !original ||
      original._retry ||
      shouldSkipAutomaticRefresh(original.url)
    ) {
      return Promise.reject(error);
    }

    original._retry = true;

    try {
      const accessToken = await refreshAccessToken();
      original.headers.Authorization = `Bearer ${accessToken}`;
      return api(original);
    } catch (refreshError) {
      useAuthStore.getState().clearSession();
      redirectToLogin();
      return Promise.reject(refreshError);
    }
  },
);
