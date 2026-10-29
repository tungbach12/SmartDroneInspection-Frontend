import { api } from '@/shared/api/client';

/**
 * The roles an organization manager may grant to a workforce member.
 *
 * ADMIN and CUSTOMER are absent on purpose: those accounts are administrator-managed, so an
 * CUSTOMER cannot create or promote another privileged account. The backend remains the
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
 * tenant from the authenticated CUSTOMER, and a client-supplied scope could only ever widen it.
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

export const workforceKeys = {
  all: ['workforce'] as const,
  users: () => [...workforceKeys.all, 'users'] as const,
};

export const workforceApi = {
  listUsers: () => api.get<WorkforceUser[]>('/workforce/users').then((r) => r.data),

  provisionUser: (input: ProvisionWorkforceUserInput) =>
    api.post<ProvisionedWorkforceUser>('/workforce/users', input).then((r) => r.data),

  updateUserStatus: (userId: string, input: UpdateWorkforceUserStatusInput) =>
    api.patch<WorkforceUser>(`/workforce/users/${userId}/status`, input).then((r) => r.data),

  updateUserRoles: (userId: string, input: UpdateWorkforceUserRolesInput) =>
    api.put<WorkforceUser>(`/workforce/users/${userId}/roles`, input).then((r) => r.data),
};
