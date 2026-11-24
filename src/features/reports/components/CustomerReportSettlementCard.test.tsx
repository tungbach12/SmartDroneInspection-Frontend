import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomerReportSettlementCard } from './CustomerReportSettlementCard';
import CustomerReportDeliverablePage from '../pages/CustomerReportDeliverablePage';
import { inspectionApi } from '@/features/inspections/api/inspectionApi';
import { LocaleProvider } from '@/shared/i18n/LocaleProvider';

vi.mock('@/features/inspections/api/inspectionApi', () => ({
  inspectionApi: {
    getById: vi.fn(),
    listVersions: vi.fn(),
    listFindings: vi.fn(),
    listEvidence: vi.fn(),
    getReportPaymentStatus: vi.fn(),
    downloadPaymentDocument: vi.fn(),
    downloadReport: vi.fn(),
    acceptReport: vi.fn(),
    createSepayPaymentLink: vi.fn(),
    createVnPayPaymentUrl: vi.fn(),
    cancelUnpaidPaymentOrder: vi.fn(),
    getAiSummary: vi.fn().mockResolvedValue({
      summary: 'AI summary',
      keyHighlights: [],
      recommendedActions: '',
      overallRisk: 'LOW',
    }),
  },
}));

const mockedApi = vi.mocked(inspectionApi);

