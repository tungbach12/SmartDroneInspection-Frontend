import type { PortalId } from '@/app/permissions/accessPolicy';

export type WorkspaceKind = 'main' | 'admin' | 'operations';

export function getWorkspaceKind(host: string): WorkspaceKind {
  const normalized = host.trim().toLowerCase();
  if (normalized.startsWith('smartdroneinspection-admin')) {
    return 'admin';
  }
  if (normalized.startsWith('smartdroneinspection-operations')) {
    return 'operations';
  }
  return 'main';
}

export function getPortalForHost(host: string): PortalId | null {
  const kind = getWorkspaceKind(host);
  if (kind === 'admin') return 'admin';
  if (kind === 'operations') return 'operations';
  return null;
}

export interface WorkspaceCopy {
  eyebrow: string;
  title: string;
  description: string;
  sideLabel: string;
  sideTitle: string;
  sideBody: string;
}

export function getWorkspaceCopy(kind: WorkspaceKind): WorkspaceCopy {
  switch (kind) {
    case 'admin':
      return {
        eyebrow: 'Platform administration',
        title: 'Admin sign-in',
        description:
          'Platform administrators manage users and access policy. Sign in with your admin account.',
        sideLabel: 'Admin workspace',
        sideTitle: 'Run the platform',
        sideBody:
          'Manage platform users and keep the service healthy across all workspaces.',
      };
    case 'operations':
      return {
        eyebrow: 'Operations workspace',
        title: 'Operations sign-in',
        description:
          'Inspectors and maintenance engineers manage assigned field work here.',
        sideLabel: 'Operations workspace',
        sideTitle: 'Run field operations',
        sideBody:
          'Review field evidence, complete assigned inspections, and close maintenance work.',
      };
    default:
      return {
        eyebrow: 'Secure workspace access',
        title: 'Welcome back',
        description: 'Sign in with your account to continue to your authorized workspace.',
        sideLabel: 'SmartDroneInspection',
        sideTitle: 'From drone imagery to approved evidence',
        sideBody:
          'One place for client requests, mission planning, field capture, human-reviewed AI findings, and maintenance close-out.',
      };
  }
}

