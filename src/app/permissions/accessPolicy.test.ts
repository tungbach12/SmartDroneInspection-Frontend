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
  'ORG_ADMIN',
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
    'asset-catalog': ['ADMIN'],
    'asset-review': [],
    inspections: ['ADMIN'],
    reports: ['ADMIN'],
    maintenance: ['ADMIN'],
  },
  client: {
    dashboard: ['ORG_ADMIN'],
    assets: ['ORG_ADMIN'],
    'asset-catalog': [],
    'asset-review': [],
    inspections: ['ORG_ADMIN'],
    reports: ['ORG_ADMIN'],
    maintenance: ['ORG_ADMIN'],
  },
  operations: {
    dashboard: ['INSPECTOR', 'MAINTENANCE_ENGINEER'],
    assets: [],
    'asset-catalog': [],
    'asset-review': [],
    inspections: ['INSPECTOR'],
    reports: ['INSPECTOR'],
    maintenance: ['MAINTENANCE_ENGINEER'],
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

  it('routes each canonical user role to its matching portal entry', () => {
    expect(getPortalEntryPath(['ORG_ADMIN'])).toBe('/client/dashboard');
    expect(getPortalEntryPath(['INSPECTOR'])).toBe('/operations/dashboard');
    expect(getPortalEntryPath(['MAINTENANCE_ENGINEER'])).toBe(
      '/operations/dashboard',
    );
    expect(getPortalEntryPath(['ADMIN'])).toBe('/admin/dashboard');
  });

  it('offers a portal choice when the user has roles in multiple portals', () => {
    expect(getAvailablePortals(['ORG_ADMIN', 'INSPECTOR'])).toEqual([
      'client',
      'operations',
    ]);
    expect(getPortalEntryPath(['ORG_ADMIN', 'INSPECTOR'])).toBe('/portals');
  });

  it('redirects legacy section URLs to an allowed portal or the portal chooser', () => {
    expect(getLegacySectionRedirectPath(['ORG_ADMIN'], 'assets')).toBe(
      '/client/assets',
    );
    expect(
      getLegacySectionRedirectPath(['ORG_ADMIN', 'INSPECTOR'], 'inspections'),
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
