import { create } from 'zustand';

export const ROLE_CODES = [
  'ADMIN',
  'CLIENT',
  'SERVICE_MANAGER',
  'INSPECTOR',
  'MAINTENANCE_ENGINEER',
] as const;

export type Role = (typeof ROLE_CODES)[number];
export type AuthStatus = 'checking' | 'authenticated' | 'anonymous';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  roles: Role[];
  actorZone: string;
  organizationId: string | null;
}

interface AuthSession {
  accessToken: string;
  user: AuthUser;
}

interface AuthState {
  status: AuthStatus;
  accessToken: string | null;
  user: AuthUser | null;
  userId: string | null;
  userName: string | null;
  email: string | null;
  roles: Role[];
  actorZone: string | null;
  organizationId: string | null;
  setSession: (session: AuthSession) => void;
  setAccessToken: (accessToken: string) => void;
  setStatus: (status: AuthStatus) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'checking',
  accessToken: null,
  user: null,
  userId: null,
  userName: null,
  email: null,
  roles: [],
  actorZone: null,
  organizationId: null,
  setSession: ({ accessToken, user }) =>
    set({
      status: 'authenticated',
      accessToken,
      user,
      userId: user.id,
      userName: user.fullName,
      email: user.email,
      roles: user.roles,
      actorZone: user.actorZone,
      organizationId: user.organizationId,
    }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setStatus: (status) => set({ status }),
  clearSession: () =>
    set({
      status: 'anonymous',
      accessToken: null,
      user: null,
      userId: null,
      userName: null,
      email: null,
      roles: [],
      actorZone: null,
      organizationId: null,
    }),
}));

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && ROLE_CODES.includes(value as Role);
}

export function useHasRole(): (roles: readonly Role[]) => boolean {
  const roles = useAuthStore((state) => state.roles);
  return (required) => required.some((role) => roles.includes(role));
}
