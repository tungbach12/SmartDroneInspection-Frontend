import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '../store/authStore';
import { RequireAuth } from './RequireAuth';

const roles: Array<'ADMIN' | 'MANAGER' | 'CUSTOMER' | 'INSPECTOR' | 'MAINTENANCE_ENGINEER'> = [
  'ADMIN',
  'MANAGER',
  'CUSTOMER',
  'INSPECTOR',
  'MAINTENANCE_ENGINEER',
];

describe('RequireAuth protects MF1 customer resource paths', () => {
  afterEach(() => useAuthStore.getState().clearSession());

  it.each(['/client/workforce', '/client/assets'])(
    'allows CUSTOMER at %s and redirects the other roles to forbidden',
    async (path) => {
      for (const role of roles) {
        useAuthStore.getState().setSession({
          accessToken: 'synthetic-token',
          user: {
            userId: `user-${role}`,
            email: `${role.toLowerCase()}@example.test`,
            roles: [role],
          } as never,
        });
        const { unmount } = render(
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route
                path="/client/workforce"
                element={
                  <RequireAuth roles={['CUSTOMER']}>
                    <div>Workforce screen</div>
                  </RequireAuth>
                }
              />
              <Route
                path="/client/assets"
                element={
                  <RequireAuth roles={['CUSTOMER']}>
                    <div>Assets resource screen</div>
                  </RequireAuth>
                }
              />
              <Route path="/forbidden" element={<div>Forbidden screen</div>} />
              <Route path="/login" element={<div>Login screen</div>} />
            </Routes>
          </MemoryRouter>,
        );

        if (role === 'CUSTOMER') {
          expect(screen.getByText(path.endsWith('workforce') ? 'Workforce screen' : 'Assets resource screen')).toBeTruthy();
        } else {
          expect(screen.getByText('Forbidden screen')).toBeTruthy();
        }
        unmount();
        useAuthStore.getState().clearSession();
      }
    },
  );
});
