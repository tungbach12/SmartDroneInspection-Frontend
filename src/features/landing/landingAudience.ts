import { getWorkspaceKind } from '@/features/auth/utils/domainPortal';

export const LANDING_PATHS = {
  customer: '/customer',
  inspector: '/inspector',
  staff: '/staff',
} as const;

export type LandingAudience = keyof typeof LANDING_PATHS;

export function getDedicatedLandingAudience(host: string): 'inspector' | 'staff' | null {
  const workspace = getWorkspaceKind(host);
  if (workspace === 'operations') return 'inspector';
  if (workspace === 'admin') return 'staff';
  return null;
}
