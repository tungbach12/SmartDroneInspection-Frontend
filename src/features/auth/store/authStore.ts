import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role =
  | 'Administrator'
  | 'InspectionManager'
  | 'Inspector'
  | 'MaintenanceEngineer'
  | 'Viewer';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  userId: string | null;
  userName: string | null;
  roles: Role[];
  setSession: (session: {
    accessToken: string;
    refreshToken: string;
    userId: string;
    userName: string;
    roles: Role[];
  }) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      userId: null,
      userName: null,
      roles: [],
      setSession: (session) => set(session),
      clearSession: () =>
        set({
          accessToken: null,
          refreshToken: null,
          userId: null,
          userName: null,
          roles: [],
        }),
    }),
    { name: 'sdi-auth' },
  ),
);

export function useHasRole(): (roles: Role[]) => boolean {
  const roles = useAuthStore((s) => s.roles);
  return (required) => required.some((r) => roles.includes(r));
}
