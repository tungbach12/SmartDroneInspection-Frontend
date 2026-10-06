import { describe, expect, it } from 'vitest';
import { canPerform } from './capability';
import type { AuthUser } from '@/features/auth/store/authStore';

function makeUser(roles: AuthUser['roles']): AuthUser {
  return {
    id: 'user-1',
    email: 'user@example.test',
    fullName: 'User',
    roles,
    actorZone: 'SERVICE_WORKFORCE',
    organizationId: null,
    providerId: null,
  };
}

describe('canPerform capability gate', () => {
  it('allows a report author-role Inspector to submit for review', () => {
    expect(canPerform('reports.submit', makeUser(['INSPECTOR']))).toBe(true);
  });

  it('denied report release for a non-manager', () => {
    expect(canPerform('reports.release', makeUser(['INSPECTOR']))).toBe(false);
    expect(canPerform('reports.release', makeUser(['PROVIDER_MANAGER']))).toBe(true);
  });

  it('allows provider manager and platform operator to review assets', () => {
    expect(canPerform('assets.review', makeUser(['PROVIDER_MANAGER']))).toBe(true);
    expect(canPerform('assets.review', makeUser(['PLATFORM_OPERATOR']))).toBe(true);
    expect(canPerform('assets.review', makeUser(['INSPECTOR']))).toBe(false);
  });

  it('fails closed for missing user or unknown capability', () => {
    expect(canPerform('reports.submit', null)).toBe(false);
    expect(canPerform('reports.submit', undefined)).toBe(false);
    // @ts-expect-error unknown capability must not throw and must deny
    expect(canPerform('reports.delete', makeUser(['PLATFORM_ADMIN']))).toBe(false);
  });
});
