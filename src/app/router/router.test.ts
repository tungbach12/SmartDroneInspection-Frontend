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

describe('MF1 guarded onboarding routes', () => {
  it.each([
    ['/admin/onboarding-reviews', 'onboarding-reviews'],
    ['/manager/onboarding-reviews', 'onboarding-reviews'],
    ['/manager/inspections/inspection-1/review', 'review'],
    ['/operations/inspector-drones', 'inspector-drones'],
  ])('matches guarded route %s', (path, expected) => {
    const matches = matchRoutes(router.routes, path);
    expect(matches?.at(-1)?.route.path).toBe(expected);
  });
});

describe('existing portal routes', () => {
  it.each(['/admin/dashboard', '/operations/dashboard', '/client/assets'])(
    'still matches the existing portal section %s',
    (path) => {
      const matches = matchRoutes(router.routes, path);
      expect(matches?.at(-1)?.route.path).not.toBe('*');
    },
  );

  it.each([
    ['/client/assets', 'CUSTOMER'],
    ['/client/assets', 'ADMIN'],
    ['/client/assets', 'INSPECTOR'],
  ])('maps direct resource URL %s for %s into the guarded client tree', (path) => {
    const matches = matchRoutes(router.routes, path);
    expect(matches?.at(-1)?.route.path).toBe(path.split('/').at(-1));
  });
});
