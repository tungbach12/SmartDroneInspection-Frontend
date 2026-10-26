import {
  canAccessSection,
  getAvailablePortals,
  PORTAL_IDS,
  type PortalId,
} from '@/app/permissions/accessPolicy';
import type { Role } from '@/features/auth/store/authStore';

const ALLOWED_INSPECTION_SUBROUTES = new Set([
  'evidence',
  'findings',
  'report',
  'field-session',
  'review',
  'corrective',
]);

/**
 * Validates untrusted notification target paths and resolves them safely into internal portal routes.
 * External URLs, dangerous protocols, and routes not accessible by the user's role/portal are rejected.
 */
export function resolveSafeNotificationRoute(
  targetPath: string | null | undefined,
  currentPortal: PortalId | null | undefined,
  userRoles: readonly Role[],
): string | null {
  if (!targetPath || typeof targetPath !== 'string') {
    return null;
  }

  const trimmed = targetPath.trim();
  // Must start with '/' and not '//' (protocol-relative URL)
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return null;
  }

  // Reject URL protocols or javascript
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return null;
  }

  // Determine target portal
  let targetPortal = currentPortal;
  if (!targetPortal || !PORTAL_IDS.includes(targetPortal)) {
    const available = getAvailablePortals(userRoles);
    targetPortal = available[0] ?? null;
  }

  if (!targetPortal) {
    return null;
  }

  // Clean path (strip query/hash)
  const cleanPath = trimmed.split('?')[0]?.split('#')[0] ?? '';
  const segments = cleanPath.split('/').filter(Boolean);

  if (segments.length === 0) {
    return null;
  }

  const [first, ...rest] = segments;

  if (first === 'inspections') {
    if (!canAccessSection(targetPortal, 'inspections', userRoles)) {
      return null;
    }
    if (rest.length === 0) {
      return `/${targetPortal}/inspections`;
    }
    const [inspectionId, subroute] = rest;
    if (!inspectionId || !/^[a-zA-Z0-9_-]+$/.test(inspectionId)) {
      return null;
    }
    if (subroute) {
      const normalizedSubroute = subroute === 'preparation' ? 'field-session' : subroute;
      if (!ALLOWED_INSPECTION_SUBROUTES.has(normalizedSubroute)) {
        return null;
      }
      // Review and corrective are restricted to client portal ORG_MANAGER
      if ((normalizedSubroute === 'review' || normalizedSubroute === 'corrective') && targetPortal !== 'client') {
        return `/${targetPortal}/inspections/${inspectionId}`;
      }
      return `/${targetPortal}/inspections/${inspectionId}/${normalizedSubroute}`;
    }
    return `/${targetPortal}/inspections/${inspectionId}`;
  }

  if (first === 'reports') {
    if (!canAccessSection(targetPortal, 'reports', userRoles)) {
      return null;
    }
    if (rest.length === 0) {
      return `/${targetPortal}/reports`;
    }
    const reportId = rest[0];
    if (!reportId || !/^[a-zA-Z0-9_-]+$/.test(reportId)) {
      return null;
    }
    return `/${targetPortal}/reports/${reportId}`;
  }

  if (first === 'maintenance') {
    if (!canAccessSection(targetPortal, 'maintenance', userRoles)) {
      return null;
    }
    return `/${targetPortal}/maintenance`;
  }

  if (first === 'assets') {
    if (!canAccessSection(targetPortal, 'assets', userRoles)) {
      return null;
    }
    return `/${targetPortal}/assets`;
  }

  if (first === 'dashboard') {
    if (!canAccessSection(targetPortal, 'dashboard', userRoles)) {
      return null;
    }
    return `/${targetPortal}/dashboard`;
  }

  return null;
}
