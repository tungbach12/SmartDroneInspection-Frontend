import { api } from '@/shared/api/client';

/**
 * Platform user administration.
 *
 * The platform administrator manages the accounts that are administrator-managed: platform
 * admins, and the Organization Admin of each customer workspace. The organization administrator
 * manages their own workforce through a separate contract; this one is the platform's.
 */

export type PlatformUserRole = 'ADMIN' | 'ORG_ADMIN' | 'INSPECTOR' | 'MAINTENANCE_ENGINEER';

export type PlatformUserStatus = 'ACTIVE' | 'SUSPENDED' | 'DISABLED';

export type ActorZone = 'PLATFORM' | 'CUSTOMER_ORGANIZATION';

export interface PlatformUser {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  actorZone: string;
  organizationId: string | null;
}

/**
 * Creation-only response carrying the one-time temporary password.
 *
 * The password is returned by exactly one operation and is never retrievable again, so it must
 * travel to the operator through the dialog that shows it and nowhere else.
 */
export interface ProvisionedPlatformUser {
  user: PlatformUser;
  temporaryPassword: string;
}

export interface CreatePlatformUserInput {
  email: string;
  fullName: string;
  actorZone: ActorZone;
  organizationId?: string | null;
  roles: PlatformUserRole[];
}

export interface UpdatePlatformUserRolesInput {
  actorZone: ActorZone;
  organizationId?: string | null;
  roles: PlatformUserRole[];
}

export interface UpdatePlatformUserStatusInput {
  status: PlatformUserStatus;
}

export const platformUserKeys = {
  all: ['platform-users'] as const,
};

export const platformUserApi = {
  list: () => api.get<PlatformUser[]>('/platform/users').then((r) => r.data),

  create: (input: CreatePlatformUserInput) =>
    api
      .post<ProvisionedPlatformUser>('/platform/users', input)
      .then((r) => r.data),

  resetPassword: (userId: string) =>
    api
      .post<ProvisionedPlatformUser>(`/platform/users/${userId}/reset-password`)
      .then((r) => r.data),

  updateRoles: (userId: string, input: UpdatePlatformUserRolesInput) =>
    api
      .put<PlatformUser>(`/platform/users/${userId}/roles`, input)
      .then((r) => r.data),

  updateStatus: (userId: string, input: UpdatePlatformUserStatusInput) =>
    api
      .patch<PlatformUser>(`/platform/users/${userId}/status`, input)
      .then((r) => r.data),
};
