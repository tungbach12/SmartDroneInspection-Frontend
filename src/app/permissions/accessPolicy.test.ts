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
  'MANAGER',
  'CUSTOMER',
  'INSPECTOR',
];

const expectedAccess: Record<
  PortalId,
  Record<SectionId, readonly Role[]>
> = {
  admin: {
    dashboard: ['ADMIN'],
    contracts: [],
    assets: ['ADMIN'],
    'asset-catalog': ['ADMIN'],
    inspections: ['ADMIN'],
    reports: ['ADMIN'],
    'platform-users': ['ADMIN'],
    'finance-settings': ['ADMIN'],
    'onboarding-reviews': ['ADMIN'],
    'inspector-drones': [],
    settings: ['ADMIN'],
  },
  manager: {
    dashboard: ['MANAGER'],
    contracts: ['MANAGER'],
    assets: ['MANAGER'],
    'asset-catalog': [],
    inspections: ['MANAGER'],
    reports: ['MANAGER'],
    'platform-users': ['MANAGER'],
    'finance-settings': [],
    'onboarding-reviews': ['MANAGER'],
    'inspector-drones': [],
    settings: ['MANAGER'],
  },
  client: {
    dashboard: ['CUSTOMER'],
    contracts: ['CUSTOMER'],
    assets: ['CUSTOMER'],
    'asset-catalog': [],
    inspections: ['CUSTOMER'],
    reports: ['CUSTOMER'],
    'platform-users': [],
    'finance-settings': [],
    'onboarding-reviews': [],
    'inspector-drones': [],
    settings: ['CUSTOMER'],
  },
  operations: {
    dashboard: ['INSPECTOR'],
    contracts: [],
    assets: [],
    'asset-catalog': [],
    inspections: ['INSPECTOR'],
    reports: ['INSPECTOR'],
    'platform-users': [],
    'finance-settings': [],
    'onboarding-reviews': [],
    'inspector-drones': ['INSPECTOR'],
    settings: ['INSPECTOR'],
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
    expect(getPortalEntryPath(['ADMIN'])).toBe('/admin/dashboard');
    expect(getPortalEntryPath(['MANAGER'])).toBe('/manager/dashboard');
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
  });


  it('denies a user with no recognized portal role', () => {
    expect(getAvailablePortals([])).toEqual([]);
    expect(getPortalEntryPath([])).toBe('/forbidden');
  });
});
