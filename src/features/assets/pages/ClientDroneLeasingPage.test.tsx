import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderWithRouter } from '@/test/renderWithRouter';
import { useAuthStore } from '@/features/auth/store/authStore';
import { redirectToPayPalApproval } from '@/features/subscription/utils/paypalRedirect';
import ClientDroneLeasingPage from './ClientDroneLeasingPage';
import {
  droneLeaseApi,
  type DroneLease,
  type PlatformDrone,
} from '../api/droneLeaseApi';

vi.mock('@/features/subscription/utils/paypalRedirect', () => ({
  redirectToPayPalApproval: vi.fn(),
}));

vi.mock('../api/droneLeaseApi', () => ({
  droneLeaseApi: {
    listAvailableDrones: vi.fn(),
    listOrganizationLeases: vi.fn(),
    requestLease: vi.fn(),
    createPayPalOrder: vi.fn(),
    capturePayPalOrder: vi.fn(),
  },
  droneLeaseKeys: {
    all: ['drone-leases'],
    availableDrones: () => ['drone-leases', 'available-drones'],
    organizationLeases: () => ['drone-leases', 'organization'],
  },
}));

const mockedApi = vi.mocked(droneLeaseApi);

const mockAvailableDrones: PlatformDrone[] = [
  {
    id: 'pool-1',
    serialNumber: 'SDI-POOL-001',
    model: 'Matrice 350 RTK',
    manufacturer: 'DJI',
    payloadMetadata: '{"camera":"Zenmuse H20T"}',
    monthlyRateUsd: 500,
    status: 'AVAILABLE',
    notes: 'Enterprise thermal package',
  },
];

const mockOrgLeases: DroneLease[] = [
  {
    id: 'lease-pending-1',
    platformDroneId: 'pool-1',
    serialNumber: 'SDI-POOL-001',
    model: 'Matrice 350 RTK',
    manufacturer: 'DJI',
    organizationId: 'org-1',
    organizationName: 'Acme Infrastructure',
    customerDroneId: null,
    leasePeriodMonths: 6,
    monthlyRateUsd: 500,
    agreedAmountUsd: 3000,
    status: 'PENDING',
    startsAt: null,
    endsAt: null,
    reclaimedAt: null,
    externalReference: null,
    wireReferenceCode: 'SDI-LEASE-12345678',
    paypalOrderId: null,
    paypalCaptureId: null,
    confirmedByUserId: null,
    confirmedAt: null,
    notes: 'Bridge campaign',
    createdAt: '2026-10-10T00:00:00Z',
    updatedAt: '2026-10-10T00:00:00Z',
  },
  {
    id: 'lease-active-2',
    platformDroneId: 'pool-2',
    serialNumber: 'SDI-POOL-002',
    model: 'Skydio X10',
    manufacturer: 'Skydio',
    organizationId: 'org-1',
    organizationName: 'Acme Infrastructure',
    customerDroneId: 'cust-drone-2',
    leasePeriodMonths: 12,
    monthlyRateUsd: 650,
    agreedAmountUsd: 7800,
    status: 'ACTIVE',
    startsAt: '2026-10-01T00:00:00Z',
    endsAt: '2027-10-01T00:00:00Z',
    reclaimedAt: null,
    externalReference: 'WIRE-LEASE-2026-99',
    wireReferenceCode: 'SDI-LEASE-87654321',
    paypalOrderId: null,
    paypalCaptureId: null,
    confirmedByUserId: 'pm-1',
    confirmedAt: '2026-10-01T09:00:00Z',
    notes: null,
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T09:00:00Z',
  },
];

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return renderWithRouter(
    <QueryClientProvider client={queryClient}>
      <ClientDroneLeasingPage />
    </QueryClientProvider>,
  );
}

describe('ClientDroneLeasingPage', () => {
  beforeEach(() => {
    useAuthStore.getState().setSession({
      accessToken: 'test-token',
      user: {
        id: 'org-manager-1',
        email: 'manager@acme.test',
        fullName: 'Organization Manager',
        roles: ['CUSTOMER'],
        actorZone: 'CUSTOMER_ORGANIZATION',
        organizationId: 'org-1',
      },
    });
    mockedApi.listAvailableDrones.mockResolvedValue(mockAvailableDrones);
    mockedApi.listOrganizationLeases.mockResolvedValue(mockOrgLeases);
  });

  afterEach(() => {
    cleanup();
    useAuthStore.getState().clearSession();
    vi.clearAllMocks();
  });

  it('displays available drones and submits a lease request with calculated price', async () => {
    mockedApi.requestLease.mockResolvedValue(mockOrgLeases[0]!);

    renderPage();

    expect(await screen.findByText('SDI-POOL-001')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Request Lease/i }));

    expect(await screen.findByText(/Request Drone Lease — SDI-POOL-001/i)).toBeTruthy();

    const monthsInput = screen.getByLabelText(/Lease Duration \(Months\)/i);
    fireEvent.change(monthsInput, { target: { value: '12' } });

    expect(screen.getByText(/\$6[.,]000 USD/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Submit Lease Request/i }));

    await waitFor(() => {
      expect(mockedApi.requestLease).toHaveBeenCalledWith(
        expect.objectContaining({
          platformDroneId: 'pool-1',
          leasePeriodMonths: 12,
        }),
      );
    });
  });

  it('shows pending wire reference, initiates PayPal checkout, and links active leases to fleet inventory', async () => {
    mockedApi.createPayPalOrder.mockResolvedValue({
      orderId: 'PAYPAL-LEASE-ORD-1',
      status: 'CREATED',
      approvalUrl: 'https://www.sandbox.paypal.com/checkoutnow?token=PAYPAL-LEASE-ORD-1',
    });

    renderPage();

    expect(await screen.findByText(/SDI-LEASE-12345678/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /View in Fleet Inventory/i })).toBeTruthy();

    const paypalButton = screen.getByRole('button', { name: /Pay with PayPal/i });
    fireEvent.click(paypalButton);

    await waitFor(() => {
      expect(mockedApi.createPayPalOrder).toHaveBeenCalledWith('lease-pending-1');
      expect(redirectToPayPalApproval).toHaveBeenCalledWith(
        'https://www.sandbox.paypal.com/checkoutnow?token=PAYPAL-LEASE-ORD-1',
      );
    });
  });
});
