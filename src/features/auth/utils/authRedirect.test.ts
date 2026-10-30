import { describe, expect, it } from 'vitest';
import { getAuthRedirectTarget, getLoginReturnTo } from './authRedirect';

describe('getAuthRedirectTarget', () => {
  it('routes canonical single-role users to their matching workspace', () => {
    expect(getAuthRedirectTarget(null, ['CUSTOMER'])).toBe('/client/dashboard');
    expect(getAuthRedirectTarget(null, ['INSPECTOR'])).toBe(
      '/operations/dashboard',
    );
    expect(getAuthRedirectTarget(null, ['MAINTENANCE_ENGINEER'])).toBe(
      '/operations/dashboard',
    );
    expect(getAuthRedirectTarget(null, ['ADMIN'])).toBe('/admin/dashboard');
    expect(getAuthRedirectTarget(null, ['MANAGER'])).toBe('/admin/dashboard');
  });

  it('asks a cross-workspace user to choose a workspace', () => {
    expect(getAuthRedirectTarget(null, ['CUSTOMER', 'INSPECTOR'])).toBe(
      '/portals',
    );
  });

  it('preserves an authorized internal destination, query, and hash', () => {
    expect(
      getAuthRedirectTarget('/client/assets?sort=name#owned', ['CUSTOMER']),
    ).toBe('/client/assets?sort=name#owned');
  });

  it('falls back to the role workspace for an unauthorized return destination', () => {
    expect(getAuthRedirectTarget('/admin/dashboard', ['CUSTOMER'])).toBe(
      '/client/dashboard',
    );
  });

  it('falls back to the role workspace for a screen unavailable to that role', () => {
    expect(getAuthRedirectTarget('/operations/assets', ['INSPECTOR'])).toBe(
      '/operations/dashboard',
    );
  });

  it('does not accept external or protocol-relative return URLs', () => {
    expect(
      getAuthRedirectTarget('https://example.com/steal', ['CUSTOMER']),
    ).toBe('/client/dashboard');
    expect(getAuthRedirectTarget('//example.com/steal', ['CUSTOMER'])).toBe(
      '/client/dashboard',
    );
  });

  it('does not send a signed-in user back to a public auth page', () => {
    expect(getAuthRedirectTarget('/login', ['ADMIN'])).toBe('/admin/dashboard');
    expect(getAuthRedirectTarget('/register', ['ADMIN'])).toBe(
      '/admin/dashboard',
    );
  });

  it('normalizes an authorized legacy feature URL through the portal policy', () => {
    expect(getAuthRedirectTarget('/inspections', ['INSPECTOR'])).toBe(
      '/operations/inspections',
    );
  });
});

describe('getLoginReturnTo', () => {
  it('keeps the attempted protected location from router state', () => {
    expect(
      getLoginReturnTo(
        { pathname: '/client/reports', search: '?range=month', hash: '#latest' },
        null,
      ),
    ).toBe('/client/reports?range=month#latest');
  });

  it('uses the explicit return URL when present', () => {
    expect(getLoginReturnTo({ pathname: '/admin' }, '/client/assets')).toBe(
      '/client/assets',
    );
  });

  it('ignores malformed router state', () => {
    expect(getLoginReturnTo({ search: '?q=1' }, null)).toBeNull();
  });
});
