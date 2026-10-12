import { describe, expect, it } from 'vitest';
import { matchRoutes } from 'react-router-dom';
import { router } from './router';

describe('retired provider routes', () => {
  it.each(['/register-provider', '/activate-provider', '/operations/team'])(
    'does not match the retired route %s',
    (path) => {
      const matches = matchRoutes(router.routes, path);
      expect(matches?.at(-1)?.route.path).toBe('*');
    },
  );
});

describe('MF1 client-only routes', () => {
  it('matches /client/workforce as a guarded client section', () => {
    const matches = matchRoutes(router.routes, '/client/workforce');

    expect(matches?.at(-1)?.route.path).toBe('workforce');
  });

  // Workforce is granted to no role in the admin or operations workspace, so the route must not
  // exist there. A route that exists but always denies still advertises the customer resource
  // surface outside the workspace that owns it.
  it.each(['/admin/workforce', '/operations/workforce'])(
    'has no workforce route at %s',
    (path) => {
      const matches = matchRoutes(router.routes, path);
      expect(matches?.at(-1)?.route.path).toBe('*');
    },
  );

  it.each(['/admin/dashboard', '/operations/dashboard', '/client/assets'])(
    'still matches the existing portal section %s',
    (path) => {
      const matches = matchRoutes(router.routes, path);
      expect(matches?.at(-1)?.route.path).not.toBe('*');
    },
  );
});
