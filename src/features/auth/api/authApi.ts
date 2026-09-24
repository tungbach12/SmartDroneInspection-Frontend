import { AxiosError } from 'axios';
import {
  postWithBrowserCsrf,
  withBrowserRefreshLock,
} from '@/shared/api/client';
import { isRole, type AuthUser, type Role } from '../store/authStore';

export type AuthStep = 'AUTHENTICATED' | 'PASSWORD_CHANGE_REQUIRED';

export interface AuthFlowResponse {
  step: AuthStep;
  accessToken: string | null;
  accessTokenExpiresInSeconds: number;
  user: AuthUser;
}

export interface ClientRegistrationRequest {
  email: string;
  fullName: string;
  organizationName: string;
  organizationCode: string;
  password: string;
}

interface ApiUser {
  id: string;
  email: string;
  fullName: string;
  roles: unknown;
  actorZone: string;
  organizationId: string | null;
}

interface ApiAuthFlow {
  step: unknown;
  accessToken: unknown;
  accessTokenExpiresInSeconds: unknown;
  user: unknown;
}

export interface ClientRegistrationResponse {
  organizationId: string;
  organizationName: string;
  organizationCode: string;
  user: AuthUser;
}

function parseUser(value: unknown): AuthUser {
  if (!value || typeof value !== 'object') {
    throw new Error('The server returned an invalid account profile.');
  }

  const user = value as ApiUser;
  if (
    typeof user.id !== 'string' ||
    typeof user.email !== 'string' ||
    typeof user.fullName !== 'string' ||
    typeof user.actorZone !== 'string' ||
    !Array.isArray(user.roles)
  ) {
    throw new Error('The server returned an invalid account profile.');
  }

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    roles: user.roles.filter(isRole) as Role[],
    actorZone: user.actorZone,
    organizationId:
      typeof user.organizationId === 'string' ? user.organizationId : null,
  };
}

function parseAuthFlow(value: unknown): AuthFlowResponse {
  if (!value || typeof value !== 'object') {
    throw new Error('The server returned an invalid authentication response.');
  }

  const flow = value as ApiAuthFlow;
  if (
    (flow.step !== 'AUTHENTICATED' &&
      flow.step !== 'PASSWORD_CHANGE_REQUIRED') ||
    (flow.accessToken !== null &&
      flow.accessToken !== undefined &&
      typeof flow.accessToken !== 'string') ||
    typeof flow.accessTokenExpiresInSeconds !== 'number'
  ) {
    throw new Error('The server returned an invalid authentication response.');
  }

  return {
    step: flow.step,
    accessToken: typeof flow.accessToken === 'string' ? flow.accessToken : null,
    accessTokenExpiresInSeconds: flow.accessTokenExpiresInSeconds,
    user: parseUser(flow.user),
  };
}

async function postAuthFlow(
  path: string,
  body?: unknown,
  timeout = 30_000,
): Promise<AuthFlowResponse> {
  const { data } = await postWithBrowserCsrf<unknown>(path, body, timeout);
  return parseAuthFlow(data);
}

export function login(email: string, password: string): Promise<AuthFlowResponse> {
  return postAuthFlow('/auth/login', { email, password });
}

export function completeInitialPasswordSetup(
  email: string,
  currentPassword: string,
  password: string,
): Promise<AuthFlowResponse> {
  return postAuthFlow('/auth/password/setup', {
    email,
    currentPassword,
    password,
  });
}

export async function restoreBrowserSession(): Promise<AuthFlowResponse> {
  return withBrowserRefreshLock(() =>
    postAuthFlow('/auth/refresh', undefined, 5_000),
  );
}

export async function registerClient(
  request: ClientRegistrationRequest,
): Promise<ClientRegistrationResponse> {
  const { data } = await postWithBrowserCsrf<{
    organizationId: string;
    organizationName: string;
    organizationCode: string;
    user: unknown;
  }>('/auth/register', request);

  return {
    organizationId: data.organizationId,
    organizationName: data.organizationName,
    organizationCode: data.organizationCode,
    user: parseUser(data.user),
  };
}

export async function logoutCurrentSession(): Promise<void> {
  await postWithBrowserCsrf('/auth/logout');
}

export async function logoutAllSessions(): Promise<void> {
  await postWithBrowserCsrf('/auth/logout-all');
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await postWithBrowserCsrf('/auth/password/change', {
    currentPassword,
    newPassword,
  });
}

export function getAuthErrorMessage(error: unknown): string {
  if (!(error instanceof AxiosError)) {
    return error instanceof Error
      ? error.message
      : 'Something went wrong. Please try again.';
  }

  const status = error.response?.status;
  const response = error.response?.data as
    | { detail?: unknown; code?: unknown }
    | undefined;

  if (status === 401) {
    return 'We could not sign you in with those details. Check your email and password.';
  }

  if (status === 429) {
    const retryAfter = error.response?.headers['retry-after'];
    const seconds = Number(retryAfter);
    return Number.isFinite(seconds) && seconds > 0
      ? `Too many attempts. Please wait ${seconds} seconds and try again.`
      : 'Too many attempts. Please wait a little while and try again.';
  }

  if (typeof response?.detail === 'string' && response.detail.trim()) {
    return response.detail;
  }

  if (status === 403) {
    return 'This account is not allowed to complete that action.';
  }

  if (status && status >= 500) {
    return 'The service is temporarily unavailable. Please try again shortly.';
  }

  return 'We could not complete that request. Check the information and try again.';
}
