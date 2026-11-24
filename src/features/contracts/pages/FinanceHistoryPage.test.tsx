import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FinanceHistoryPage from './FinanceHistoryPage';

const mocks = vi.hoisted(() => ({
  roles: ['CUSTOMER'] as string[],
  listCustomer: vi.fn(),
  listInspector: vi.fn(),
  listManager: vi.fn(),
  getCustomerDetail: vi.fn(),
  getInspectorDetail: vi.fn(),
  getManagerDetail: vi.fn(),
  recordPayout: vi.fn(),
}));

vi.mock('@/features/auth/store/authStore', () => ({
  useAuthStore: (selector: (state: { roles: string[] }) => unknown) => selector({ roles: mocks.roles }),
}));

vi.mock('@/shared/i18n/LocaleProvider', () => ({
  useLocale: () => ({
    locale: 'en',
    t: (value: string) => value,
    formatDate: (value: string | Date) => String(value),
    formatDateTime: (value: string) => value,
  }),
}));

vi.mock('../api/contractApi', () => ({
  contractQueryKeys: {
    requests: () => ['contracts', 'requests'] as const,
  },
  contractApi: {
    listCustomerFinanceHistory: mocks.listCustomer,
    listInspectorFinanceHistory: mocks.listInspector,
    listManagerFinanceHistory: mocks.listManager,
    getCustomerFinanceHistoryDetail: mocks.getCustomerDetail,
    getInspectorFinanceHistoryDetail: mocks.getInspectorDetail,
    getManagerFinanceHistoryDetail: mocks.getManagerDetail,
    recordOccurrencePayout: mocks.recordPayout,
  },
}));

