import type { Role } from '@/features/auth/store/authStore';
import type { Locale } from '@/shared/i18n/LocaleProvider';

export const PORTAL_ROLE_ACCESS = {
  admin: ['ADMIN'],
  manager: ['MANAGER'],
  client: ['CUSTOMER'],
  operations: ['INSPECTOR'],
} as const satisfies Record<string, readonly Role[]>;

export type PortalId = keyof typeof PORTAL_ROLE_ACCESS;

export const PORTAL_IDS = Object.keys(PORTAL_ROLE_ACCESS) as PortalId[];

export const PORTAL_CONFIG = {
  admin: { label: 'Admin workspace', path: '/admin' },
  manager: { label: 'Manager workspace', path: '/manager' },
  client: { label: 'Client workspace', path: '/client' },
  operations: { label: 'Operations workspace', path: '/operations' },
} as const satisfies Record<PortalId, { label: string; path: string }>;

export const SECTION_IDS = [
  'dashboard',
  'contracts',
  'messages',
  'assets',
  'asset-catalog',
  'inspections',
  'reports',
  'platform-users',
  'finance-settings',
  'onboarding-reviews',
  'inspector-drones',
  'settings',
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

export const SECTION_LABELS: Record<SectionId, string> = {
  dashboard: 'Dashboard',
  contracts: 'Service requests',
  messages: 'Messages',
  assets: 'Assets',
  'asset-catalog': 'Asset catalog',
  inspections: 'Inspections',
  reports: 'Reports',
  'platform-users': 'Platform accounts',
  'finance-settings': 'Finance settings',
  'onboarding-reviews': 'Onboarding reviews',
  'inspector-drones': 'My drones',
  settings: 'Settings',
};

/**
 * Locale-aware labels. The English maps above stay the canonical source; these carry the
 * Vietnamese display text so the route IDs and access rules never change with the locale.
 */
const PORTAL_LABELS_VI: Record<PortalId, string> = {
  admin: 'Không gian quản trị',
  manager: 'Không gian điều phối',
  client: 'Không gian khách hàng',
  operations: 'Không gian vận hành',
};

const SECTION_LABELS_VI: Record<SectionId, string> = {
  dashboard: 'Bảng điều khiển',
  contracts: 'Yêu cầu dịch vụ',
  messages: 'Tin nhắn',
  assets: 'Tài sản',
  'asset-catalog': 'Danh mục tài sản',
  inspections: 'Đợt kiểm tra',
  reports: 'Báo cáo',
  'platform-users': 'Tài khoản nền tảng',
  'finance-settings': 'Cấu hình tài chính',
  'onboarding-reviews': 'Duyệt hồ sơ đăng ký',
  'inspector-drones': 'Drone của tôi',
  settings: 'Cài đặt',
};

export function getPortalLabel(portal: PortalId, locale: Locale): string {
  return locale === 'vi' ? PORTAL_LABELS_VI[portal] : PORTAL_CONFIG[portal].label;
}

export function getSectionLabel(
  section: SectionId,
  locale: Locale,
  portal?: PortalId,
): string {
  if (portal === 'manager' && section === 'platform-users') {
    return locale === 'vi' ? 'Phi công đối tác' : 'Partner inspectors';
  }
  return locale === 'vi' ? SECTION_LABELS_VI[section] : SECTION_LABELS[section];
}

export function getPageLabel(pathname: string, portal: PortalId, locale: Locale): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.includes('inspections') && segments.length > 2) {
    return locale === 'vi' ? 'Chi tiết đợt kiểm tra' : 'Inspection detail';
  }
  if (segments.includes('reports') && segments.length > 2) {
    return locale === 'vi' ? 'Chi tiết báo cáo' : 'Report detail';
  }
  const section = segments.at(-1);
  if (section === 'security') {
    return locale === 'vi' ? 'Cài đặt' : 'Settings';
  }
  if (section === 'ai-settings') {
    return locale === 'vi' ? 'Cấu hình AI' : 'AI configuration';
  }
  if (section && section in SECTION_LABELS) {
    return section === 'dashboard'
      ? (locale === 'vi' ? 'Tổng quan' : 'Overview')
      : getSectionLabel(section as SectionId, locale, portal);
  }
  return getPortalLabel(portal, locale);
}

const SECTION_ROLE_ACCESS = {
  admin: {
    dashboard: ['ADMIN'],
    contracts: [],
    messages: [],
    assets: ['ADMIN'],
    'asset-catalog': ['ADMIN'],
    inspections: ['ADMIN'],
    reports: ['ADMIN'],
    // Platform administration of the administrator-managed accounts (FE-01).
    'platform-users': ['ADMIN'],
    'finance-settings': ['ADMIN'],
    'onboarding-reviews': ['ADMIN'],
    'inspector-drones': [],
    settings: ['ADMIN'],
  },
  manager: {
    dashboard: ['MANAGER'],
    contracts: ['MANAGER'],
    messages: ['MANAGER'],
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
    messages: ['CUSTOMER'],
    assets: ['CUSTOMER'],
    'asset-catalog': [],
    inspections: ['CUSTOMER'],
    reports: ['CUSTOMER'],
    // The platform's own account administration is not a customer-organization function.
    'platform-users': [],
    'finance-settings': [],
    'onboarding-reviews': [],
    'inspector-drones': [],
    settings: ['CUSTOMER'],
  },
  operations: {
    dashboard: ['INSPECTOR'],
    contracts: [],
    messages: [],
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
