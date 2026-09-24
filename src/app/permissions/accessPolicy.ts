import type { Role } from '@/features/auth/store/authStore';

export const PORTAL_ROLE_ACCESS = {
  admin: ['ADMIN'],
  client: ['CLIENT'],
  operations: ['SERVICE_MANAGER', 'INSPECTOR', 'MAINTENANCE_ENGINEER'],
} as const satisfies Record<string, readonly Role[]>;

export type PortalId = keyof typeof PORTAL_ROLE_ACCESS;

export const PORTAL_IDS = Object.keys(PORTAL_ROLE_ACCESS) as PortalId[];

export const PORTAL_CONFIG = {
  admin: { label: 'Admin workspace', path: '/admin' },
  client: { label: 'Client workspace', path: '/client' },
  operations: { label: 'Operations workspace', path: '/operations' },
} as const satisfies Record<PortalId, { label: string; path: string }>;

export const SECTION_IDS = [
  'dashboard',
  'assets',
  'inspections',
  'reports',
  'maintenance',
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

export const SECTION_LABELS: Record<SectionId, string> = {
  dashboard: 'Dashboard',
  assets: 'Assets',
  inspections: 'Inspections',
  reports: 'Reports',
  maintenance: 'Maintenance',
};

const SECTION_ROLE_ACCESS = {
  admin: {
    dashboard: ['ADMIN'],
    assets: ['ADMIN'],
    inspections: ['ADMIN'],
    reports: ['ADMIN'],
    maintenance: ['ADMIN'],
  },
  client: {
    dashboard: ['CLIENT'],
    assets: ['CLIENT'],
    inspections: ['CLIENT'],
    reports: ['CLIENT'],
    maintenance: ['CLIENT'],
  },
  operations: {
    dashboard: ['SERVICE_MANAGER', 'INSPECTOR', 'MAINTENANCE_ENGINEER'],
    assets: [],
    inspections: ['SERVICE_MANAGER', 'INSPECTOR'],
    reports: ['SERVICE_MANAGER', 'INSPECTOR'],
    maintenance: ['SERVICE_MANAGER', 'MAINTENANCE_ENGINEER'],
  },
} as const satisfies Record<
  PortalId,
  Record<SectionId, readonly Role[]>
>;

export function hasAnyRole(
  userRoles: readonly Role[],
  requiredRoles: readonly Role[],
): boolean {
  return requiredRoles.some((role) => userRoles.includes(role));
}

export function canAccessPortal(
  portal: PortalId,
  userRoles: readonly Role[],
): boolean {
  return hasAnyRole(userRoles, PORTAL_ROLE_ACCESS[portal]);
}

export function getPortalRoles(portal: PortalId): readonly Role[] {
  return PORTAL_ROLE_ACCESS[portal];
}

export function canAccessSection(
  portal: PortalId,
  section: SectionId,
  userRoles: readonly Role[],
): boolean {
  return hasAnyRole(userRoles, SECTION_ROLE_ACCESS[portal][section]);
}

export function getSectionRoles(
  portal: PortalId,
  section: SectionId,
): readonly Role[] {
  return SECTION_ROLE_ACCESS[portal][section];
}

export function getAvailablePortals(
  userRoles: readonly Role[],
): PortalId[] {
  return PORTAL_IDS.filter((portal) => canAccessPortal(portal, userRoles));
}

export function getSectionPath(
  portal: PortalId,
  section: SectionId,
): string {
  return `${PORTAL_CONFIG[portal].path}/${section}`;
}

export function getPortalEntryPath(userRoles: readonly Role[]): string {
  const availablePortals = getAvailablePortals(userRoles);

  if (availablePortals.length === 0) {
    return '/forbidden';
  }

  if (availablePortals.length > 1) {
    return '/portals';
  }

  const portal = availablePortals[0];
  return portal ? getSectionPath(portal, 'dashboard') : '/forbidden';
}

export function getLegacySectionRedirectPath(
  userRoles: readonly Role[],
  section: SectionId,
): string {
  const accessiblePortals = getAvailablePortals(userRoles).filter((portal) =>
    canAccessSection(portal, section, userRoles),
  );

  if (accessiblePortals.length === 0) {
    return '/forbidden';
  }

  if (accessiblePortals.length > 1) {
    return `/portals?section=${section}`;
  }

  const portal = accessiblePortals[0];
  return portal ? getSectionPath(portal, section) : '/forbidden';
}

export function isSectionId(value: string | null): value is SectionId {
  return SECTION_IDS.some((section) => section === value);
}