function renderPage(mode?: 'revenue' | 'payouts') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter><FinanceHistoryPage mode={mode} /></MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('finance history page', () => {
  afterEach(() => {
    cleanup();
  });

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

  it('shows customer payment history without inspector column or internal fields', async () => {
    renderPage();
    expect(await screen.findByText('North Bridge')).toBeTruthy();
    expect(screen.queryByText('Inspector One')).toBeNull();
    fireEvent.click(screen.getByText('North Bridge'));
    expect(await screen.findByText('Payment details')).toBeTruthy();
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/2,500,000/)).toBeTruthy();
    expect(within(dialog).queryByText('Payment reference')).toBeNull();
    expect(within(dialog).queryByText('Refund status')).toBeNull();
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

  it('shows Manager platform inflow and commission history with detail breakdown', async () => {
    mocks.roles = ['MANAGER'];
    mocks.listManager.mockResolvedValue({
      summary: {
        currency: 'VND',
        transactionCount: 1,
        totalCustomerPaid: 15000000,
        totalRefunded: 0,
        netPlatformInflow: 15000000,
        totalCommissionEarned: 2045455,
        totalVatAmount: 1363636,
        totalTncnWithheld: 1159091,
        totalInspectorNetPayout: 10431818,
        paidInspectorPayout: 10431818,
        pendingInspectorPayout: 0,
      },
      content: [{
        occurrenceId: 'occ-3', requestId: 'req-3', occurrenceIndex: 1,
        requestDescription: 'VSIP II Roof', assetId: 'asset-3', assetName: 'Kho lanh VSIP II',
        customerId: 'cust-1', customerName: 'Customer Demo', inspectorId: 'ins-1', inspectorName: 'Nguyen Minh Tuan',
        currency: 'VND', customerPaidAmount: 15000000, serviceBaseAmount: 13636364,
        vatRate: 10, vatAmount: 1363636, commissionRate: 15, commissionAmount: 2045455, netCommissionAmount: 2045455,
        tncnRate: 10, tncnAmount: 1159091, inspectorNetPayout: 10431818, refundedAmount: 0, netPlatformInflow: 15000000,
        paymentStatus: 'PAID', paymentMethod: 'VNPAY', paymentReference: 'VN-1', paymentConfirmedAt: '2026-11-10T10:00:00Z',
        payoutStatus: 'PAID', payoutReference: 'PAYOUT-3', payoutRecordedAt: '2026-11-12T10:00:00Z',
      }],
      totalElements: 1, page: 0, size: 20,
    });
    mocks.getManagerDetail.mockResolvedValue({
      occurrenceId: 'occ-3', requestId: 'req-3', occurrenceIndex: 1, currency: 'VND',
      totalPrice: 15000000, paymentAmount: 15000000, paymentStatus: 'PAID', serviceBaseAmount: 13636364,
      vatRate: 10, vatAmount: 1363636, commissionRate: 15, commissionAmount: 2045455,
      inspectorGrossPayout: 11590909, tncnRate: 10, tncnAmount: 1159091, inspectorNetPayout: 10431818,
      payoutStatus: 'PAID', payoutReference: 'PAYOUT-3', payoutRecordedAt: '2026-11-12T10:00:00Z',
      paymentConfirmedAt: '2026-11-10T10:00:00Z', refunds: [],
      payment: { status: 'PAID', method: 'VNPAY', reference: 'VN-1' },
    });
    renderPage();
    expect(await screen.findByText('Kho lanh VSIP II')).toBeTruthy();
    expect(screen.getByText('Commission earned')).toBeTruthy();
    fireEvent.click(screen.getByText('Kho lanh VSIP II'));
    expect(await screen.findByText('Platform finance details')).toBeTruthy();
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getAllByText(/2,045,455/).length).toBeGreaterThan(0);
    expect(mocks.getManagerDetail).toHaveBeenCalledWith('occ-3');
  });

  it('lets Manager filter eligible payouts and settle via UNC reference directly inside Finance drawer', async () => {
    mocks.roles = ['MANAGER'];
    mocks.listManager.mockResolvedValue({
      summary: {
        currency: 'VND',
        transactionCount: 1,
        totalCustomerPaid: 12000000,
        totalRefunded: 0,
        netPlatformInflow: 12000000,
        totalCommissionEarned: 1636364,
        totalVatAmount: 1090909,
        totalTncnWithheld: 927273,
        totalInspectorNetPayout: 8345454,
        paidInspectorPayout: 0,
        pendingInspectorPayout: 8345454,
      },
      content: [{
        occurrenceId: 'occ-4', requestId: 'req-4', occurrenceIndex: 1,
        requestDescription: 'Highlands survey', assetId: 'asset-4', assetName: 'Highlands Coffee',
        customerId: 'cust-1', customerName: 'Sai Gon Infra', inspectorId: 'ins-2', inspectorName: 'Do Thi Phi Cong',
        currency: 'VND', customerPaidAmount: 12000000, serviceBaseAmount: 10909091,
        vatRate: 10, vatAmount: 1090909, commissionRate: 15, commissionAmount: 1636364, netCommissionAmount: 1636364,
        tncnRate: 10, tncnAmount: 927273, inspectorNetPayout: 8345454, refundedAmount: 0, netPlatformInflow: 12000000,
        paymentStatus: 'PAID', paymentMethod: 'VNPAY', paymentReference: 'VN-4', paymentConfirmedAt: '2026-11-24T05:00:00Z',
        payoutStatus: 'ELIGIBLE', payoutReference: null, payoutRecordedAt: null,
      }],
      totalElements: 1, page: 0, size: 20,
    });
    mocks.getManagerDetail.mockResolvedValue({
      occurrenceId: 'occ-4', requestId: 'req-4', occurrenceIndex: 1, currency: 'VND',
      totalPrice: 12000000, paymentAmount: 12000000, paymentStatus: 'PAID', serviceBaseAmount: 10909091,
      vatRate: 10, vatAmount: 1090909, commissionRate: 15, commissionAmount: 1636364,
      inspectorGrossPayout: 9272727, tncnRate: 10, tncnAmount: 927273, inspectorNetPayout: 8345454,
      payoutStatus: 'ELIGIBLE', payoutReference: null, payoutRecordedAt: null,
      paymentConfirmedAt: '2026-11-24T05:00:00Z', refunds: [],
      payment: { status: 'PAID', method: 'VNPAY', reference: 'VN-4' },
    });
    mocks.recordPayout.mockResolvedValue({});

    renderPage('payouts');
    expect(await screen.findByText('Highlands Coffee')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Payout eligible (1)' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Settle payout' }));
    const drawer = await screen.findByRole('dialog');
    const uncInput = within(drawer).getByPlaceholderText('Bank transfer reference (e.g. UNC-VCB-20261110)');
    fireEvent.change(uncInput, { target: { value: 'UNC-VCB-20261124' } });
    fireEvent.click(within(drawer).getByRole('button', { name: 'Settle Inspector payout' }));
    expect(mocks.recordPayout).toHaveBeenCalledWith('req-4', 'occ-4', { payoutReference: 'UNC-VCB-20261124' });
  });
});
