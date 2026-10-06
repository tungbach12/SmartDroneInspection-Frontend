import type { AuthUser, Role } from '@/features/auth/store/authStore';

export type Capability =
  | 'reports.submit'
  | 'reports.release'
  | 'assets.review';

const CAPABILITY_ROLES: Record<Capability, readonly Role[]> = {
  'reports.submit': ['INSPECTOR'],
  'reports.release': ['PROVIDER_MANAGER'],
  'assets.review': ['PROVIDER_MANAGER', 'PLATFORM_OPERATOR'],
};

export function canPerform(
  capability: Capability,
  user: AuthUser | null | undefined,
): boolean {
  if (!user || !Array.isArray(user.roles)) return false;
  const allowed = (CAPABILITY_ROLES as Record<string, readonly Role[]>)[capability];
  if (!allowed) return false;
  return allowed.some((role) => user.roles.includes(role));
}
