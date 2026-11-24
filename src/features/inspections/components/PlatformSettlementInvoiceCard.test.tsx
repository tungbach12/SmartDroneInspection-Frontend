import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/shared/i18n/LocaleProvider';
import { inspectionApi } from '../api/inspectionApi';
import { PlatformSettlementInvoiceCard } from './PlatformSettlementInvoiceCard';

vi.mock('../api/inspectionApi', () => ({
  inspectionApi: {
    downloadPaymentDocument: vi.fn().mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' })),
  },
}));

describe('PlatformSettlementInvoiceCard', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows customer paid status, rounded invoice amounts, PDF receipt, and refunds dialog trigger without Inspector payout', () => {
    const onManageFinance = vi.fn();

    render(
      <LocaleProvider>
        <PlatformSettlementInvoiceCard
          inspectionId="insp-1"
          onManageFinance={onManageFinance}
          paymentDetails={{
            reportAccepted: true,
            paid: true,
            paymentStatus: 'PAID',
            orderCode: 1858020523,
            amount: 12000000,
            serviceBaseAmount: 10909090.91,
            vatRate: 10,
            vatAmount: 1090909.09,
            commissionRate: 15,
            commissionAmount: 1636363.64,
            inspectorGrossPayout: 9272727.27,
            tncnRate: 10,
            tncnAmount: 927272.73,
            inspectorNetPayout: 8345454.54,
            payoutStatus: 'PAID',
            payoutReference: 'SEPAY-OUT-FT2601',
            paymentMethod: 'VNPAY',
            paymentReference: 'VNPAY-14998899',
            paymentConfirmedAt: '2026-11-24T10:30:00Z',
          }}
        />
      </LocaleProvider>,
    );

    expect(screen.getByText('Customer Settlement')).toBeTruthy();
    expect(screen.getByText('INV-1858020523')).toBeTruthy();
    expect(screen.getByText('Customer paid')).toBeTruthy();
    expect(screen.getByText('Accepted')).toBeTruthy();
    expect(screen.getByText('Paid at')).toBeTruthy();
    expect(screen.getByText('VNPay · Order #1858020523 · Ref: VNPAY-14998899')).toBeTruthy();
    expect(screen.getByText('10,909,091 ₫')).toBeTruthy();

    expect(screen.queryByText('Commission & payout')).toBeNull();
    expect(screen.queryByText('Inspector net payout')).toBeNull();
    expect(screen.queryByText('Go to Inspector Payout')).toBeNull();
    expect(screen.queryByPlaceholderText('Bank transfer reference (e.g. UNC-VCB-20261110)')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Download receipt (PDF)' }));
    expect(vi.mocked(inspectionApi.downloadPaymentDocument)).toHaveBeenCalledWith('insp-1');

    fireEvent.click(screen.getByRole('button', { name: 'Refunds & adjustments' }));
    expect(onManageFinance).toHaveBeenCalledTimes(1);
  });

  it('shows due date, Payment Notice download, and collection controls when report is accepted but unpaid', () => {
    const onManageFinance = vi.fn();

    render(
      <LocaleProvider>
        <PlatformSettlementInvoiceCard
          inspectionId="insp-2"
          onManageFinance={onManageFinance}
          paymentDetails={{
            reportAccepted: true,
            paid: false,
            paymentStatus: 'PAYMENT_DUE',
            orderCode: 1048968707,
            amount: 12000000,
            paymentDueAt: '2026-12-08T00:00:00Z',
            payoutStatus: 'PENDING',
          }}
        />
      </LocaleProvider>,
    );

    expect(screen.getByText('Awaiting customer payment')).toBeTruthy();
    expect(screen.getByText(/Pay by/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Download payment notice (PDF)' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Collection & refund controls' }));
    expect(onManageFinance).toHaveBeenCalledTimes(1);
  });
});
