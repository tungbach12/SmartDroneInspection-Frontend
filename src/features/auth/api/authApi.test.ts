import { beforeEach, describe, expect, it, vi } from 'vitest';

const transport = vi.hoisted(() => ({
  postWithBrowserCsrf: vi.fn(),
  apiPost: vi.fn(),
}));

vi.mock('@/shared/api/client', () => ({
  api: { post: transport.apiPost },
  postWithBrowserCsrf: transport.postWithBrowserCsrf,
  withBrowserRefreshLock: (operation: () => Promise<unknown>) => operation(),
}));

import * as authApi from './authApi';
import {
  completeInitialPasswordSetup,
  changePassword,
  evaluateAirspace,
  login,
  logoutAllSessions,
  logoutCurrentSession,
  registerOrganization,
  restoreBrowserSession,
  submitPartnerApplication,
  uploadPartnerLicense,
} from './authApi';


const user = {
  id: 'user-1',
  email: 'org-manager@example.com',
  fullName: 'Organization Manager',
  roles: ['CUSTOMER'],
  actorZone: 'CUSTOMER_ORGANIZATION',
  organizationId: 'org-1',
  visionFallbackEnabled: true,
};

const authenticatedFlow = {
  step: 'AUTHENTICATED',
  accessToken: 'memory-only-access-token',
  accessTokenExpiresInSeconds: 900,
  user: {
    ...user,
    pilotLicenseNumber: undefined,
    pilotLicenseClass: undefined,
    pilotLicenseExpiresAt: undefined,
    pilotLicenseFileKey: undefined,
  },
};

