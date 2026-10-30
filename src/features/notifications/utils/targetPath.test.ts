import { describe, expect, it } from 'vitest';
import { resolveSafeNotificationRoute } from './targetPath';

describe('resolveSafeNotificationRoute', () => {
  it('translates /inspections/:id to the current portal inspection detail route', () => {
    const route = resolveSafeNotificationRoute(
      '/inspections/3fa85f64-5717-4562-b3fc-2c963f66afa6',
      'operations',
      ['INSPECTOR'],
    );
    expect(route).toBe('/operations/inspections/3fa85f64-5717-4562-b3fc-2c963f66afa6');
  });

  it('translates inspection detail route for client workspace CUSTOMER', () => {
    const route = resolveSafeNotificationRoute(
      '/inspections/insp-100',
      'client',
      ['CUSTOMER'],
    );
    expect(route).toBe('/client/inspections/insp-100');
  });

  it('translates inspection subroutes when supported', () => {
    const route = resolveSafeNotificationRoute(
      '/inspections/insp-100/evidence',
      'operations',
      ['INSPECTOR'],
    );
    expect(route).toBe('/operations/inspections/insp-100/evidence');
  });

  it('migrates legacy preparation notifications to the self-service field session', () => {
    expect(
      resolveSafeNotificationRoute('/inspections/insp-100/preparation', 'operations', ['INSPECTOR']),
    ).toBe('/operations/inspections/insp-100/field-session');
  });

  it('translates maintenance paths when user has maintenance section access', () => {
    const route = resolveSafeNotificationRoute(
      '/maintenance/work-orders/wo-42',
      'operations',
      ['MAINTENANCE_ENGINEER'],
    );
    expect(route).toBe('/operations/maintenance');
  });

  it('translates reports paths when user has reports section access', () => {
    const route = resolveSafeNotificationRoute(
      '/reports/insp-100',
      'operations',
      ['INSPECTOR'],
    );
    expect(route).toBe('/operations/reports/insp-100');
  });

  it('derives portal from user roles when currentPortal is not provided', () => {
    const route = resolveSafeNotificationRoute(
      '/inspections/insp-200',
      null,
      ['INSPECTOR'],
    );
    expect(route).toBe('/operations/inspections/insp-200');
  });

  it('rejects external URLs', () => {
    expect(resolveSafeNotificationRoute('https://evil.com/inspections/1', 'operations', ['INSPECTOR'])).toBeNull();
    expect(resolveSafeNotificationRoute('http://evil.com', 'operations', ['INSPECTOR'])).toBeNull();
    expect(resolveSafeNotificationRoute('//evil.com/inspections/1', 'operations', ['INSPECTOR'])).toBeNull();
  });

  it('rejects dangerous protocols or invalid strings', () => {
    expect(resolveSafeNotificationRoute('javascript:alert(1)', 'operations', ['INSPECTOR'])).toBeNull();
    expect(resolveSafeNotificationRoute('data:text/html,test', 'operations', ['INSPECTOR'])).toBeNull();
    expect(resolveSafeNotificationRoute('', 'operations', ['INSPECTOR'])).toBeNull();
    expect(resolveSafeNotificationRoute(null, 'operations', ['INSPECTOR'])).toBeNull();
    expect(resolveSafeNotificationRoute(undefined, 'operations', ['INSPECTOR'])).toBeNull();
  });

  it('rejects unknown internal paths', () => {
    expect(resolveSafeNotificationRoute('/random/path', 'operations', ['INSPECTOR'])).toBeNull();
    expect(resolveSafeNotificationRoute('/api/v1/notifications', 'operations', ['INSPECTOR'])).toBeNull();
  });

  it('rejects paths to sections the user cannot access in that portal', () => {
    // Operations portal has no assets section for INSPECTOR
    expect(resolveSafeNotificationRoute('/assets/asset-1', 'operations', ['INSPECTOR'])).toBeNull();
  });
});
