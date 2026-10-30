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
  'MANAGER',
  'CUSTOMER',
  'INSPECTOR',
  'MAINTENANCE_ENGINEER',
];

const expectedAccess: Record<
  PortalId,
  Record<SectionId, readonly Role[]>
> = {
  admin: {
    dashboard: ['ADMIN', 'MANAGER'],
    contracts: ['MANAGER'],
    assets: ['ADMIN', 'MANAGER'],
    'asset-catalog': ['ADMIN'],
    'asset-review': [],
    inspections: ['ADMIN', 'MANAGER'],
    reports: ['ADMIN', 'MANAGER'],
    maintenance: ['ADMIN'],
    workforce: [],
    subscriptions: ['ADMIN', 'MANAGER'],
    'drone-leasing': ['ADMIN', 'MANAGER'],
    'platform-users': ['ADMIN'],
    'finance-settings': ['ADMIN'],
    'onboarding-reviews': ['ADMIN'],
    'inspector-drones': [],
    settings: ['ADMIN', 'MANAGER'],
  },
  client: {
    dashboard: ['CUSTOMER'],
    contracts: ['CUSTOMER'],
    assets: ['CUSTOMER'],
    'asset-catalog': [],
    'asset-review': [],
    inspections: ['CUSTOMER'],
    reports: ['CUSTOMER'],
    maintenance: ['CUSTOMER'],
    workforce: ['CUSTOMER'],
    subscriptions: ['CUSTOMER'],
    'drone-leasing': ['CUSTOMER'],
    'platform-users': [],
    'finance-settings': [],
    'onboarding-reviews': [],
    'inspector-drones': [],
    settings: ['CUSTOMER'],
  },
  operations: {
    dashboard: ['INSPECTOR', 'MAINTENANCE_ENGINEER'],
    contracts: [],
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
    'finance-settings': [],
    'onboarding-reviews': [],
    'inspector-drones': ['INSPECTOR'],
    settings: ['INSPECTOR', 'MAINTENANCE_ENGINEER'],
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
    expect(getPortalEntryPath(['CUSTOMER'])).toBe('/client/dashboard');
    expect(getPortalEntryPath(['INSPECTOR'])).toBe('/operations/dashboard');
    expect(getPortalEntryPath(['MAINTENANCE_ENGINEER'])).toBe(
      '/operations/dashboard',
    );
    expect(getPortalEntryPath(['ADMIN'])).toBe('/admin/dashboard');
    expect(getPortalEntryPath(['MANAGER'])).toBe('/admin/dashboard');
  });

  it('offers a portal choice when the user has roles in multiple portals', () => {
    expect(getAvailablePortals(['CUSTOMER', 'INSPECTOR'])).toEqual([
      'client',
      'operations',
    ]);
    expect(getPortalEntryPath(['CUSTOMER', 'INSPECTOR'])).toBe('/portals');
  });

  it('redirects legacy section URLs to an allowed portal or the portal chooser', () => {
    expect(getLegacySectionRedirectPath(['CUSTOMER'], 'assets')).toBe(
      '/client/assets',
    );
    expect(
      getLegacySectionRedirectPath(['CUSTOMER', 'INSPECTOR'], 'inspections'),
    ).toBe('/portals?section=inspections');
    expect(
      getLegacySectionRedirectPath(['MAINTENANCE_ENGINEER'], 'assets'),
    ).toBe('/forbidden');
  });

  it('sends Workforce navigation to a Customer path and denies the other roles', () => {
    expect(getSectionPath('client', 'workforce')).toBe('/client/workforce');
    expect(getLegacySectionRedirectPath(['CUSTOMER'], 'workforce')).toBe(
      '/client/workforce',
    );
    for (const role of ['ADMIN', 'MANAGER', 'INSPECTOR', 'MAINTENANCE_ENGINEER'] as Role[]) {
      expect(getLegacySectionRedirectPath([role], 'workforce')).toBe('/forbidden');
    }
    // A session that is not a Customer gets no Workforce entry even when it
    // already has another workspace.
    expect(
      getLegacySectionRedirectPath(['INSPECTOR', 'MAINTENANCE_ENGINEER'], 'workforce'),
    ).toBe('/forbidden');
    // A Customer session alongside an operations role still resolves to its own organization path.
    expect(
      getLegacySectionRedirectPath(['CUSTOMER', 'INSPECTOR'], 'workforce'),
    ).toBe('/client/workforce');
  });

  it('denies a user with no recognized portal role', () => {
    expect(getAvailablePortals([])).toEqual([]);
    expect(getPortalEntryPath([])).toBe('/forbidden');
  });
});
