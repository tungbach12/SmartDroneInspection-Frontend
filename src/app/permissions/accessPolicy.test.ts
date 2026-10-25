import { describe, expect, it } from 'vitest';
import type { Role } from '@/features/auth/store/authStore';
import {
  canAccessSection,
  getAvailablePortals,
  getLegacySectionRedirectPath,
  getPortalEntryPath,
  getSectionPath,
  type PortalId,
  type SectionId,
} from './accessPolicy';

const allRoles: Role[] = [
  'ADMIN',
  'PLATFORM_MANAGER',
  'ORG_MANAGER',
  'INSPECTOR',
  'MAINTENANCE_ENGINEER',
];

const expectedAccess: Record<
  PortalId,
  Record<SectionId, readonly Role[]>
> = {
  admin: {
    dashboard: ['ADMIN', 'PLATFORM_MANAGER'],
    assets: ['ADMIN', 'PLATFORM_MANAGER'],
    'asset-catalog': ['ADMIN'],
    'asset-review': [],
    inspections: ['ADMIN', 'PLATFORM_MANAGER'],
    reports: ['ADMIN', 'PLATFORM_MANAGER'],
    maintenance: ['ADMIN'],
    workforce: [],
    subscriptions: ['ADMIN', 'PLATFORM_MANAGER'],
    'drone-leasing': ['ADMIN', 'PLATFORM_MANAGER'],
    'platform-users': ['ADMIN'],
  },
  client: {
    dashboard: ['ORG_MANAGER'],
    assets: ['ORG_MANAGER'],
    'asset-catalog': [],
    'asset-review': [],
    inspections: ['ORG_MANAGER'],
    reports: ['ORG_MANAGER'],
    maintenance: ['ORG_MANAGER'],
    workforce: ['ORG_MANAGER'],
    subscriptions: ['ORG_MANAGER'],
    'drone-leasing': ['ORG_MANAGER'],
    'platform-users': [],
  },
  operations: {
    dashboard: ['INSPECTOR', 'MAINTENANCE_ENGINEER'],
    assets: [],
    'asset-catalog': [],
    'asset-review': [],
    inspections: ['INSPECTOR'],
    reports: ['INSPECTOR'],
    maintenance: ['MAINTENANCE_ENGINEER'],
    workforce: [],
    subscriptions: [],
    'drone-leasing': [],
    'platform-users': [],
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
    expect(getPortalEntryPath(['ORG_MANAGER'])).toBe('/client/dashboard');
    expect(getPortalEntryPath(['INSPECTOR'])).toBe('/operations/dashboard');
    expect(getPortalEntryPath(['MAINTENANCE_ENGINEER'])).toBe(
      '/operations/dashboard',
    );
    expect(getPortalEntryPath(['ADMIN'])).toBe('/admin/dashboard');
    expect(getPortalEntryPath(['PLATFORM_MANAGER'])).toBe('/admin/dashboard');
  });

  it('offers a portal choice when the user has roles in multiple portals', () => {
    expect(getAvailablePortals(['ORG_MANAGER', 'INSPECTOR'])).toEqual([
      'client',
      'operations',
    ]);
    expect(getPortalEntryPath(['ORG_MANAGER', 'INSPECTOR'])).toBe('/portals');
  });

  it('redirects legacy section URLs to an allowed portal or the portal chooser', () => {
    expect(getLegacySectionRedirectPath(['ORG_MANAGER'], 'assets')).toBe(
      '/client/assets',
    );
    expect(
      getLegacySectionRedirectPath(['ORG_MANAGER', 'INSPECTOR'], 'inspections'),
    ).toBe('/portals?section=inspections');
    expect(
      getLegacySectionRedirectPath(['MAINTENANCE_ENGINEER'], 'assets'),
    ).toBe('/forbidden');
  });

  it('sends Workforce navigation to an ORG_MANAGER path and denies the other roles', () => {
    expect(getSectionPath('client', 'workforce')).toBe('/client/workforce');
    expect(getLegacySectionRedirectPath(['ORG_MANAGER'], 'workforce')).toBe(
      '/client/workforce',
    );
    for (const role of ['ADMIN', 'PLATFORM_MANAGER', 'INSPECTOR', 'MAINTENANCE_ENGINEER'] as Role[]) {
      expect(getLegacySectionRedirectPath([role], 'workforce')).toBe('/forbidden');
    }
    // A session that is not an organization manager gets no Workforce entry even when it
    // already has another workspace.
    expect(
      getLegacySectionRedirectPath(['INSPECTOR', 'MAINTENANCE_ENGINEER'], 'workforce'),
    ).toBe('/forbidden');
    // Holding ORG_MANAGER alongside a second role must still resolve to the client path rather than
    // the portal chooser, because the operations workspace grants no role here.
    expect(
      getLegacySectionRedirectPath(['ORG_MANAGER', 'INSPECTOR'], 'workforce'),
    ).toBe('/client/workforce');
  });

  it('denies a user with no recognized portal role', () => {
    expect(getAvailablePortals([])).toEqual([]);
    expect(getPortalEntryPath([])).toBe('/forbidden');
  });
});
