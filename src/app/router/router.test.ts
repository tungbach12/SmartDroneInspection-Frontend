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
    ['/admin/drone-registrations', 'drone-registrations'],
    ['/manager/drone-registrations', 'drone-registrations'],
    ['/manager/payout-settlements', 'payout-settlements'],
    ['/manager/inspections/inspection-1/review', 'review'],
    ['/manager/inspections/inspection-1/payout', 'payout'],
    ['/operations/inspector-drones', 'inspector-drones'],
  ])('matches guarded route %s', (path, expected) => {
    const matches = matchRoutes(router.routes, path);
    expect(matches?.at(-1)?.route.path).toBe(expected);
  });

  it('keeps manager-only payout settlements and retired customer-airspace off portals', () => {
    expect(matchRoutes(router.routes, '/client/payout-settlements')?.at(-1)?.route.path).toBe('*');
    expect(matchRoutes(router.routes, '/operations/payout-settlements')?.at(-1)?.route.path).toBe('*');
    expect(matchRoutes(router.routes, '/admin/customer-airspace')?.at(-1)?.route.path).toBe('*');
    expect(matchRoutes(router.routes, '/manager/customer-airspace')?.at(-1)?.route.path).toBe('*');
  });
});

describe('role aligned inspection workspaces', () => {
  it('exposes the admin activity log', () => {
    const matches = matchRoutes(router.routes, '/admin/audit-logs');
    expect(matches?.at(-1)?.route.path).toBe('audit-logs');
  });

  it.each([
    '/admin/inspections/inspection-1/payout',
    '/admin/inspections/inspection-1/settlement',
    '/admin/inspections/inspection-1/pre-flight',
    '/admin/inspections/inspection-1/field-session',
    '/admin/inspections/inspection-1/post-flight',
    '/client/inspections/inspection-1/audit',
    '/client/inspections/inspection-1/payout',
    '/operations/inspections/inspection-1/payout',
  ])('does not expose the business-only stage %s to that portal', (path) => {
    const matches = matchRoutes(router.routes, path);
    expect(matches?.at(-1)?.route.path).toBe('*');
  });
});

describe('governance configuration routes', () => {
  it.each([
    ['/admin/asset-catalog', 'asset-catalog'],
    ['/admin/flight-config', 'flight-config'],
  ])('matches the admin governance route %s', (path, expected) => {
    const matches = matchRoutes(router.routes, path);
    expect(matches?.at(-1)?.route.path).toBe(expected);
  });

  it.each([
    '/manager/flight-config',
    '/client/flight-config',
    '/operations/flight-config',
  ])('does not expose drone and flight config at %s', (path) => {
    const matches = matchRoutes(router.routes, path);
    expect(matches?.at(-1)?.route.path).toBe('*');
  });

  it('serves the consolidated platform settings workspace', () => {
    const matches = matchRoutes(router.routes, '/admin/platform-settings');
    expect(matches?.at(-1)?.route.path).toBe('platform-settings');
  });

  it.each([
    ['/admin/pilot-license-classes', 'pilot-license-classes'],
    ['/admin/finance-settings', 'finance-settings'],
    ['/admin/operations-settings', 'operations-settings'],
    ['/admin/ai-settings', 'ai-settings'],
  ])('keeps the legacy redirect route %s working', (path, expected) => {
    const matches = matchRoutes(router.routes, path);
    expect(matches?.at(-1)?.route.path).toBe(expected);
  });

  it.each([
    '/manager/finance-settings',
    '/manager/operations-settings',
    '/client/ai-settings',
  ])('does not expose admin-only legacy settings at %s', (path) => {
    const matches = matchRoutes(router.routes, path);
    expect(matches?.at(-1)?.route.path).toBe('*');
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

  it.each([
    ['/login', 'login'],
    ['/register', 'register'],
    ['/inspector/login', 'inspector/login'],
    ['/inspector/register', 'inspector/register'],
  ])('exposes separated Customer and Inspector auth route %s', (path, expected) => {
    const matches = matchRoutes(router.routes, path);
    expect(matches?.at(-1)?.route.path).toBe(expected);
  });
});
