import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderWithRouter } from '@/test/renderWithRouter';
import { useAuthStore } from '@/features/auth/store/authStore';
import ClientSubscriptionPage from './ClientSubscriptionPage';
import {
  subscriptionApi,
  type SubscriptionCurrentData,
} from '../api/subscriptionApi';

vi.mock('../utils/paypalRedirect', () => ({
  redirectToPayPalApproval: vi.fn(),
}));

import { redirectToPayPalApproval } from '../utils/paypalRedirect';

vi.mock('../api/subscriptionApi', () => ({
  subscriptionApi: {
    getCurrent: vi.fn(),
    create: vi.fn(),
    createPayPalOrder: vi.fn(),
    capturePayPalOrder: vi.fn(),
    listTransactions: vi.fn().mockResolvedValue([]),
  },
  subscriptionKeys: {
    all: ['subscriptions'],
    current: () => ['subscriptions', 'current'],
    transactions: (id: string) => ['subscriptions', 'transactions', id],
  },
}));

const mockedApi = vi.mocked(subscriptionApi);

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return renderWithRouter(
    <QueryClientProvider client={queryClient}>
      <ClientSubscriptionPage />
    </QueryClientProvider>,
  );
}

const mockSubscriptionData: SubscriptionCurrentData = {
  currentSubscription: {
    id: 'sub-1',
    organizationId: 'org-1',
    organizationName: 'Acme Drone Corp',
    planCode: 'ENTERPRISE',
    billingPeriodMonths: 12,
    status: 'ACTIVE',
    startsAt: '2026-10-01T00:00:00Z',
    endsAt: '2027-10-01T00:00:00Z',
    externalReference: 'PAYPAL:CAP-TEST-1234',
    agreedAmountUsd: 10200,
    termsSnapshot: null,
    confirmedByUserId: 'admin-1',
    confirmedAt: '2026-10-01T08:00:00Z',
    createdAt: '2026-10-01T07:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
  },
  history: [],
  termsPreview: {
    version: '2026.1',
    effectiveDate: '2026-10-01',
    planCode: 'ENTERPRISE',
    pricingTiers: [
      { billingPeriodMonths: 1, monthlyPriceUsd: 1200, totalPriceUsd: 1200, savingsPercent: 0 },
      { billingPeriodMonths: 6, monthlyPriceUsd: 1000, totalPriceUsd: 6000, savingsPercent: 16.7 },
      { billingPeriodMonths: 12, monthlyPriceUsd: 850, totalPriceUsd: 10200, savingsPercent: 29.2 },
    ],
    clauses: [
      { id: 'scope', title: 'Service Scope & Availability', text: '99.98% SLA guarantees.' },
      { id: 'responsibility', title: 'Operational Responsibility', text: 'Permits and pilot licensing.' },
      { id: 'payment', title: 'Offline Invoicing & Activation', text: 'Direct corporate wire transfer.' },
      { id: 'data', title: 'Data Sovereignty & Audit Retention', text: 'All data is customer property.' },
      { id: 'validity', title: 'Term & Termination', text: 'Valid for selected months.' },
    ],
  },
  paymentInstructions: {
    bankName: 'JPMorgan Chase Bank, N.A.',
    accountName: 'Smart Drone Inspection Platform Inc.',
    accountNumber: '849204810293',
    swiftBic: 'CHASUS33XXX',
    referenceCode: 'SDI-SUB-ACME-12M',
    amountUsd: 10200,
    currency: 'USD',
    instructions: 'Please initiate corporate wire transfer.',
  },
};

