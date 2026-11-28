import {
  canAccessPortal,
  canAccessSection,
  getLegacySectionRedirectPath,
  getPortalEntryPath,
  getSectionIdFromPathSegment,
  PORTAL_IDS,
  SECTION_IDS,
  type PortalId,
  type SectionId,
} from '@/app/permissions/accessPolicy';
import type { Role } from '../store/authStore';
import { LOGIN_AUDIENCES, LOGIN_PAGES } from './loginAudience';

const APP_ORIGIN = 'https://smartdroneinspection.invalid';

export function getAuthRedirectTarget(
  returnTo: string | null | undefined,
  roles: readonly Role[],
): string {
  const defaultPath = getPortalEntryPath([...roles]);
  if (!returnTo || !returnTo.startsWith('/') || returnTo.startsWith('//')) {
    return defaultPath;
  }

  let destination: URL;
  try {
    destination = new URL(returnTo, APP_ORIGIN);
  } catch {
    return defaultPath;
  }

  if (destination.origin !== APP_ORIGIN) {
    return defaultPath;
  }

  const path = destination.pathname;
  if (
    path === '/login' ||
    LOGIN_AUDIENCES.some((audience) => LOGIN_PAGES[audience].path === path) ||
    path === '/register' ||
    path === '/inspector/register' ||
    path === '/register-inspector' ||
    path === '/forbidden'
  ) {
    return defaultPath;
  }

  if (path === '/portals') {
    return defaultPath === '/portals'
      ? `${path}${destination.search}${destination.hash}`
      : defaultPath;
  }

  const [firstSegment, secondSegment, thirdSegment] = path
    .split('/')
    .filter(Boolean);
  const portal = PORTAL_IDS.find((id) => id === firstSegment) as
    | PortalId
    | undefined;

  if (portal) {
    if (!canAccessPortal(portal, roles)) {
      return defaultPath;
    }

    if (secondSegment === 'account' && thirdSegment === 'security') {
      return `${path}${destination.search}${destination.hash}`;
    }

    if (secondSegment && SECTION_IDS.some((id) => id === secondSegment)) {
      const section = secondSegment as SectionId;
      if (!canAccessSection(portal, section, roles)) {
        return defaultPath;
      }
      return `${path}${destination.search}${destination.hash}`;
    }

    if (secondSegment) {
      const section = getSectionIdFromPathSegment(secondSegment);
      if (!section || !canAccessSection(portal, section, roles)) {
        return defaultPath;
      }
      return `${path}${destination.search}${destination.hash}`;
    }

    return defaultPath;
  }

  if (path === '/dashboard') {
    return defaultPath;
  }

  const legacySegments = path.split('/').filter(Boolean);
  const legacySection =
    legacySegments.length === 1
      ? getSectionIdFromPathSegment(legacySegments[0] ?? '')
      : undefined;
  if (legacySection) {
    return getLegacySectionRedirectPath([...roles], legacySection);
  }

  return defaultPath;
}

export function getLoginReturnTo(
  from: unknown,
  queryReturnTo: string | null,
): string | null {
  if (queryReturnTo) {
    return queryReturnTo;
  }

  if (!from || typeof from !== 'object') {
    return null;
  }

  const location = from as {
    pathname?: unknown;
    search?: unknown;
    hash?: unknown;
  };
  if (typeof location.pathname !== 'string') {
    return null;
  }

  const search = typeof location.search === 'string' ? location.search : '';
  const hash = typeof location.hash === 'string' ? location.hash : '';
  return `${location.pathname}${search}${hash}`;
}
