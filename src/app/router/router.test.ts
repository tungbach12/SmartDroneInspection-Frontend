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

describe('Organization Manager MF3 reviewer routes', () => {
  it.each([
    ['/client/inspections/inspection-1', 'index'],
    ['/client/inspections/inspection-1/review', 'review'],
    ['/client/inspections/inspection-1/report', 'report'],
    ['/client/inspections/inspection-1/evidence', 'evidence'],
    ['/client/inspections/inspection-1/findings', 'findings'],
  ])('matches reviewer workspace route %s', (path, expected) => {
    const matches = matchRoutes(router.routes, path);
    expect(matches?.at(-1)?.route.path ?? 'index').toBe(expected);
  });

  it('does not expose the reviewer-only route from Operations', () => {
    const matches = matchRoutes(router.routes, '/operations/inspections/inspection-1/review');
    expect(matches?.at(-1)?.route.path).toBe('*');
  });
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

  it.each([
    ['/client/workforce', 'ORG_MANAGER'],
    ['/client/assets', 'ORG_MANAGER'],
    ['/client/subscriptions', 'ORG_MANAGER'],
    ['/client/drone-leasing', 'ORG_MANAGER'],
    ['/admin/subscriptions', 'PLATFORM_MANAGER'],
    ['/admin/drone-leasing', 'PLATFORM_MANAGER'],
    ['/client/workforce', 'ADMIN'],
    ['/client/assets', 'ADMIN'],
    ['/client/workforce', 'INSPECTOR'],
    ['/client/assets', 'INSPECTOR'],
    ['/client/workforce', 'MAINTENANCE_ENGINEER'],
    ['/client/assets', 'MAINTENANCE_ENGINEER'],
  ])('maps direct resource URL %s for %s into the guarded client tree', (path) => {
    const matches = matchRoutes(router.routes, path);
    expect(matches?.at(-1)?.route.path).toBe(path.split('/').at(-1));
  });
});
