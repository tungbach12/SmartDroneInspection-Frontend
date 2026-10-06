import { describe, expect, it } from 'vitest';
import { getPortalForHost } from './domainPortal';

describe('getPortalForHost', () => {
  it('maps the admin domain to the admin portal', () => {
    expect(getPortalForHost('smartdroneinspection-admin.example.com')).toBe(
      'admin',
    );
  });

  it('maps the provider domain to the operations portal', () => {
    expect(getPortalForHost('smartdroneinspection-provider.example.com')).toBe(
      'operations',
    );
  });

  it('returns null for the main domain', () => {
    expect(getPortalForHost('smartdroneinspection.example.com')).toBeNull();
    expect(getPortalForHost('www.smartdroneinspection.com')).toBeNull();
  });

  it('returns null for localhost', () => {
    expect(getPortalForHost('localhost')).toBeNull();
    expect(getPortalForHost('localhost:3000')).toBeNull();
  });
});
