import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ManagerReportReviewPage from './ManagerReportReviewPage';

const mocks = vi.hoisted(() => ({
  inspectionData: {
    id: 'insp-1',
    assetName: 'Tower A',
    inspectorName: 'Phạm Văn Bay',
    status: 'UNDER_REVIEW',
  } as Record<string, unknown>,
  versionsData: [] as Array<Record<string, unknown>>,
  paymentStatusData: {} as Record<string, unknown>,
  publishMutate: vi.fn(),
  reviewMutate: vi.fn(),
  listRequests: vi.fn(),
  recordOccurrencePayout: vi.fn(),
  createSepayPayoutLinkMutateAsync: vi.fn(),
  refetchPayment: vi.fn(),
  refetchInspection: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock('@/features/auth/store/authStore', () => ({
  useAuthStore: (selector: (state: { userId: string }) => unknown) =>
    selector({ userId: 'mgr-1' }),
}));

vi.mock('@/shared/ui/Toast', () => ({
  useToastStore: (selector: (state: { showToast: typeof mocks.showToast }) => unknown) =>
    selector({ showToast: mocks.showToast }),
}));

vi.mock('@/shared/i18n/LocaleProvider', () => ({
  useLocale: () => ({
    locale: 'en',
    t: (key: string) => key,
    formatNumber: (value: number) => new Intl.NumberFormat('en-US').format(value),
    formatDate: (value: string | Date) => String(value),
    formatDateTime: (value: string | Date) => String(value),
  }),
}));

vi.mock('@/features/contracts/api/contractApi', () => ({
  contractQueryKeys: {
    requests: () => ['contracts', 'requests'] as const,
  },
  contractApi: {
    listRequests: mocks.listRequests,
    recordOccurrencePayout: mocks.recordOccurrencePayout,
  },
}));

vi.mock('@/features/inspections/hooks/useInspections', () => ({
  useInspection: () => ({ data: mocks.inspectionData, refetch: mocks.refetchInspection }),
  useFieldSessions: () => ({ data: [] }),
  useReportVersions: () => ({
    data: mocks.versionsData,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useInspectionFindings: () => ({ data: [], isLoading: false, error: null }),
  useInspectionEvidence: () => ({ data: [], isLoading: false, error: null }),
  useReinspectionVerifications: () => ({ data: [] }),
  useReviewReportVersion: () => ({
    isPending: false,
    error: null,
    isError: false,
    mutate: mocks.reviewMutate,
  }),
  usePublishReportVersion: () => ({
    isPending: false,
    error: null,
    isError: false,
    mutate: mocks.publishMutate,
  }),
  useCreateInspectionSepayPayoutLink: () => ({
    isPending: false,
    mutateAsync: mocks.createSepayPayoutLinkMutateAsync,
  }),
  useReportPaymentStatus: () => ({
    data: mocks.paymentStatusData,
    isFetching: false,
    refetch: mocks.refetchPayment,
  }),
}));

vi.mock('@/features/reports/components/ReportDeliverableTabs', () => ({
  ReportDeliverableTabs: () => <div data-testid="report-deliverable-tabs" />,
}));

function renderStagePage(stage: 'review' | 'payout') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/manager/inspections/insp-1/${stage}`]}>
        <Routes>
          <Route path="/manager/inspections/:inspectionId">
            <Route
              path="review"
              element={<ManagerReportReviewPage stage="review" />}
            />
            <Route
              path="payout"
              element={<ManagerReportReviewPage stage="payout" />}
            />
          </Route>
          <Route path="/manager/payout-settlements" element={<div>Payouts Queue</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ManagerReportReviewPage separate review & payout stages', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listRequests.mockResolvedValue([
      {
        id: 'req-1',
        occurrences: [{ id: 'occ-1', inspectionId: 'insp-1' }],
      },
    ]);
    mocks.recordOccurrencePayout.mockResolvedValue({});
    mocks.createSepayPayoutLinkMutateAsync.mockResolvedValue({
      orderCode: 2001234567,
      amount: 8345455,
      paymentLinkId: 'payout-2001234567',
      checkoutUrl: 'https://vietqr.app/img?acc=0071001234567&bank=VCB&amount=8345455&des=SDIPAY2001234567',
      qrCode: 'SDIPAY2001234567',
    });
  });

  it('guides APPROVED report on Step 2 review stage toward Step 3 Inspector Payout', () => {
    mocks.versionsData = [
      { id: 'ver-1', versionNo: 1, status: 'APPROVED', authorUserId: 'insp-user-1' },
    ];
    mocks.paymentStatusData = {
      reportAccepted: false,
      paid: false,
      paymentStatus: 'PENDING',
      payoutStatus: 'ELIGIBLE',
    };

    renderStagePage('review');

    expect(
      screen.getByText('Report approved. Proceed to Inspector Payout before publishing to Customer.'),
    ).toBeTruthy();
    const nextLink = screen.getByRole('link', { name: 'Continue to Inspector Payout' });
    expect(nextLink.getAttribute('href')).toBe('/manager/inspections/insp-1/payout');
    expect(screen.queryByPlaceholderText('Bank transfer reference (e.g. UNC-VCB-20261110)')).toBeNull();
  });

  it('blocks SePay payout on Step 3 when Inspector bank details are missing', () => {
    mocks.versionsData = [
      { id: 'ver-1', versionNo: 1, status: 'APPROVED', authorUserId: 'insp-user-1' },
    ];
    mocks.paymentStatusData = {
      reportAccepted: false,
      paid: false,
      paymentStatus: 'PENDING',
      amount: 12000000,
      inspectorNetPayout: 8345455,
      payoutStatus: 'ELIGIBLE',
    };

    renderStagePage('payout');

    expect(screen.getByText('Inspector has not entered payout bank details yet.')).toBeTruthy();
    expect(screen.queryByPlaceholderText('Bank transfer reference (e.g. UNC-VCB-20261110)')).toBeNull();

    const payBtn = screen.getByRole('button', { name: 'Pay Inspector via SePay (VietQR)' }) as HTMLButtonElement;
    expect(payBtn.disabled).toBe(true);
    const publishBtn = screen.getByRole('button', { name: 'Publish to Customer' }) as HTMLButtonElement;
    expect(publishBtn.disabled).toBe(true);
  });

  it('displays formatted bank details on Step 3 and opens SePay VietQR payout dialog automatically', async () => {
    mocks.versionsData = [
      { id: 'ver-1', versionNo: 1, status: 'APPROVED', authorUserId: 'insp-user-1' },
    ];
    mocks.paymentStatusData = {
      reportAccepted: false,
      paid: false,
      paymentStatus: 'PENDING',
      amount: 12000000,
      inspectorNetPayout: 8345455,
      payoutStatus: 'ELIGIBLE',
      inspectorBankName: 'Vietcombank',
      inspectorBankAccountNumber: '0071001234567',
      inspectorBankAccountHolder: 'PHAM VAN BAY',
      inspectorBankBranch: 'CN Sai Gon',
    };

    renderStagePage('payout');

    expect(screen.getByText('Vietcombank (VCB)')).toBeTruthy();
    expect(screen.getByText('0071001234567')).toBeTruthy();
    expect(screen.getByText('PHAM VAN BAY')).toBeTruthy();
    expect(screen.getByText(/8,345,455/)).toBeTruthy();
    expect(screen.queryByPlaceholderText('Bank transfer reference (e.g. UNC-VCB-20261110)')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Pay Inspector via SePay (VietQR)' }));

    await vi.waitFor(() => {
      expect(mocks.createSepayPayoutLinkMutateAsync).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByText('Inspector payout VietQR')).toBeTruthy();
    expect(screen.getByText('SDIPAY2001234567')).toBeTruthy();
    const qrImg = screen.getByAltText('VietQR code for Inspector payout') as HTMLImageElement;
    expect(qrImg.src).toContain('acc=0071001234567');
  });

  it('enables Publish to Customer on Step 3 once Inspector payout is PAID', () => {
    mocks.versionsData = [
      { id: 'ver-1', versionNo: 1, status: 'APPROVED', authorUserId: 'insp-user-1' },
    ];
    mocks.paymentStatusData = {
      reportAccepted: false,
      paid: false,
      paymentStatus: 'PENDING',
      amount: 12000000,
      inspectorNetPayout: 8345455,
      payoutStatus: 'PAID',
      payoutReference: 'SEPAY-OUT-FT2401',
      inspectorBankName: 'VCB',
      inspectorBankAccountNumber: '0071001234567',
      inspectorBankAccountHolder: 'PHAM VAN BAY',
    };

    renderStagePage('payout');

    expect(screen.getByText(/Inspector payout settled.*SEPAY-OUT-FT2401/)).toBeTruthy();
    const publishBtn = screen.getByRole('button', { name: 'Publish to Customer' }) as HTMLButtonElement;
    expect(publishBtn.disabled).toBe(false);
    fireEvent.click(publishBtn);
    expect(mocks.publishMutate).toHaveBeenCalledWith(
      { versionId: 'ver-1' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
});
