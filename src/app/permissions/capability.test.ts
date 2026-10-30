import { describe, expect, it } from 'vitest';
import type { AuthUser, Role } from '@/features/auth/store/authStore';
import { canPerform, type Capability } from './capability';

function makeUser(roles: Role[]): AuthUser {
  return {
    id: 'user-1',
    email: 'user@example.test',
    fullName: 'Test User',
    roles,
    actorZone: 'CUSTOMER_ORGANIZATION',
    organizationId: 'org-1',
  };
}

describe('canPerform capability gate', () => {
  it('maps report author and reviewer actions to the Report 3 MF3 roles', () => {
    expect(canPerform('inspections.authorReport', makeUser(['INSPECTOR']))).toBe(true);
    expect(canPerform('inspections.authorReport', makeUser(['ORG_MANAGER']))).toBe(false);

    // MF3-09: a qualified ORG_MANAGER reviews and publishes; the Inspector never does.
    expect(canPerform('reports.review', makeUser(['ORG_MANAGER']))).toBe(true);
    expect(canPerform('reports.review', makeUser(['INSPECTOR']))).toBe(false);
    expect(canPerform('reports.publish', makeUser(['ORG_MANAGER']))).toBe(true);
    expect(canPerform('reports.publish', makeUser(['INSPECTOR']))).toBe(false);
    expect(canPerform('findings.decide', makeUser(['ORG_MANAGER']))).toBe(true);
  });

  it('allows organization manager, platform manager, and admin to review organization assets', () => {
    expect(canPerform('assets.review', makeUser(['ORG_MANAGER']))).toBe(true);
    expect(canPerform('assets.review', makeUser(['ADMIN']))).toBe(true);
    expect(canPerform('assets.review', makeUser(['PLATFORM_MANAGER']))).toBe(true);
    expect(canPerform('assets.review', makeUser(['INSPECTOR']))).toBe(false);
  });

  it('denies every capability when there is no authenticated user', () => {
    expect(canPerform('reports.review', null)).toBe(false);
    expect(canPerform('reports.review', undefined)).toBe(false);
  });

  it('denies an unknown capability even for a privileged role', () => {
    expect(canPerform('reports.delete' as Capability, makeUser(['ADMIN']))).toBe(false);
  });
});