import { describe, expect, it } from 'vitest';
import { canPerform, type Capability } from './capability';
import type { AuthUser } from '@/features/auth/store/authStore';

function makeUser(roles: AuthUser['roles']): AuthUser {
  return {
    id: 'user-1',
    email: 'user@example.test',
    fullName: 'User',
    roles,
    actorZone: roles.includes('ADMIN') ? 'PLATFORM' : 'CUSTOMER_ORGANIZATION',
    organizationId: roles.includes('ORG_ADMIN') ? 'org-1' : null,
  };
}

describe('canPerform capability gate', () => {
  it('does not enable report actions without an inspection/report workflow contract', () => {
    expect(canPerform('reports.submit', makeUser(['INSPECTOR']))).toBe(false);
    expect(canPerform('reports.release', makeUser(['ORG_ADMIN']))).toBe(false);
    expect(canPerform('reports.decide', makeUser(['ORG_ADMIN']))).toBe(false);
  });

  it('allows organization admins to review their organization assets', () => {
    expect(canPerform('assets.review', makeUser(['ORG_ADMIN']))).toBe(true);
    expect(canPerform('assets.review', makeUser(['ADMIN']))).toBe(false);
    expect(canPerform('assets.review', makeUser(['INSPECTOR']))).toBe(false);
  });

  it('fails closed for missing user or unknown capability', () => {
    expect(canPerform('reports.submit', null)).toBe(false);
    expect(canPerform('reports.submit', undefined)).toBe(false);
    expect(
      canPerform('reports.delete' as Capability, makeUser(['ADMIN'])),
    ).toBe(false);
  });
});
