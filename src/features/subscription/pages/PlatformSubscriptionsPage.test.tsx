import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderWithRouter } from '@/test/renderWithRouter';
import { useAuthStore } from '@/features/auth/store/authStore';
import PlatformSubscriptionsPage from './PlatformSubscriptionsPage';
import {
  subscriptionApi,
  type Subscription,
} from '../api/subscriptionApi';

vi.mock('../api/subscriptionApi', () => ({
  subscriptionApi: {
    platformList: vi.fn(),
    confirmPayment: vi.fn(),
  },
  subscriptionKeys: {
    all: ['subscriptions'],
    platformList: (status?: string) => ['subscriptions', 'platform', status ?? 'ALL'],
  },
}));

const mockedApi = vi.mocked(subscriptionApi);

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return renderWithRouter(
    <QueryClientProvider client={queryClient}>
      <PlatformSubscriptionsPage />
    </QueryClientProvider>,
  );
}

const mockSubscriptions: Subscription[] = [
  {
    id: 'sub-pending-1',
    organizationId: 'org-1',
    organizationName: 'Skyward Inspections',
    planCode: 'ENTERPRISE',
    billingPeriodMonths: 9,
    status: 'PENDING',
    startsAt: null,
    endsAt: null,
    externalReference: null,
    agreedAmountUsd: null,
    termsSnapshot: {
      termsVersion: '2026.1',
      agreedAt: '2026-10-21T10:00:00Z',
      agreedByUserId: 'user-1',
      agreedByUserEmail: 'admin@skyward.test',
      agreedByFullName: 'Sarah Skyward',
      planCode: 'ENTERPRISE',
      billingPeriodMonths: 9,
      standardMonthlyPriceUsd: 1000,
      standardTotalPriceUsd: 9000,
      standardSavingsPercent: 16.7,
      proposedPriceUsd: 8000,
      negotiationNotes: 'Requesting volume discount for 9-month bridge project',
      clauses: [
        { id: 'scope', title: 'Service Scope & Availability', text: '99.98% SLA guarantees.' },
      ],
    },
    confirmedByUserId: null,
    confirmedAt: null,
    createdAt: '2026-10-21T09:00:00Z',
    updatedAt: '2026-10-21T09:00:00Z',
  },
  {
    id: 'sub-active-2',
    organizationId: 'org-2',
    organizationName: 'Global Infrastructure Tech',
    planCode: 'ENTERPRISE',
    billingPeriodMonths: 6,
    status: 'ACTIVE',
    startsAt: '2026-10-01T00:00:00Z',
    endsAt: '2027-04-01T00:00:00Z',
    externalReference: 'WIRE-2026-CHASE-010',
    agreedAmountUsd: 5500,
    termsSnapshot: null,
    confirmedByUserId: 'admin-platform',
    confirmedAt: '2026-10-01T09:00:00Z',
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T09:00:00Z',
  },
];

describe('PlatformSubscriptionsPage', () => {
  beforeEach(() => {
    useAuthStore.getState().setSession({
      accessToken: 'test-token',
      user: {
        id: 'pm-platform',
        email: 'pm@platform.test',
        fullName: 'Platform Manager',
        roles: ['PLATFORM_MANAGER'],
        actorZone: 'PLATFORM',
        organizationId: null,
      },
    });
    mockedApi.platformList.mockResolvedValue(mockSubscriptions);
  });

  afterEach(() => {
    cleanup();
    useAuthStore.getState().clearSession();
    vi.clearAllMocks();
  });

  it('renders metric cards, custom periods, and proposed deal offers', async () => {
    renderPage();

    expect(await screen.findByText('Skyward Inspections')).toBeTruthy();
    expect(screen.getByText('Global Infrastructure Tech')).toBeTruthy();
    expect(screen.getByText(/WIRE-2026-CHASE-010/i)).toBeTruthy();
    expect(screen.getByText(/9 Months/i)).toBeTruthy();
    expect(screen.getByText(/Offer: \$8[.,]000 USD/i)).toBeTruthy();
  });

  it('shows read-only alert and hides Confirm & Activate button for ADMIN', async () => {
    useAuthStore.getState().setSession({
      accessToken: 'test-token',
      user: {
        id: 'admin-platform',
        email: 'admin@platform.test',
        fullName: 'Platform Admin',
        roles: ['ADMIN'],
        actorZone: 'PLATFORM',
        organizationId: null,
      },
    });

    renderPage();

    expect(await screen.findByText('Skyward Inspections')).toBeTruthy();
    expect(
      screen.getByText(
        /Read-only for Platform Admin — payment confirmation requires Platform Manager/i,
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Confirm & Activate/i })).toBeNull();
  });

  it('opens terms snapshot dialog and displays agreed terms metadata, deal proposal, and clauses', async () => {
    renderPage();

    const termsButton = await screen.findByRole('button', { name: /Terms/i });
    fireEvent.click(termsButton);

    expect(await screen.findByText(/Contract Terms Snapshot — Skyward Inspections/i)).toBeTruthy();
    expect(screen.getByText(/admin@skyward.test/i)).toBeTruthy();
    expect(screen.getByText(/Sarah Skyward/i)).toBeTruthy();
    expect(screen.getByText(/Proposed Budget: \$8[.,]000 USD/i)).toBeTruthy();
    expect(screen.getByText(/Requesting volume discount for 9-month bridge project/i)).toBeTruthy();
  });

  it('opens confirmation dialog and confirms wire payment with negotiated contract amount', async () => {
    mockedApi.confirmPayment.mockResolvedValue({
      ...mockSubscriptions[0]!,
      status: 'ACTIVE',
      externalReference: 'WIRE-2026-CONFIRMED-888',
      agreedAmountUsd: 7800,
      startsAt: '2026-10-21T00:00:00Z',
      endsAt: '2027-07-21T00:00:00Z',
    });

    renderPage();

    const confirmButton = await screen.findByRole('button', { name: /Confirm & Activate/i });
    fireEvent.click(confirmButton);

    expect(await screen.findByText(/Confirm Payment & Activate Subscription/i)).toBeTruthy();

    const refInput = screen.getByLabelText(/Bank Wire Statement \/ Invoice Reference/i);
    fireEvent.change(refInput, { target: { value: 'WIRE-2026-CONFIRMED-888' } });

    const amountInput = screen.getByLabelText(/Final Agreed Contract Amount in USD/i);
    fireEvent.change(amountInput, { target: { value: '7800' } });

    const dialogButtons = screen.getAllByRole('button', { name: /Confirm & Activate/i });
    const dialogConfirmButton = dialogButtons[dialogButtons.length - 1]!;
    fireEvent.click(dialogConfirmButton);

    await waitFor(() => {
      expect(mockedApi.confirmPayment).toHaveBeenCalledWith(
        'sub-pending-1',
        expect.objectContaining({
          externalReference: 'WIRE-2026-CONFIRMED-888',
          agreedAmountUsd: 7800,
        }),
      );
    });
  });
});
