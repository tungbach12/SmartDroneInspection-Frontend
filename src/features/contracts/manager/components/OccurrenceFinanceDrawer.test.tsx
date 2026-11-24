import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/shared/i18n/LocaleProvider';
import type { ServiceRequestOccurrence } from '../../api/contractApi';
import { OccurrenceFinanceDrawer } from './OccurrenceFinanceDrawer';

const mocks = vi.hoisted(() => ({
  confirmPayment: { mutateAsync: vi.fn(), isPending: false },
  cancelUnpaidOrder: { mutateAsync: vi.fn(), isPending: false },
  finance: { data: { refunds: [], inspectorReceivables: [] }, isError: false },
  initiate: { mutateAsync: vi.fn(), isPending: false },
  complete: { mutateAsync: vi.fn(), isPending: false },
  cancel: { mutateAsync: vi.fn(), isPending: false },
  reconcile: { mutateAsync: vi.fn(), isPending: false },
  recovery: { mutateAsync: vi.fn(), isPending: false },
}));

vi.mock('../../hooks/useContracts', () => ({
  useConfirmOccurrencePayment: () => mocks.confirmPayment,
  useCancelUnpaidPaymentOrder: () => mocks.cancelUnpaidOrder,
  useOccurrenceFinance: () => mocks.finance,
  useInitiateOccurrenceRefund: () => mocks.initiate,
  useCompleteOccurrenceRefund: () => mocks.complete,
  useCancelOccurrenceRefund: () => mocks.cancel,
  useReconcileRefundAllocation: () => mocks.reconcile,
  useRecordReceivableRecovery: () => mocks.recovery,
}));

describe('OccurrenceFinanceDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders a centered customer collection & refunds dialog with rounded VND and no manual UNC payout inputs', () => {
    const occurrence = {
      id: 'occ-1',
      occurrenceIndex: 1,
      paymentStatus: 'PAID',
      totalPrice: 12000000,
      serviceBaseAmount: 10909090.91,
      vatAmount: 1090909.09,
      invoice: { vatRate: 10 },
      payment: { status: 'PAID', method: 'VNPAY', gatewayOrderCode: 1858020523 },
      payout: { status: 'ELIGIBLE' },
      refunds: [],
    } as unknown as ServiceRequestOccurrence;

    render(
      <LocaleProvider>
        <OccurrenceFinanceDrawer
          open
          onClose={vi.fn()}
          requestId="req-1"
          occurrence={occurrence}
          isOneTime
          onChanged={vi.fn()}
        />
      </LocaleProvider>,
    );

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Customer collection & refunds')).toBeTruthy();
    expect(screen.getByText('INV-1858020523')).toBeTruthy();
    expect(screen.getByText('10,909,091 ₫')).toBeTruthy();
    expect(screen.getByText('+1,090,909 ₫')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Initiate refund' })).toBeTruthy();

    expect(screen.queryByPlaceholderText('Bank transfer reference (e.g. UNC-VCB-20261110)')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Settle Inspector payout' })).toBeNull();
    expect(screen.queryByText(/Inspector net payout/)).toBeNull();
  });

  it('allows resetting an unpaid gateway order or confirming manual customer collection when PAYMENT_DUE', () => {
    const onChanged = vi.fn();
    const occurrence = {
      id: 'occ-2',
      occurrenceIndex: 2,
      paymentStatus: 'PAYMENT_DUE',
      totalPrice: 12000000,
      reportAcceptedAt: '2026-11-24T10:00:00Z',
      payment: { status: 'PAYMENT_DUE', gatewayOrderCode: 99887766 },
    } as unknown as ServiceRequestOccurrence;

    render(
      <LocaleProvider>
        <OccurrenceFinanceDrawer
          open
          onClose={vi.fn()}
          requestId="req-1"
          occurrence={occurrence}
          onChanged={onChanged}
        />
      </LocaleProvider>,
    );

    expect(screen.getByText('Occurrence 2 · Customer collection & refunds')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reset order' })).toBeTruthy();
    expect(screen.getByPlaceholderText('Wire reference (e.g. FT261123)')).toBeTruthy();
    expect(screen.getByText('Refund and adjustment controls unlock after customer payment is confirmed.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Reset order' }));
    expect(mocks.cancelUnpaidOrder.mutateAsync).toHaveBeenCalledTimes(1);
  });
});
