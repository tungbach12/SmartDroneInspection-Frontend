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
  'flight-drone-config',
  'inspections',
  'reports',
  'platform-users',
  'platform-settings',
  'onboarding-reviews',
  'drone-registrations',
  'customer-airspace',
  'audit-logs',
  'inspector-drones',
  'notifications',
  'finance-history',
  'payout-settlements',
  'settings',
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

export const SECTION_LABELS: Record<SectionId, string> = {
  dashboard: 'Dashboard',
  contracts: 'Service requests',
  messages: 'Messages',
  assets: 'Assets',
  'asset-catalog': 'Asset catalog',
  'flight-drone-config': 'Drone & Flight config',
  inspections: 'Inspections',
  reports: 'Reports',
  'platform-users': 'Platform accounts',
  'platform-settings': 'Platform settings',
  'onboarding-reviews': 'Inspector applications',
  'drone-registrations': 'Drone registrations',
  'customer-airspace': 'Customer airspace',
  'audit-logs': 'Activity log',
  'inspector-drones': 'My drones',
  notifications: 'Notifications',
  'finance-history': 'Payment history',
  'payout-settlements': 'Inspector payouts',
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
  'flight-drone-config': 'Cấu hình Drone & Bay',
  inspections: 'Đợt kiểm tra',
  reports: 'Báo cáo',
  'platform-users': 'Tài khoản nền tảng',
  'platform-settings': 'Cấu hình nền tảng',
  'onboarding-reviews': 'Đơn đăng ký Inspector',
  'drone-registrations': 'Đăng ký Drone',
  'customer-airspace': 'Vùng bay khách hàng',
  'audit-logs': 'Nhật ký hoạt động',
  'inspector-drones': 'Drone của tôi',
  notifications: 'Thông báo',
  'finance-history': 'Lịch sử thanh toán',
  'payout-settlements': 'Chi trả kiểm định viên',
  settings: 'Cài đặt',
};

export function getPortalLabel(portal: PortalId, locale: Locale): string {
  return locale === 'vi' ? PORTAL_LABELS_VI[portal] : PORTAL_CONFIG[portal].label;
}

/**
 * Most section IDs are the same as their URL segment. A section can override its
 * segment when the route name should stay shorter than the internal identifier.
 */
const SECTION_PATH_SEGMENTS: Partial<Record<SectionId, string>> = {
  'flight-drone-config': 'flight-config',
};

export function getSectionPathSegment(section: SectionId): string {
  return SECTION_PATH_SEGMENTS[section] ?? section;
}

export function getSectionIdFromPathSegment(segment: string): SectionId | undefined {
  return SECTION_IDS.find(
    (section) => getSectionPathSegment(section) === segment,
  );
}

export function getSectionLabel(
  section: SectionId,
  locale: Locale,
  portal?: PortalId,
): string {
  if (portal === 'manager' && section === 'platform-users') {
    return locale === 'vi' ? 'Phi công đối tác' : 'Partner inspectors';
  }
  if (portal === 'manager' && section === 'finance-history') {
    return locale === 'vi' ? 'Doanh thu & Thu tiền' : 'Revenue & payments';
  }
  return locale === 'vi' ? SECTION_LABELS_VI[section] : SECTION_LABELS[section];
}

export function getPageLabel(pathname: string, portal: PortalId, locale: Locale): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.includes('inspections') && segments.length > 2) {
    return locale === 'vi' ? 'Không gian làm việc kiểm tra' : 'Inspection workspace';
  }
  if (segments.includes('reports') && segments.length > 2) {
    return locale === 'vi' ? 'Chi tiết báo cáo' : 'Report detail';
  }
  const pathSegment = segments.at(-1);
  if (pathSegment === 'security') {
    return locale === 'vi' ? 'Cài đặt' : 'Settings';
  }
  const section = pathSegment ? getSectionIdFromPathSegment(pathSegment) : undefined;
  if (section) {
    return section === 'dashboard'
      ? (locale === 'vi' ? 'Tổng quan' : 'Overview')
      : getSectionLabel(section, locale, portal);
  }
  return getPortalLabel(portal, locale);
}

const SECTION_ROLE_ACCESS = {
  admin: {
    dashboard: ['ADMIN'],
    contracts: ['ADMIN'],
    messages: [],
    assets: ['ADMIN'],
    'asset-catalog': ['ADMIN'],
    'flight-drone-config': ['ADMIN'],
    inspections: ['ADMIN'],
    reports: ['ADMIN'],
    // Platform administration of the administrator-managed accounts (FE-01).
    'platform-users': ['ADMIN'],
    'platform-settings': ['ADMIN'],
    'onboarding-reviews': ['ADMIN'],
    'drone-registrations': ['ADMIN'],
    'customer-airspace': [],
    'audit-logs': ['ADMIN'],
    'inspector-drones': [],
    notifications: ['ADMIN'],
    'finance-history': [],
    'payout-settlements': [],
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
    'drone-registrations': ['MANAGER'],
    'customer-airspace': [],
    'audit-logs': [],
    'inspector-drones': [],
    notifications: ['MANAGER'],
    'finance-history': ['MANAGER'],
    'payout-settlements': ['MANAGER'],
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
    // The platform's own account administration is not a customer-organization function.
    'platform-users': [],
    'platform-settings': [],
    'onboarding-reviews': [],
    'drone-registrations': [],
    'customer-airspace': [],
    'audit-logs': [],
    'inspector-drones': [],
    notifications: ['CUSTOMER'],
    'finance-history': ['CUSTOMER'],
    'payout-settlements': [],
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
    'drone-registrations': [],
    'customer-airspace': [],
    'audit-logs': [],
    'inspector-drones': ['INSPECTOR'],
    notifications: ['INSPECTOR'],
    'finance-history': ['INSPECTOR'],
    'payout-settlements': [],
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
  return `${PORTAL_CONFIG[portal].path}/${getSectionPathSegment(section)}`;
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

/**
 * Governance screens absorbed into consolidated workspaces keep their old URLs working so
 * existing bookmarks and shared links do not break.
 */
export const LEGACY_ADMIN_REDIRECTS: Readonly<Record<string, string>> = {
  'pilot-license-classes': '/admin/flight-config?tab=license-classes',
  'finance-settings': '/admin/platform-settings?tab=finance',
  'operations-settings': '/admin/platform-settings?tab=operations',
  'ai-settings': '/admin/platform-settings?tab=ai',
};

export function getLegacyAdminRedirectPath(pathSegment: string): string | undefined {
  return LEGACY_ADMIN_REDIRECTS[pathSegment];
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
