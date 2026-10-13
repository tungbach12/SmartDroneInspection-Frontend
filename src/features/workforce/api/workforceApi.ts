import { api } from '@/shared/api/client';

/**
 * The roles an organization administrator may grant to a workforce member.
 *
 * ADMIN and ORG_ADMIN are absent on purpose: those accounts are administrator-managed, so an
 * ORG_ADMIN cannot create or promote another privileged account. The backend remains the
 * enforcement boundary — this list only keeps the UI from offering a request it knows is refused.
 */
export const GRANTABLE_WORKFORCE_ROLES = [
  'INSPECTOR',
  'MAINTENANCE_ENGINEER',
] as const;

export type GrantableWorkforceRole = (typeof GRANTABLE_WORKFORCE_ROLES)[number];

/** Mirrors the backend `UserStatus` vocabulary for an organization workforce member. */
export const WORKFORCE_USER_STATUSES = ['ACTIVE', 'SUSPENDED', 'DISABLED'] as const;

export type WorkforceUserStatus = (typeof WORKFORCE_USER_STATUSES)[number];

/** Organization-scoped workforce projection. It carries no credential of any kind. */
export interface WorkforceUser {
  userId: string;
  email: string;
  fullName: string;
  roles: string[];
  status: string;
  organizationId: string;
}

/**
 * Creation-only response carrying the one-time temporary password.
 *
 * The password is returned by exactly one operation and is never retrievable again, so it must
 * travel to the operator through the dialog that shows it and nowhere else.
 */
export interface ProvisionedWorkforceUser {
  user: WorkforceUser;
  temporaryPassword: string;
}

/**
 * The organization is never a request field on any of these operations: the backend derives the
 * tenant from the authenticated ORG_ADMIN, and a client-supplied scope could only ever widen it.
 */
export interface ProvisionWorkforceUserInput {
  email: string;
  fullName: string;
  roles: GrantableWorkforceRole[];
}

export interface UpdateWorkforceUserStatusInput {
  status: WorkforceUserStatus;
}

export interface UpdateWorkforceUserRolesInput {
  roles: GrantableWorkforceRole[];
}

export const WORKFORCE_CREDENTIAL_STATUSES = [
  'DRAFT',
  'PENDING_REVIEW',
  'ACTIVE',
  'EXPIRING_SOON',
  'EXPIRED',
  'REJECTED',
  'SUSPENDED',
] as const;

export type WorkforceCredentialStatus = (typeof WORKFORCE_CREDENTIAL_STATUSES)[number];

export interface WorkforceCredential {
  id: string;
  userId: string;
  organizationId: string;
  credentialType: string;
  issuer: string | null;
  credentialReference: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  status: WorkforceCredentialStatus;
  evidenceId: string | null;
  verifiedByUserId: string | null;
  verifiedAt: string | null;
  verificationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkforceCredentialInput {
  userId: string;
  credentialType: string;
  issuer?: string;
  credentialReference?: string;
  issuedAt?: Date;
  expiresAt?: Date;
  evidenceId?: string;
}

export interface ReviewWorkforceCredentialInput {
  decision: 'APPROVE' | 'REJECT';
  reason: string;
}

export const workforceKeys = {
  all: ['workforce'] as const,
  users: () => [...workforceKeys.all, 'users'] as const,
  credentials: () => [...workforceKeys.all, 'credentials'] as const,
};

export const workforceApi = {
  listUsers: () => api.get<WorkforceUser[]>('/workforce/users').then((r) => r.data),

  provisionUser: (input: ProvisionWorkforceUserInput) =>
    api.post<ProvisionedWorkforceUser>('/workforce/users', input).then((r) => r.data),

  updateUserStatus: (userId: string, input: UpdateWorkforceUserStatusInput) =>
    api.patch<WorkforceUser>(`/workforce/users/${userId}/status`, input).then((r) => r.data),

  updateUserRoles: (userId: string, input: UpdateWorkforceUserRolesInput) =>
    api.put<WorkforceUser>(`/workforce/users/${userId}/roles`, input).then((r) => r.data),

  listCredentials: () =>
    api.get<WorkforceCredential[]>('/workforce/credentials').then((r) => r.data),

  createCredential: (input: CreateWorkforceCredentialInput) => {
    const body = {
      ...input,
      ...(input.issuedAt ? { issuedAt: input.issuedAt.toISOString() } : {}),
      ...(input.expiresAt ? { expiresAt: input.expiresAt.toISOString() } : {}),
    };
    return api.post<WorkforceCredential>('/workforce/credentials', body).then((r) => r.data);
  },

  reviewCredential: (credentialId: string, input: ReviewWorkforceCredentialInput) =>
    api.put<WorkforceCredential>(
      `/workforce/credentials/${credentialId}/review`,
      input,
    ).then((r) => r.data),
};