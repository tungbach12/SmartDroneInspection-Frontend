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

  it('translates partner-onboarding notifications for INSPECTOR', () => {
    expect(resolveSafeNotificationRoute('/partner-onboarding', 'operations', ['INSPECTOR'])).toBe(
      '/operations/partner-onboarding',
    );
    expect(resolveSafeNotificationRoute('/partner-onboarding', 'client', ['CUSTOMER'])).toBeNull();
  });

  it('translates onboarding-reviews notifications for MANAGER', () => {
    expect(resolveSafeNotificationRoute('/onboarding-reviews', 'manager', ['MANAGER'])).toBe(
      '/manager/onboarding-reviews',
    );
    expect(resolveSafeNotificationRoute('/onboarding-reviews', 'operations', ['INSPECTOR'])).toBeNull();
  });

  it('rejects paths to sections the user cannot access in that portal', () => {
    // Operations portal has no assets section for INSPECTOR
    expect(resolveSafeNotificationRoute('/assets/asset-1', 'operations', ['INSPECTOR'])).toBeNull();
  });

  it('supports portal-prefixed paths emitted by backend notification services', () => {
    expect(
      resolveSafeNotificationRoute(
        '/operations/inspections/10c8aec4-56b5-4a19-af70-26b36cd48e47',
        'operations',
        ['INSPECTOR'],
      ),
    ).toBe('/operations/inspections/10c8aec4-56b5-4a19-af70-26b36cd48e47');

    expect(
      resolveSafeNotificationRoute('/operations/inspections', 'operations', ['INSPECTOR']),
    ).toBe('/operations/inspections');

    expect(
      resolveSafeNotificationRoute(
        '/manager/inspections/77f9c283-a68f-4d06-b7f6-5871dcdceb99',
        'manager',
        ['MANAGER'],
      ),
    ).toBe('/manager/inspections/77f9c283-a68f-4d06-b7f6-5871dcdceb99');

    expect(
      resolveSafeNotificationRoute(
        '/client/inspections/ff8905e2-48bf-4690-8023-1a8f28afd5ce/tracking',
        'client',
        ['CUSTOMER'],
      ),
    ).toBe('/client/inspections/ff8905e2-48bf-4690-8023-1a8f28afd5ce/tracking');
  });

  it('rejects portal-prefixed paths when user lacks access to that portal', () => {
    expect(
      resolveSafeNotificationRoute(
        '/manager/inspections/77f9c283-a68f-4d06-b7f6-5871dcdceb99',
        'operations',
        ['INSPECTOR'],
      ),
    ).toBeNull();
  });

  it('keeps a validated requestId deep link for service-request notifications', () => {
    expect(
      resolveSafeNotificationRoute(
        '/manager/contracts?requestId=189ba66d-3153-48f6-b1c2-105d345b44df',
        'manager',
        ['MANAGER'],
      ),
    ).toBe('/manager/contracts?requestId=189ba66d-3153-48f6-b1c2-105d345b44df');
  });

  it('drops unsafe or unrelated query params from contract notification targets', () => {
    expect(
      resolveSafeNotificationRoute('/manager/contracts?requestId=<script>', 'manager', ['MANAGER']),
    ).toBe('/manager/contracts');
    expect(
      resolveSafeNotificationRoute('/manager/contracts?next=https://evil.test', 'manager', [
        'MANAGER',
      ]),
    ).toBe('/manager/contracts');
    expect(
      resolveSafeNotificationRoute('/manager/contracts?requestId=req-1', 'operations', [
        'INSPECTOR',
      ]),
    ).toBeNull();
  });
});
