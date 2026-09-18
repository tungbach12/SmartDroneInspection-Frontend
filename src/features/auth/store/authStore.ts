import { create } from 'zustand';

export type Role =
  | 'ADMIN'
  | 'CLIENT'
  | 'SERVICE_MANAGER'
  | 'INSPECTOR'
  | 'MAINTENANCE_ENGINEER';

interface AuthState {
  accessToken: string | null;
  userId: string | null;
  userName: string | null;
  roles: Role[];
  setSession: (session: {
    accessToken: string;
    userId: string;
    userName: string;
    roles: Role[];
  }) => void;
  setAccessToken: (accessToken: string) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  userId: null,
  userName: null,
  roles: [],
  setSession: (session) => set(session),
  setAccessToken: (accessToken) => set({ accessToken }),
  clearSession: () =>
    set({
      accessToken: null,
      userId: null,
      userName: null,
      roles: [],
    }),
}));

export function useHasRole(): (roles: Role[]) => boolean {
  const roles = useAuthStore((s) => s.roles);
  return (required) => required.some((r) => roles.includes(r));
}
