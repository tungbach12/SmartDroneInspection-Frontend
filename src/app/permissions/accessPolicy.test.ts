import { describe, expect, it } from 'vitest';
import type { Role } from '@/features/auth/store/authStore';
import {
  canAccessSection,
  getAvailablePortals,
  getLegacySectionRedirectPath,
  getPortalEntryPath,
  type PortalId,
  type SectionId,
} from './accessPolicy';

const allRoles: Role[] = [
  'ADMIN',
  'CLIENT',
  'SERVICE_MANAGER',
  'INSPECTOR',
  'MAINTENANCE_ENGINEER',
];

const expectedAccess: Record<
  PortalId,
  Record<SectionId, readonly Role[]>
> = {
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
};

describe('role-aware portal access policy', () => {
  it.each(
    Object.entries(expectedAccess).flatMap(([portal, sections]) =>
      Object.entries(sections).map(([section, allowedRoles]) => ({
        portal: portal as PortalId,
        section: section as SectionId,
        allowedRoles,
      })),
    ),
  )('$portal/$section matches the SRS screen-access matrix', ({
    portal,
    section,
    allowedRoles,
  }) => {
    const actualRoles = allRoles.filter((role) =>
      canAccessSection(portal, section, [role]),
    );

    expect(actualRoles).toEqual(allowedRoles);
  });

  it('routes a single-role user to the matching portal entry', () => {
    expect(getPortalEntryPath(['CLIENT'])).toBe('/client/dashboard');
    expect(getPortalEntryPath(['INSPECTOR'])).toBe('/operations/dashboard');
    expect(getPortalEntryPath(['ADMIN'])).toBe('/admin/dashboard');
  });

  it('offers a portal choice when the user has roles in multiple portals', () => {
    expect(getAvailablePortals(['CLIENT', 'INSPECTOR'])).toEqual([
      'client',
      'operations',
    ]);
    expect(getPortalEntryPath(['CLIENT', 'INSPECTOR'])).toBe('/portals');
  });

  it('redirects legacy section URLs to an allowed portal or the portal chooser', () => {
    expect(getLegacySectionRedirectPath(['CLIENT'], 'assets')).toBe(
      '/client/assets',
    );
    expect(
      getLegacySectionRedirectPath(['CLIENT', 'INSPECTOR'], 'inspections'),
    ).toBe('/portals?section=inspections');
    expect(
      getLegacySectionRedirectPath(['MAINTENANCE_ENGINEER'], 'assets'),
    ).toBe('/forbidden');
  });

  it('denies a user with no recognized portal role', () => {
    expect(getAvailablePortals([])).toEqual([]);
    expect(getPortalEntryPath([])).toBe('/forbidden');
  });
});
