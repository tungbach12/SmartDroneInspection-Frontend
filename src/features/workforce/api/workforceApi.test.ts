import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import { api } from '@/shared/api/client';
import { GRANTABLE_WORKFORCE_ROLES, workforceApi, type WorkforceUser } from './workforceApi';

const MEMBER: WorkforceUser = {
  userId: '3f1d6c3e-2a54-4a1f-9c0e-7a2b5d6e8f10',
  email: 'ivy.inspector@example.test',
  fullName: 'Ivy Inspector',
  roles: ['INSPECTOR'],
  status: 'ACTIVE',
  organizationId: '9a2f7d61-4c0b-4c6a-8f31-2b8c4d1e5a77',
};

describe('workforceApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists the organization workforce from the users endpoint', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [MEMBER] });

    await expect(workforceApi.listUsers()).resolves.toEqual([MEMBER]);
    expect(api.get).toHaveBeenCalledWith('/workforce/users');
  });

  it('provisions a member and returns the one-time temporary password', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { user: MEMBER, temporaryPassword: 'Temp-Password-1' },
    });

    await expect(
      workforceApi.provisionUser({
        email: 'ivy.inspector@example.test',
        fullName: 'Ivy Inspector',
        roles: ['INSPECTOR'],
      }),
    ).resolves.toEqual({ user: MEMBER, temporaryPassword: 'Temp-Password-1' });
    expect(api.post).toHaveBeenCalledWith('/workforce/users', {
      email: 'ivy.inspector@example.test',
      fullName: 'Ivy Inspector',
      roles: ['INSPECTOR'],
    });
  });

  it('never sends organizationId when provisioning', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { user: MEMBER, temporaryPassword: 'Temp-1' } });

    await workforceApi.provisionUser({
      email: 'ivy.inspector@example.test',
      fullName: 'Ivy Inspector',
      roles: ['INSPECTOR', 'MAINTENANCE_ENGINEER'],
    });

    // The backend derives the tenant from the authenticated ORG_ADMIN, so the organization is never
    // a request field — sending one would be a scope the client has no authority to widen.
    const body = vi.mocked(api.post).mock.calls[0]![1] as Record<string, unknown>;
    expect(body).not.toHaveProperty('organizationId');
  });

  it('updates a member status through the status sub-resource', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: { ...MEMBER, status: 'SUSPENDED' } });

    await expect(
      workforceApi.updateUserStatus(MEMBER.userId, { status: 'SUSPENDED' }),
    ).resolves.toEqual({ ...MEMBER, status: 'SUSPENDED' });
    expect(api.patch).toHaveBeenCalledWith(`/workforce/users/${MEMBER.userId}/status`, {
      status: 'SUSPENDED',
    });

    const body = vi.mocked(api.patch).mock.calls[0]![1] as Record<string, unknown>;
    expect(body).not.toHaveProperty('organizationId');
  });

  it('lists organization workforce credentials from the credentials endpoint', async () => {
    const credential = {
      id: 'cred-1',
      userId: MEMBER.userId,
      organizationId: MEMBER.organizationId,
      credentialType: 'PILOT_LICENSE',
      issuer: null,
      credentialReference: null,
      issuedAt: null,
      expiresAt: '2026-12-31T00:00:00Z',
      status: 'EXPIRING_SOON',
      evidenceId: null,
      verifiedByUserId: null,
      verifiedAt: null,
      verificationReason: null,
      createdAt: '2026-10-12T00:00:00Z',
      updatedAt: '2026-10-12T00:00:00Z',
    };
    vi.mocked(api.get).mockResolvedValue({ data: [credential] });

    await expect(workforceApi.listCredentials()).resolves.toEqual([credential]);
    expect(api.get).toHaveBeenCalledWith('/workforce/credentials');
  });

  it('creates credentials with ISO instant dates and optional evidence reference only', async () => {
    const credential = { id: 'cred-1', userId: MEMBER.userId };
    vi.mocked(api.post).mockResolvedValue({ data: credential });
    const input = {
      userId: MEMBER.userId,
      credentialType: 'PILOT_LICENSE',
      issuer: 'Aviation Authority',
      issuedAt: new Date('2026-01-01T12:30:00.000Z'),
      expiresAt: new Date('2026-12-31T12:30:00.000Z'),
    };

    await expect(workforceApi.createCredential(input)).resolves.toEqual(credential);
    expect(api.post).toHaveBeenCalledWith('/workforce/credentials', {
      ...input,
      issuedAt: '2026-01-01T12:30:00.000Z',
      expiresAt: '2026-12-31T12:30:00.000Z',
    });
    expect(JSON.stringify(vi.mocked(api.post).mock.calls[0]?.[1])).not.toContain('evidenceId');
    expect(JSON.stringify(vi.mocked(api.post).mock.calls[0]?.[1])).not.toContain('organizationId');
  });

  it('sends an optional evidence reference when supplied without organization scope', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} });

    await workforceApi.createCredential({
      userId: MEMBER.userId,
      credentialType: 'PILOT_LICENSE',
      evidenceId: 'evidence-reference-1',
    });

    expect(api.post).toHaveBeenCalledWith('/workforce/credentials', {
      userId: MEMBER.userId,
      credentialType: 'PILOT_LICENSE',
      evidenceId: 'evidence-reference-1',
    });
    expect(vi.mocked(api.post).mock.calls[0]?.[1]).not.toHaveProperty('organizationId');
  });

  it('reviews credentials at the review endpoint', async () => {
    vi.mocked(api.put).mockResolvedValue({ data: { id: 'cred-1' } });

    await workforceApi.reviewCredential('cred-1', { decision: 'REJECT', reason: 'Document expired' });

    expect(api.put).toHaveBeenCalledWith('/workforce/credentials/cred-1/review', {
      decision: 'REJECT',
      reason: 'Document expired',
    });
  });

  it('updates member roles through the roles sub-resource', async () => {
    vi.mocked(api.put).mockResolvedValue({
      data: { ...MEMBER, roles: ['INSPECTOR', 'MAINTENANCE_ENGINEER'] },
    });

    await expect(
      workforceApi.updateUserRoles(MEMBER.userId, {
        roles: ['INSPECTOR', 'MAINTENANCE_ENGINEER'],
      }),
    ).resolves.toEqual({ ...MEMBER, roles: ['INSPECTOR', 'MAINTENANCE_ENGINEER'] });
    expect(api.put).toHaveBeenCalledWith(`/workforce/users/${MEMBER.userId}/roles`, {
      roles: ['INSPECTOR', 'MAINTENANCE_ENGINEER'],
    });

    const body = vi.mocked(api.put).mock.calls[0]![1] as Record<string, unknown>;
    expect(body).not.toHaveProperty('organizationId');
  });
});

describe('grantable workforce roles', () => {
  it('offers only the two workforce roles an organization administrator may grant', () => {
    // ADMIN and ORG_ADMIN are deliberately absent: they are administrator-managed accounts, not
    // workforce members an organization administrator can provision.
    expect([...GRANTABLE_WORKFORCE_ROLES]).toEqual(['INSPECTOR', 'MAINTENANCE_ENGINEER']);
    expect(GRANTABLE_WORKFORCE_ROLES).not.toContain('ADMIN');
    expect(GRANTABLE_WORKFORCE_ROLES).not.toContain('ORG_ADMIN');
  });
});