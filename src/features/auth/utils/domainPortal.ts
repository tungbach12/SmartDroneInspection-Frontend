import type { PortalId } from '@/app/permissions/accessPolicy';

export function getPortalForHost(host: string): PortalId | null {
  const normalized = host.trim().toLowerCase();
  if (normalized.startsWith('smartdroneinspection-admin')) {
    return 'admin';
  }
  if (normalized.startsWith('smartdroneinspection-provider')) {
    return 'operations';
  }
  return null;
}
