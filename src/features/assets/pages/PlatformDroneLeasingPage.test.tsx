import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderWithRouter } from '@/test/renderWithRouter';
import { useAuthStore } from '@/features/auth/store/authStore';
import PlatformDroneLeasingPage from './PlatformDroneLeasingPage';
import {
  droneLeaseApi,
  type DroneLease,
  type PlatformDrone,
} from '../api/droneLeaseApi';

vi.mock('../api/droneLeaseApi', () => ({
  droneLeaseApi: {
    listPool: vi.fn(),
    createPoolDrone: vi.fn(),
    updatePoolDroneStatus: vi.fn(),
    listPlatformLeases: vi.fn(),
    confirmPayment: vi.fn(),
    reclaimLease: vi.fn(),
  },
  droneLeaseKeys: {
    all: ['drone-leases'],
    pool: () => ['drone-leases', 'pool'],
    platformLeases: (status?: string) => ['drone-leases', 'platform', status ?? 'ALL'],
  },
}));

const mockedApi = vi.mocked(droneLeaseApi);

const mockPoolDrones: PlatformDrone[] = [
  {
    id: 'pool-1',
    serialNumber: 'SDI-POOL-001',
    model: 'Matrice 350 RTK',
    manufacturer: 'DJI',
    payloadMetadata: '{"camera":"Zenmuse H20T"}',
    monthlyRateUsd: 500,
    status: 'AVAILABLE',
    notes: 'Enterprise thermal package',
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  },
  {
    id: 'pool-2',
    serialNumber: 'SDI-POOL-002',
    model: 'Skydio X10',
    manufacturer: 'Skydio',
    payloadMetadata: null,
    monthlyRateUsd: 650,
    status: 'LEASED',
    notes: null,
    createdAt: '2026-10-02T00:00:00Z',
    updatedAt: '2026-10-02T00:00:00Z',
  },
];

const mockLeases: DroneLease[] = [
  {
    id: 'lease-pending-1',
    platformDroneId: 'pool-1',
    serialNumber: 'SDI-POOL-001',
    model: 'Matrice 350 RTK',
    manufacturer: 'DJI',
    organizationId: 'org-1',
    organizationName: 'Skyward Inspections',
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
    notes: 'Bridge campaign lease',
    createdAt: '2026-10-10T00:00:00Z',
    updatedAt: '2026-10-10T00:00:00Z',
  },
  {
    id: 'lease-active-2',
    platformDroneId: 'pool-2',
    serialNumber: 'SDI-POOL-002',
    model: 'Skydio X10',
    manufacturer: 'Skydio',
    organizationId: 'org-2',
    organizationName: 'Nordic Energy',
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
      <PlatformDroneLeasingPage />
    </QueryClientProvider>,
  );
}

describe('PlatformDroneLeasingPage', () => {
  beforeEach(() => {
    useAuthStore.getState().setSession({
      accessToken: 'test-token',
      user: {
        id: 'pm-1',
        email: 'pm@platform.test',
        fullName: 'Platform Manager',
        roles: ['PLATFORM_MANAGER'],
        actorZone: 'PLATFORM',
        organizationId: null,
      },
    });
    mockedApi.listPool.mockResolvedValue(mockPoolDrones);
    mockedApi.listPlatformLeases.mockResolvedValue(mockLeases);
  });

  afterEach(() => {
    cleanup();
    useAuthStore.getState().clearSession();
    vi.clearAllMocks();
  });

  it('allows PLATFORM_MANAGER to view pool and add a new leasable drone', async () => {
    mockedApi.createPoolDrone.mockResolvedValue({
      ...mockPoolDrones[0]!,
      id: 'pool-3',
      serialNumber: 'SDI-POOL-003',
    });

    renderPage();

    expect(await screen.findByText('SDI-POOL-001')).toBeTruthy();
    expect(screen.getByText('SDI-POOL-002')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Add leasable drone/i }));

    fireEvent.change(await screen.findByLabelText(/^Serial Number/i), {
      target: { value: 'SDI-POOL-003' },
    });
    fireEvent.change(screen.getByLabelText(/^Model/i), {
      target: { value: 'Freefly Astro' },
    });
    fireEvent.change(screen.getByLabelText(/Monthly Rate \(USD\)/i), {
      target: { value: '550' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^Add Drone$/i }));

    await waitFor(() => {
      expect(mockedApi.createPoolDrone).toHaveBeenCalledWith(
        expect.objectContaining({
          serialNumber: 'SDI-POOL-003',
          model: 'Freefly Astro',
          monthlyRateUsd: 550,
        }),
      );
    });
  });

  it('allows PLATFORM_MANAGER to confirm payment & provision pending lease and reclaim active lease', async () => {
    mockedApi.confirmPayment.mockResolvedValue({
      ...mockLeases[0]!,
      status: 'ACTIVE',
      externalReference: 'WIRE-CONFIRMED-001',
    });
    mockedApi.reclaimLease.mockResolvedValue({
      ...mockLeases[1]!,
      status: 'RECLAIMED',
    });

    renderPage();

    fireEvent.click(
      await screen.findByRole('tab', { name: /Lease Contracts & Reconciliation/i }),
    );

    expect(await screen.findByText('Skyward Inspections')).toBeTruthy();
    expect(screen.getByText('Nordic Energy')).toBeTruthy();

    // Reclaim active lease
    fireEvent.click(screen.getByRole('button', { name: /Reclaim Drone/i }));
    await waitFor(() => {
      expect(mockedApi.reclaimLease).toHaveBeenCalledWith(
        'lease-active-2',
        expect.any(Object),
      );
    });

    // Confirm pending lease
    fireEvent.click(screen.getByRole('button', { name: /Confirm Payment & Provision/i }));
    fireEvent.change(
      await screen.findByLabelText(/Bank Wire Statement \/ External Reference/i),
      { target: { value: 'WIRE-CONFIRMED-001' } },
    );
    fireEvent.click(screen.getByRole('button', { name: /^Confirm & Provision$/i }));

    await waitFor(() => {
      expect(mockedApi.confirmPayment).toHaveBeenCalledWith(
        'lease-pending-1',
        expect.objectContaining({
          externalReference: 'WIRE-CONFIRMED-001',
        }),
      );
    });
  });

  it('renders read-only view for ADMIN and hides pool/lease write controls', async () => {
    useAuthStore.getState().setSession({
      accessToken: 'test-token',
      user: {
        id: 'admin-1',
        email: 'admin@platform.test',
        fullName: 'Platform Admin',
        roles: ['ADMIN'],
        actorZone: 'PLATFORM',
        organizationId: null,
      },
    });

    renderPage();

    expect(await screen.findByText('SDI-POOL-001')).toBeTruthy();
    expect(
      screen.getByText(
        /Read-only for Platform Admin — drone pool and lease reconciliation require Platform Manager/i,
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Add leasable drone/i })).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: /Lease Contracts & Reconciliation/i }));
    expect(await screen.findByText('Skyward Inspections')).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: /Confirm Payment & Provision/i }),
    ).toBeNull();
    expect(screen.queryByRole('button', { name: /Reclaim Drone/i })).toBeNull();
  });
});
