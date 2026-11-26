import type { AuthUser, Role } from '@/features/auth/store/authStore';

/**
 * Navigation policy only. The backend stays the authorization authority: it enforces organization,
 * assignment and separation-of-duties scope that a route guard cannot see.
 */
export type Capability =
  | 'contracts.request'
  | 'contracts.manage'
  | 'inspections.capture'
  | 'inspections.authorReport'
  | 'reports.review'
  | 'reports.publish'
  | 'findings.decide'
  | 'assets.review';

const CAPABILITY_ROLES: Record<Capability, readonly Role[]> = {
  'contracts.request': ['CUSTOMER'],
  'contracts.manage': ['MANAGER'],
  'inspections.capture': ['INSPECTOR'],
  'inspections.authorReport': ['INSPECTOR'],
  // MF3-09: only Manager reviews and publishes reports. Admin is strictly read-only.
  // The backend separately enforces separation of duties against the report author.
  'reports.review': ['MANAGER'],
  'reports.publish': ['MANAGER'],
  'findings.decide': ['CUSTOMER', 'MANAGER'],
  'assets.review': ['CUSTOMER', 'ADMIN', 'MANAGER'],
};

export function canPerform(
  capability: Capability | string,
  user: AuthUser | null | undefined,
): boolean {
  if (!user || !Array.isArray(user.roles)) return false;
  const allowed = (CAPABILITY_ROLES as Record<string, readonly Role[]>)[capability];
  if (!allowed) return false;
  return allowed.some((role) => user.roles.includes(role));
}