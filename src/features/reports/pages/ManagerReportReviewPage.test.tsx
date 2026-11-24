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
  useReportPaymentStatus: () => ({
    data: mocks.paymentStatusData,
    refetch: mocks.refetchPayment,
  }),
}));

vi.mock('@/features/reports/components/ReportDeliverableTabs', () => ({
  ReportDeliverableTabs: () => <div data-testid="report-deliverable-tabs" />,
}));

function renderReviewPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/manager/inspections/insp-1/review']}>
        <Routes>
          <Route
            path="/manager/inspections/:inspectionId/review"
            element={<ManagerReportReviewPage stage="review" />}
          />
          <Route path="/manager/payout-settlements" element={<div>Payouts Queue</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ManagerReportReviewPage two-step approval and payout gate', () => {
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
  });

  it('prompts Manager to settle Inspector payout and disables Publish to Customer while APPROVED & ELIGIBLE', async () => {
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

    renderReviewPage();

    expect(
      screen.getByText('Inspector payout required before publishing to Customer'),
    ).toBeTruthy();
    expect(screen.getByText(/8,345,455/)).toBeTruthy();

    const publishBtn = screen.getByRole('button', { name: 'Publish to Customer' }) as HTMLButtonElement;
    expect(publishBtn.disabled).toBe(true);

    const uncInput = screen.getByPlaceholderText('Bank transfer reference (e.g. UNC-VCB-20261110)');
    fireEvent.change(uncInput, { target: { value: 'UNC-VCB-20261124' } });
    fireEvent.click(screen.getByRole('button', { name: 'Settle Inspector payout' }));

    await vi.waitFor(() => {
      expect(mocks.recordOccurrencePayout).toHaveBeenCalledWith('req-1', 'occ-1', {
        payoutReference: 'UNC-VCB-20261124',
      });
    });
  });

  it('enables Publish to Customer and calls publish mutation once Inspector payout is PAID', () => {
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
      payoutReference: 'UNC-VCB-20261124',
    };

    renderReviewPage();

    expect(screen.getByText(/Inspector payout settled.*UNC-VCB-20261124/)).toBeTruthy();
    const publishBtn = screen.getByRole('button', { name: 'Publish to Customer' }) as HTMLButtonElement;
    expect(publishBtn.disabled).toBe(false);
    fireEvent.click(publishBtn);
    expect(mocks.publishMutate).toHaveBeenCalledWith({ versionId: 'ver-1' });
  });
});
