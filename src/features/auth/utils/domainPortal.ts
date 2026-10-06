import type { PortalId } from '@/app/permissions/accessPolicy';

export type WorkspaceKind = 'main' | 'admin' | 'provider';

export function getWorkspaceKind(host: string): WorkspaceKind {
  const normalized = host.trim().toLowerCase();
  if (normalized.startsWith('smartdroneinspection-admin')) {
    return 'admin';
  }
  if (normalized.startsWith('smartdroneinspection-provider')) {
    return 'provider';
  }
  return 'main';
}

export function getPortalForHost(host: string): PortalId | null {
  const kind = getWorkspaceKind(host);
  if (kind === 'admin') return 'admin';
  if (kind === 'provider') return 'operations';
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
          'Platform administrators manage users, providers, and access policy. Sign in with your admin account.',
        sideLabel: 'Admin workspace',
        sideTitle: 'Run the platform',
        sideBody:
          'Review provider registration, manage platform users, and keep the service healthy across all workspaces.',
      };
    case 'provider':
      return {
        eyebrow: 'Service provider workspace',
        title: 'Provider sign-in',
        description:
          'Providers manage their team, missions, and reports here. Sign in with your provider account.',
        sideLabel: 'Provider workspace',
        sideTitle: 'Run your inspection service',
        sideBody:
          'Coordinate inspectors and maintenance engineers, review field evidence, and release client-ready reports.',
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

