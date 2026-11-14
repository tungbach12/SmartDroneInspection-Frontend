import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FinanceHistoryPage from './FinanceHistoryPage';

const mocks = vi.hoisted(() => ({
  roles: ['CUSTOMER'] as string[],
  listCustomer: vi.fn(),
  listInspector: vi.fn(),
  getCustomerDetail: vi.fn(),
  getInspectorDetail: vi.fn(),
}));

vi.mock('@/features/auth/store/authStore', () => ({
  useAuthStore: (selector: (state: { roles: string[] }) => unknown) => selector({ roles: mocks.roles }),
}));

vi.mock('@/shared/i18n/LocaleProvider', () => ({
  useLocale: () => ({
    locale: 'en',
    t: (value: string) => value,
    formatDateTime: (value: string) => value,
  }),
}));

vi.mock('../api/contractApi', () => ({
  contractApi: {
    listCustomerFinanceHistory: mocks.listCustomer,
    listInspectorFinanceHistory: mocks.listInspector,
    getCustomerFinanceHistoryDetail: mocks.getCustomerDetail,
    getInspectorFinanceHistoryDetail: mocks.getInspectorDetail,
  },
}));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter><FinanceHistoryPage /></MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('finance history page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.roles = ['CUSTOMER'];
    mocks.listCustomer.mockResolvedValue({
      content: [{
        occurrenceId: 'occ-1', requestId: 'req-1', occurrenceIndex: 1,
        requestDescription: 'Bridge inspection', assetId: 'asset-1', assetName: 'North Bridge',
        counterpartyId: 'ins-1', counterpartyName: 'Inspector One', currency: 'VND',
        amount: 2500000, status: 'PAID', paymentMethod: 'PAYOS', reference: 'REF-1', confirmedAt: '2026-11-14T10:00:00Z',
      }], totalElements: 1, page: 0, size: 20,
    });
    mocks.listInspector.mockResolvedValue({ content: [], totalElements: 0, page: 0, size: 20 });
    mocks.getCustomerDetail.mockResolvedValue({
      occurrenceId: 'occ-1', requestId: 'req-1', occurrenceIndex: 1, currency: 'VND',
      paymentAmount: 2500000, paymentStatus: 'PAID', serviceBaseAmount: 2300000,
      vatAmount: 200000, paymentConfirmedAt: '2026-11-14T10:00:00Z',
      refunds: [], payment: { status: 'PAID', method: 'PAYOS', reference: 'REF-1' },
    });
    mocks.getInspectorDetail.mockResolvedValue({
      occurrenceId: 'occ-2', requestId: 'req-1', occurrenceIndex: 2, currency: 'VND',
      paymentStatus: 'PAID', inspectorGrossPayout: 2000000, tncnAmount: 100000,
      inspectorNetPayout: 1900000, payoutStatus: 'PAID', payoutReference: 'PAYOUT-1',
      payoutRecordedAt: '2026-11-14T11:00:00Z', payment: { status: 'PAID', method: 'PAYOS' },
    });
  });

  it('shows customer payment history and opens payment detail', async () => {
    renderPage();
    expect(await screen.findByText('North Bridge')).toBeTruthy();
    expect(screen.getByText('Inspector One')).toBeTruthy();
    fireEvent.click(screen.getByText('North Bridge'));
    expect(await screen.findByText('Payment details')).toBeTruthy();
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/2,500,000/)).toBeTruthy();
    expect(mocks.getCustomerDetail).toHaveBeenCalledWith('occ-1');
  });

  it('shows Inspector payout history and only labels net payout as received', async () => {
    mocks.roles = ['INSPECTOR'];
    mocks.listInspector.mockResolvedValue({
      content: [{
        occurrenceId: 'occ-2', requestId: 'req-1', occurrenceIndex: 2,
        requestDescription: 'Roof inspection', assetId: 'asset-2', assetName: 'West Roof',
        counterpartyId: 'customer-1', counterpartyName: 'Customer One', currency: 'VND',
        amount: 1900000, status: 'PAID', paymentMethod: 'PAYOS', reference: 'PAYOUT-1', confirmedAt: '2026-11-14T11:00:00Z',
      }], totalElements: 1, page: 0, size: 20,
    });
    renderPage();
    expect((await screen.findAllByText('Payout history')).length).toBeGreaterThan(0);
    fireEvent.click(await screen.findByText('West Roof'));
    expect(await screen.findByText('Payout details')).toBeTruthy();
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/1,900,000/)).toBeTruthy();
    expect(within(dialog).getByText('Gross payout')).toBeTruthy();
    expect(mocks.getInspectorDetail).toHaveBeenCalledWith('occ-2');
  });
});
