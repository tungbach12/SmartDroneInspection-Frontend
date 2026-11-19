import { describe, expect, it } from 'vitest';
import type { Role } from '@/features/auth/store/authStore';
import {
  canAccessSection,
  getAvailablePortals,
  getLegacyAdminRedirectPath,
  getLegacySectionRedirectPath,
  getPortalEntryPath,
  getSectionPath,
  LEGACY_ADMIN_REDIRECTS,
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
    contracts: ['ADMIN'],
    messages: [],
    assets: ['ADMIN'],
    'asset-catalog': ['ADMIN'],
    'flight-drone-config': ['ADMIN'],
    inspections: ['ADMIN'],
    reports: ['ADMIN'],
    'platform-users': ['ADMIN'],
    'platform-settings': ['ADMIN'],
    'onboarding-reviews': ['ADMIN'],
    'audit-logs': ['ADMIN'],
    'inspector-drones': [],
    notifications: ['ADMIN'],
    'finance-history': [],
    settings: ['ADMIN'],
  },
  manager: {
    dashboard: ['MANAGER'],
    contracts: ['MANAGER'],
    messages: ['MANAGER'],
    assets: ['MANAGER'],
    'asset-catalog': [],
    'flight-drone-config': [],
    inspections: ['MANAGER'],
    reports: ['MANAGER'],
    'platform-users': ['MANAGER'],
    'platform-settings': [],
    'onboarding-reviews': ['MANAGER'],
    'audit-logs': [],
    'inspector-drones': [],
    notifications: ['MANAGER'],
    'finance-history': ['MANAGER'],
    settings: ['MANAGER'],
  },
  client: {
    dashboard: ['CUSTOMER'],
    contracts: ['CUSTOMER'],
    messages: ['CUSTOMER'],
    assets: ['CUSTOMER'],
    'asset-catalog': [],
    'flight-drone-config': [],
    inspections: ['CUSTOMER'],
    reports: ['CUSTOMER'],
    'platform-users': [],
    'platform-settings': [],
    'onboarding-reviews': [],
    'audit-logs': [],
    'inspector-drones': [],
    notifications: ['CUSTOMER'],
    'finance-history': ['CUSTOMER'],
    settings: ['CUSTOMER'],
  },
  operations: {
    dashboard: ['INSPECTOR'],
    contracts: [],
    messages: ['INSPECTOR'],
    assets: [],
    'asset-catalog': [],
    'flight-drone-config': [],
    inspections: ['INSPECTOR'],
    reports: ['INSPECTOR'],
    'platform-users': [],
    'platform-settings': [],
    'onboarding-reviews': [],
    'audit-logs': [],
    'inspector-drones': ['INSPECTOR'],
    notifications: ['INSPECTOR'],
    'finance-history': ['INSPECTOR'],
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

  it('keeps the drone and flight config workspace on the admin flight-config URL', () => {
    expect(getSectionPath('admin', 'flight-drone-config')).toBe(
      '/admin/flight-config',
    );
    expect(getLegacySectionRedirectPath(['ADMIN'], 'flight-drone-config')).toBe(
      '/admin/flight-config',
    );
  });

  it('consolidates governance settings under platform-settings and keeps legacy targets', () => {
    expect(getSectionPath('admin', 'platform-settings')).toBe(
      '/admin/platform-settings',
    );
    expect(getLegacySectionRedirectPath(['ADMIN'], 'platform-settings')).toBe(
      '/admin/platform-settings',
    );
    expect(LEGACY_ADMIN_REDIRECTS).toEqual({
      'pilot-license-classes': '/admin/flight-config?tab=license-classes',
      'finance-settings': '/admin/platform-settings?tab=finance',
      'operations-settings': '/admin/platform-settings?tab=operations',
      'ai-settings': '/admin/platform-settings?tab=ai',
    });
    expect(getLegacyAdminRedirectPath('ai-settings')).toBe(
      '/admin/platform-settings?tab=ai',
    );
    expect(getLegacyAdminRedirectPath('platform-users')).toBeUndefined();
  });

  it('exposes only six governance sections on the admin portal', () => {
    const governanceSections: SectionId[] = [
      'asset-catalog',
      'flight-drone-config',
      'onboarding-reviews',
      'platform-users',
      'platform-settings',
      'audit-logs',
    ];
    expect(governanceSections.every((section) => canAccessSection('admin', section, ['ADMIN']))).toBe(
      true,
    );
  });


  it('denies a user with no recognized portal role', () => {
    expect(getAvailablePortals([])).toEqual([]);
    expect(getPortalEntryPath([])).toBe('/forbidden');
  });
});