describe('browser auth API', () => {
  beforeEach(() => {
    transport.postWithBrowserCsrf.mockReset();
    transport.apiPost.mockReset();
  });

  it('does not expose retired provider onboarding or team APIs', () => {
    expect(authApi).not.toHaveProperty('registerProvider');
    expect(authApi).not.toHaveProperty('activateProvider');
    expect(authApi).not.toHaveProperty('createProviderUser');
  });

  it('obtains CSRF protection before login and returns no refresh credential', async () => {
    transport.postWithBrowserCsrf.mockResolvedValue({ data: authenticatedFlow });

    const result = await login('org-admin@example.com', 'secret password');

    expect(transport.postWithBrowserCsrf).toHaveBeenCalledWith('/auth/login', {
      email: 'org-admin@example.com',
      password: 'secret password',
    }, 30_000);
    expect(result).toEqual(authenticatedFlow);
    expect(result.user.visionFallbackEnabled).toBe(true);
    expect(result.user).not.toHaveProperty('providerId');
    expect(result).not.toHaveProperty('refreshToken');
  });

  it('normalizes backend customer and manager roles to the existing frontend role keys', async () => {
    transport.postWithBrowserCsrf.mockResolvedValue({
      data: {
        ...authenticatedFlow,
        user: {
          ...user,
          roles: [
            'ADMIN',
            'MANAGER',
            'CUSTOMER',
            'INSPECTOR',
            'MAINTENANCE_ENGINEER',
            'UNKNOWN_ROLE',
          ],
        },
      },
    });

    const result = await login('org-manager@example.com', 'secret password');

    expect(result.user.roles).toEqual([
      'ADMIN',
      'MANAGER',
      'CUSTOMER',
      'INSPECTOR',
      'MAINTENANCE_ENGINEER',
    ]);
  });

  it('rejects actor zones outside the canonical platform and organization zones', async () => {
    transport.postWithBrowserCsrf.mockResolvedValue({
      data: {
        ...authenticatedFlow,
        user: { ...user, actorZone: 'SERVICE_WORKFORCE' },
      },
    });

    await expect(login('org-admin@example.com', 'secret password')).rejects.toThrow(
      'The server returned an invalid account profile.',
    );
  });

  it('keeps the mandatory first-password step separate from an authenticated session', async () => {
    transport.postWithBrowserCsrf.mockResolvedValue({
      data: {
        step: 'PASSWORD_CHANGE_REQUIRED',
        accessTokenExpiresInSeconds: 0,
        user,
      },
    });

    const result = await login('org-admin@example.com', 'temporary password');

    expect(result.step).toBe('PASSWORD_CHANGE_REQUIRED');
    expect(result.accessToken).toBeNull();
  });

  it('completes the required first-password setup and allows the server to set its cookie', async () => {
    transport.postWithBrowserCsrf.mockResolvedValue({ data: authenticatedFlow });

    await completeInitialPasswordSetup(
      'admin@example.com',
      'temporary password',
      'a much longer secure password',
    );

    expect(transport.postWithBrowserCsrf).toHaveBeenCalledWith(
      '/auth/password/setup',
      {
      email: 'admin@example.com',
      currentPassword: 'temporary password',
      password: 'a much longer secure password',
      },
      30_000,
    );
  });

  it('restores the browser session only through the cookie-backed refresh endpoint', async () => {
    transport.postWithBrowserCsrf.mockResolvedValue({ data: authenticatedFlow });

    const result = await restoreBrowserSession();

    expect(transport.postWithBrowserCsrf).toHaveBeenCalledWith(
      '/auth/refresh',
      undefined,
      5_000,
    );
    expect(result.accessToken).toBe('memory-only-access-token');
  });

  it('registers an organization and normalizes canonical role data', async () => {
    transport.postWithBrowserCsrf.mockResolvedValue({
      data: {
        registrationStatus: 'ACTIVE',
        organizationId: 'org-1',
        organizationName: 'Example Org',
        organizationCode: 'EXAMPLE',
        user: { ...user, roles: ['CUSTOMER', 'UNKNOWN_ROLE'] },
      },
    });

    const result = await registerOrganization({
      email: 'org-manager@example.com',
      fullName: 'Organization Manager',
      organizationName: 'Example Org',
      organizationCode: 'EXAMPLE',
      password: 'a much longer secure password',
      firstAsset: {
        code: 'AST-001',
        name: 'Example bridge',
        categoryId: 'cat-1',
        locationText: 'District 1',
        latitude: 10.9,
        longitude: 106.7,
      },
    });

    expect(transport.postWithBrowserCsrf).toHaveBeenCalledWith('/auth/register', {
      email: 'org-manager@example.com',
      fullName: 'Organization Manager',
      organizationName: 'Example Org',
      organizationCode: 'EXAMPLE',
      password: 'a much longer secure password',
      firstAsset: {
        code: 'AST-001',
        name: 'Example bridge',
        categoryId: 'cat-1',
        locationText: 'District 1',
        latitude: 10.9,
        longitude: 106.7,
      },
    });
    expect(result.organizationCode).toBe('EXAMPLE');
    expect(result.user.roles).toEqual(['CUSTOMER']);
  });

  it('uses CSRF-protected browser endpoints for one-device and all-device logout', async () => {
    transport.postWithBrowserCsrf.mockResolvedValue({ data: undefined });

    await logoutCurrentSession();
    await logoutAllSessions();

    expect(transport.postWithBrowserCsrf).toHaveBeenNthCalledWith(1, '/auth/logout');
    expect(transport.postWithBrowserCsrf).toHaveBeenNthCalledWith(2, '/auth/logout-all');
  });

  it('changes the authenticated account password through the browser API', async () => {
    transport.postWithBrowserCsrf.mockResolvedValue({ data: undefined });

    await changePassword('current password', 'a much longer secure password');

    expect(transport.postWithBrowserCsrf).toHaveBeenCalledWith(
      '/auth/password/change',
      {
        currentPassword: 'current password',
        newPassword: 'a much longer secure password',
      },
    );
  });

  it('supports five canonical roles including CUSTOMER and MANAGER, and partner/prospect actor zones', async () => {
    transport.postWithBrowserCsrf.mockResolvedValue({
      data: {
        ...authenticatedFlow,
        user: {
          ...user,
          roles: ['CUSTOMER', 'MANAGER'],
          actorZone: 'INSPECTOR_PARTNER',
        },
      },
    });

    const result = await login('partner@example.com', 'secret password');
    expect(result.user.roles).toEqual(['CUSTOMER', 'MANAGER']);
    expect(result.user.actorZone).toBe('INSPECTOR_PARTNER');
  });

  it('accepts first asset data and handles pending airspace review response in customer registration', async () => {
    transport.postWithBrowserCsrf.mockResolvedValue({
      data: {
        registrationStatus: 'PENDING_AIRSPACE_REVIEW',
        organizationId: null,
        organizationName: 'Example Org',
        organizationCode: 'EXAMPLE',
        airspaceClassification: 'UNKNOWN',
        reviewMessage: 'Coordinates fall outside published advisory zones; manual review required.',
        airspaceReviewId: 'review-123',
        user: {
          ...user,
          roles: ['CUSTOMER'],
          actorZone: 'PROSPECT_CUSTOMER',
          organizationId: null,
        },
      },
    });

    const result = await registerOrganization({
      email: 'customer@example.com',
      fullName: 'Customer Admin',
      organizationName: 'Example Org',
      organizationCode: 'EXAMPLE',
      password: 'a much longer secure password',
      firstAsset: {
        code: 'AST-BRIDGE-01',
        name: 'Main Bridge',
        categoryId: 'cat-uuid-1',
        locationText: 'Ho Chi Minh City',
        latitude: 10.9,
        longitude: 106.7,
      },
    });

    expect(transport.postWithBrowserCsrf).toHaveBeenCalledWith('/auth/register', {
      email: 'customer@example.com',
      fullName: 'Customer Admin',
      organizationName: 'Example Org',
      organizationCode: 'EXAMPLE',
      password: 'a much longer secure password',
      firstAsset: {
        code: 'AST-BRIDGE-01',
        name: 'Main Bridge',
        categoryId: 'cat-uuid-1',
        locationText: 'Ho Chi Minh City',
        latitude: 10.9,
        longitude: 106.7,
      },
    });
    expect(result.registrationStatus).toBe('PENDING_AIRSPACE_REVIEW');
    expect(result.airspaceReviewId).toBe('review-123');
    expect(result.user.actorZone).toBe('PROSPECT_CUSTOMER');
  });

  it('evaluates airspace advisory before submission', async () => {
    transport.postWithBrowserCsrf.mockResolvedValue({
      data: {
        latitude: 10.8188,
        longitude: 106.6519,
        classification: 'NO_FLY_ZONE',
        messageCode: 'MSG28',
        advisoryMessage: 'The coordinates fall in a published no-fly advisory circle. Registration is blocked.',
        portalUrl: 'https://cambay.mod.gov.vn',
        matchingZones: [],
        nearbyZones: [],
      },
    });

    const evaluation = await evaluateAirspace(10.8188, 106.6519);
    expect(transport.postWithBrowserCsrf).toHaveBeenCalledWith('/airspace/evaluate', {
      latitude: 10.8188,
      longitude: 106.6519,
    });
    expect(evaluation.classification).toBe('NO_FLY_ZONE');
    expect(evaluation.portalUrl).toBe('https://cambay.mod.gov.vn');
  });

  it('submits inspector partner application without requiring a drone upfront', async () => {
    transport.postWithBrowserCsrf.mockResolvedValue({
      data: {
        id: 'app-999',
        status: 'SUBMITTED',
        email: 'inspector.partner@example.com',
        fullName: 'Nguyen Van A',
      },
    });

    const response = await submitPartnerApplication({
      email: 'inspector.partner@example.com',
      fullName: 'Nguyen Van A',
      phone: '0901234567',
      pilotLicenseNumber: 'VN-DRONE-LIC-1234',
      pilotLicenseClass: 'CLASS_A',
      pilotLicenseExpiresAt: '2027-12-31',
      pilotLicenseFileKey: 'licenses/lic-1234.pdf',
    });

    expect(transport.postWithBrowserCsrf).toHaveBeenCalledWith('/inspector-partner-applications', {
      email: 'inspector.partner@example.com',
      fullName: 'Nguyen Van A',
      phone: '0901234567',
      pilotLicenseNumber: 'VN-DRONE-LIC-1234',
      pilotLicenseClass: 'CLASS_A',
      pilotLicenseExpiresAt: '2027-12-31',
      pilotLicenseFileKey: 'licenses/lic-1234.pdf',
    });
    expect(response.id).toBe('app-999');
    expect(response.status).toBe('SUBMITTED');
  });

  it('uploads partner license and returns server-generated file key', async () => {
    transport.apiPost.mockResolvedValue({ data: { data: { fileKey: 'inspector-partner-applications/licenses/00000000-0000-0000-0000-000000000000.pdf' } } });
    const file = new File(['%PDF-1.7'], 'license.pdf', { type: 'application/pdf' });

    await expect(uploadPartnerLicense(file)).resolves.toContain('/licenses/');
    expect(transport.apiPost).toHaveBeenCalledWith('/inspector-partner-applications/license-document', expect.any(FormData));
  });
});