describe('ClientSubscriptionPage', () => {
  beforeEach(() => {
    useAuthStore.getState().setSession({
      accessToken: 'test-token',
      user: {
        id: 'user-1',
        email: 'org.manager@acme.test',
        fullName: 'Alice OrgManager',
        roles: ['ORG_MANAGER'],
        actorZone: 'CUSTOMER_ORGANIZATION',
        organizationId: 'org-1',
      },
    });
    mockedApi.getCurrent.mockResolvedValue(mockSubscriptionData);
  });

  afterEach(() => {
    cleanup();
    useAuthStore.getState().clearSession();
    vi.clearAllMocks();
  });

  it('renders active enterprise subscription status and coverage dates', async () => {
    renderPage();

    expect(await screen.findByText(/SmartDroneInspection Enterprise/i)).toBeTruthy();
    expect(screen.getAllByText(/Active/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/PAYPAL:CAP-TEST-1234/i)).toBeTruthy();
    expect(screen.getByText(/PayPal Orders v2 Hosted Approval/i)).toBeTruthy();
  });

  it('allows requesting a renewal with terms agreement and submits request', async () => {
    mockedApi.create.mockResolvedValue({
      ...mockSubscriptionData.currentSubscription!,
      id: 'sub-2',
      status: 'PENDING',
      billingPeriodMonths: 6,
    });

    renderPage();

    // Click "Renew Subscription" to open the form
    const renewButton = await screen.findByRole('button', { name: /Renew Subscription/i });
    fireEvent.click(renewButton);

    expect(screen.getByText(/Select Subscription Period/i)).toBeTruthy();

    // Select 6 Months
    const sixMonthsCard = screen.getByText('6 Months');
    fireEvent.click(sixMonthsCard);

    // Click terms checkbox
    const termsCheckbox = screen.getByRole('checkbox', {
      name: /I confirm that I am an authorized representative/i,
    });
    expect((termsCheckbox as HTMLInputElement).checked).toBe(false);
    fireEvent.click(termsCheckbox);
    expect((termsCheckbox as HTMLInputElement).checked).toBe(true);

    // Submit
    const submitButton = screen.getByRole('button', { name: /Submit Renewal Request/i });
    expect((submitButton as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockedApi.create).toHaveBeenCalledWith(
        expect.objectContaining({
          billingPeriodMonths: 6,
          agreeToTerms: true,
          termsVersion: '2026.1',
        }),
      );
    });
  });

  it('allows selecting custom months and proposing negotiated deal price', async () => {
    mockedApi.create.mockResolvedValue({
      ...mockSubscriptionData.currentSubscription!,
      id: 'sub-custom',
      status: 'PENDING',
      billingPeriodMonths: 24,
      agreedAmountUsd: 15000,
    });

    renderPage();

    const renewButton = await screen.findByRole('button', { name: /Renew Subscription/i });
    fireEvent.click(renewButton);

    // Click "Custom & Deal" card
    const customCard = screen.getByText('Custom & Deal');
    fireEvent.click(customCard);

    expect(screen.getByText(/Custom Duration & Commercial Deal Proposal/i)).toBeTruthy();

    // Toggle deal switch
    const dealSwitch = screen.getByRole('switch', {
      name: /Propose Custom Budget \/ Request Commercial Discount/i,
    });
    fireEvent.click(dealSwitch);

    // Fill in proposed budget and notes
    const proposedBudgetInput = screen.getByLabelText(/Proposed Total Budget in USD/i);
    fireEvent.change(proposedBudgetInput, { target: { value: '15000' } });

    const notesInput = screen.getByLabelText(/Proposal Rationale \/ Negotiation Notes/i);
    fireEvent.change(notesInput, {
      target: { value: 'Annual enterprise multi-facility agreement' },
    });

    // Agree to terms
    const termsCheckbox = screen.getByRole('checkbox', {
      name: /I confirm that I am an authorized representative/i,
    });
    fireEvent.click(termsCheckbox);

    // Submit
    const submitButton = screen.getByRole('button', { name: /Submit Renewal Request/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockedApi.create).toHaveBeenCalledWith(
        expect.objectContaining({
          billingPeriodMonths: 24,
          agreeToTerms: true,
          proposedPriceUsd: 15000,
          negotiationNotes: 'Annual enterprise multi-facility agreement',
        }),
      );
    });
  });

  it('retries a pending PayPal capture and clears the return state on success', async () => {
    mockedApi.getCurrent.mockResolvedValue({
      ...mockSubscriptionData,
      currentSubscription: {
        ...mockSubscriptionData.currentSubscription!,
        status: 'PENDING',
        externalReference: null,
      },
    });
    window.sessionStorage.setItem(
      'sdi-paypal-order',
      JSON.stringify({ orderId: 'ORDER-RETRY', subscriptionId: 'sub-1' }),
    );
    mockedApi.capturePayPalOrder.mockResolvedValue({
      id: 'txn-1',
      subscriptionId: 'sub-1',
      paypalOrderId: 'ORDER-RETRY',
      paypalCaptureId: 'CAPTURE-RETRY',
      amount: 10200,
      currency: 'USD',
      status: 'COMPLETED',
      payerEmail: null,
      capturedAt: '2026-10-22T00:00:00Z',
    });

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /Retry PayPal Capture/i }));

    await waitFor(() => {
      expect(mockedApi.capturePayPalOrder).toHaveBeenCalledWith({
        subscriptionId: 'sub-1',
        paypalOrderId: 'ORDER-RETRY',
      });
      expect(window.sessionStorage.getItem('sdi-paypal-order')).toBeNull();
    });
  });

  it('starts a real PayPal hosted approval instead of simulating capture', async () => {
    mockedApi.getCurrent.mockResolvedValue({
      ...mockSubscriptionData,
      currentSubscription: {
        ...mockSubscriptionData.currentSubscription!,
        status: 'PENDING',
        externalReference: null,
      },
    });
    mockedApi.createPayPalOrder.mockResolvedValue({
      paypalOrderId: 'PAYPAL-ORD-TEST-1234',
      status: 'CREATED',
      amount: 10200,
      currency: 'USD',
      approvalUrl: 'https://www.sandbox.paypal.com/checkoutnow?token=PAYPAL-ORD-TEST-1234',
    });

    renderPage();

    const paypalButton = await screen.findByRole('button', { name: /Checkout with PayPal/i });
    fireEvent.click(paypalButton);

    await waitFor(() => {
      expect(redirectToPayPalApproval).toHaveBeenCalledWith(
        'https://www.sandbox.paypal.com/checkoutnow?token=PAYPAL-ORD-TEST-1234',
      );
    });
    expect(mockedApi.capturePayPalOrder).not.toHaveBeenCalled();
    expect(screen.queryByText(/Sandbox Payment Authorization/i)).toBeNull();
  });
});
