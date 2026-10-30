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
  'contracts.request': ['ORG_MANAGER'],
  'contracts.manage': ['PLATFORM_MANAGER'],
  'inspections.capture': ['INSPECTOR'],
  'inspections.authorReport': ['INSPECTOR'],
  // MF3-09: a qualified ORG_MANAGER decides findings and the report. The backend separately refuses a
  // reviewer who authored the report.
  'reports.review': ['ORG_MANAGER'],
  'reports.publish': ['ORG_MANAGER'],
  'findings.decide': ['ORG_MANAGER'],
  'assets.review': ['ORG_MANAGER'],
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