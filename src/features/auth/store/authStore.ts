import { create } from 'zustand';

export const ROLE_CODES = [
  'ADMIN',
  'MANAGER',
  'CUSTOMER',
  'INSPECTOR',
] as const;

export const KNOWN_ROLES = ROLE_CODES;

export type Role = (typeof ROLE_CODES)[number];
export type AuthStatus = 'checking' | 'authenticated' | 'anonymous';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string | null;
  roles: Role[];
  avatarUrl?: string | null | undefined;
  visionFallbackEnabled?: boolean;
  pilotLicenseNumber?: string | undefined;
  pilotLicenseClass?: string | undefined;
  pilotLicenseExpiresAt?: string | undefined;
  pilotLicenseFileKey?: string | undefined;
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
  setSession: (session: AuthSession) => void;
  setAccessToken: (accessToken: string) => void;
  setStatus: (status: AuthStatus) => void;
  setUser: (user: AuthUser) => void;
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
  setSession: ({ accessToken, user }) =>
    set({
      status: 'authenticated',
      accessToken,
      user,
      userId: user.id,
      userName: user.fullName,
      email: user.email,
      roles: user.roles,
    }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setStatus: (status) => set({ status }),
  setUser: (user) =>
    set({
      user,
      userId: user.id,
      userName: user.fullName,
      email: user.email,
      roles: user.roles,
    }),
  clearSession: () =>
    set({
      status: 'anonymous',
      accessToken: null,
      user: null,
      userId: null,
      userName: null,
      email: null,
      roles: [],
    }),
}));

export function normalizeRole(role: string): Role | null {
  if (ROLE_CODES.includes(role as Role)) return role as Role;
  return null;
}

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && normalizeRole(value) !== null;
}

export function useHasRole(): (roles: readonly Role[]) => boolean {
  const roles = useAuthStore((state) => state.roles);
  return (required) => required.some((role) => roles.includes(role));
}