describe('CustomerReportSettlementCard & CustomerReportDeliverablePage', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });

  it('shows the actual payment method in Step 2 instead of hardcoding Sepay', () => {
    render(
      <LocaleProvider>
        <CustomerReportSettlementCard
          inspectionId="insp-1"
          versionId="ver-1"
          versionNo={1}
          isPaid
          isReportAccepted
          paymentStatus={{
            reportAccepted: true,
            paid: true,
            paymentStatus: 'PAID',
            orderCode: 100045,
            amount: 5000000,
            checkoutUrl: null,
            paymentMethod: 'VNPAY',
          }}
          acceptPending={false}
          sepayPending={false}
          disputeSubmitted={false}
          onAcceptReport={vi.fn()}
          onProceedToSepay={vi.fn()}
          onOpenDispute={vi.fn()}
        />
      </LocaleProvider>,
    );

    expect(screen.getByText(/Paid via VNPay/)).toBeTruthy();
    expect(screen.queryByText(/Paid via Sepay/)).toBeNull();
    expect(screen.queryByText(/Official report version/)).toBeNull();
    expect(screen.queryByText('Fulfilment')).toBeNull();
  });

  it('hides removed helper texts and Reset order button on Customer settlement UI', () => {
    render(
      <LocaleProvider>
        <CustomerReportSettlementCard
          inspectionId="insp-1"
          versionId="ver-1"
          versionNo={1}
          isPaid={false}
          isReportAccepted
          paymentStatus={{
            reportAccepted: true,
            paid: false,
            paymentStatus: 'PAYMENT_DUE',
            orderCode: 100046,
            amount: 5000000,
            checkoutUrl: null,
            paymentMethod: 'SEPAY',
          }}
          acceptPending={false}
          sepayPending={false}
          disputeSubmitted={false}
          onAcceptReport={vi.fn()}
          onProceedToSepay={vi.fn()}
          onProceedToVnPay={vi.fn()}
          onOpenDispute={vi.fn()}
        />
      </LocaleProvider>,
    );

    expect(screen.queryByText(/Official report version/)).toBeNull();
    expect(screen.queryByText(/Official PDF ready/)).toBeNull();
    expect(screen.queryByText('Opens VNPay in a new tab.')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reset order' })).toBeNull();
  });

  it('renders Accept Report and Dispute directly at Step 2 (report) and prompts Step 2 at Step 3 (settlement) before acceptance', async () => {
    mockedApi.getById.mockResolvedValue({
      id: 'insp-1',
      assetName: 'Bridge A',
      inspectionType: 'INITIAL',
    } as never);
    mockedApi.listVersions.mockResolvedValue([
      {
        id: 'ver-1',
        inspectionReportId: 'rep-1',
        versionNo: 1,
        status: 'PUBLISHED',
        authorUserId: 'u-1',
        submittedAt: null,
        reviewerUserId: null,
        reviewedAt: null,
        returnReason: null,
        publishedAt: '2026-11-20T10:00:00Z',
        createdAt: '2026-11-20T09:00:00Z',
        summary: 'Summary',
        omissionDisclosure: null,
      },
    ]);
    mockedApi.listFindings.mockResolvedValue([]);
    mockedApi.listEvidence.mockResolvedValue([]);
    mockedApi.getReportPaymentStatus.mockResolvedValue({
      reportAccepted: false,
      paid: false,
      paymentStatus: 'PENDING',
      orderCode: null,
      amount: 5000000,
      checkoutUrl: null,
      paymentMethod: null,
    });
    mockedApi.acceptReport.mockResolvedValue(undefined as never);

    const reportClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    const { unmount } = render(
      <LocaleProvider>
        <QueryClientProvider client={reportClient}>
          <MemoryRouter initialEntries={['/client/inspections/insp-1/report']}>
            <Routes>
              <Route path="/client/inspections/:inspectionId">
                <Route
                  path="report"
                  element={<CustomerReportDeliverablePage stage="report" />}
                />
                <Route
                  path="settlement"
                  element={<div>Settlement View</div>}
                />
              </Route>
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </LocaleProvider>,
    );

    const acceptBtn = await screen.findByRole('button', { name: 'Accept Report' });
    expect(screen.getByRole('button', { name: 'File a dispute / Request clarification' })).toBeTruthy();
    fireEvent.click(acceptBtn);
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm & Accept Report' }));
    await waitFor(() => {
      expect(mockedApi.acceptReport).toHaveBeenCalledWith('insp-1', 'ver-1');
    });
    unmount();

    const settlementClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
      <LocaleProvider>
        <QueryClientProvider client={settlementClient}>
          <MemoryRouter initialEntries={['/client/inspections/insp-1/settlement']}>
            <Routes>
              <Route
                path="/client/inspections/:inspectionId/settlement"
                element={<CustomerReportDeliverablePage stage="settlement" />}
              />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </LocaleProvider>,
    );

    expect(await screen.findByText('Accept report in Step 2 to unlock payment.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Go to Inspection Report' })).toBeTruthy();
  });

  it('does not treat ?payment=success as paid when backend payment status is still PAYMENT_DUE', async () => {
    mockedApi.getById.mockResolvedValue({
      id: 'insp-1',
      assetName: 'Bridge A',
      inspectionType: 'INITIAL',
    } as never);
    mockedApi.listVersions.mockResolvedValue([
      {
        id: 'ver-1',
        inspectionReportId: 'rep-1',
        versionNo: 1,
        status: 'PUBLISHED',
        authorUserId: 'u-1',
        submittedAt: null,
        reviewerUserId: null,
        reviewedAt: null,
        returnReason: null,
        publishedAt: '2026-11-20T10:00:00Z',
        createdAt: '2026-11-20T09:00:00Z',
        summary: 'Summary',
        omissionDisclosure: null,
      },
    ]);
    mockedApi.listFindings.mockResolvedValue([]);
    mockedApi.listEvidence.mockResolvedValue([]);
    mockedApi.getReportPaymentStatus.mockResolvedValue({
      reportAccepted: true,
      paid: false,
      paymentStatus: 'PAYMENT_DUE',
      orderCode: 100047,
      amount: 5000000,
      checkoutUrl: null,
      paymentMethod: 'VNPAY',
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    render(
      <LocaleProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/client/inspections/insp-1/settlement?payment=success']}>
            <Routes>
              <Route
                path="/client/inspections/:inspectionId/settlement"
                element={<CustomerReportDeliverablePage stage="settlement" />}
              />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </LocaleProvider>,
    );

    expect(
      await screen.findByText('Confirming payment…'),
    ).toBeTruthy();
    expect(screen.queryByText('Paid & Fulfilled')).toBeNull();
    await waitFor(() => {
      expect(mockedApi.downloadPaymentDocument).not.toHaveBeenCalled();
    });
  });
});
