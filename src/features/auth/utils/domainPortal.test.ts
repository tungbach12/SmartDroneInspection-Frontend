import { describe, expect, it } from 'vitest';
import { getPortalForHost, getWorkspaceKind } from './domainPortal';

describe('getPortalForHost', () => {
  it('maps the admin domain to the admin portal', () => {
    expect(getPortalForHost('smartdroneinspection-admin.example.com')).toBe(
      'admin',
    );
  });

  it('does not map a retired provider domain to an application portal', () => {
    expect(getPortalForHost('smartdroneinspection-provider.example.com')).toBeNull();
  });

  it('does not identify a retired provider domain as a separate workspace', () => {
    expect(getWorkspaceKind('smartdroneinspection-provider.example.com')).toBe('main');
  });

  it('maps the operations domain to the operations portal', () => {
    expect(getPortalForHost('smartdroneinspection-operations.example.com')).toBe(
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
