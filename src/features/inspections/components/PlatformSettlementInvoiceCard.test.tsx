import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/shared/i18n/LocaleProvider';
import { inspectionApi } from '../api/inspectionApi';
import { PlatformSettlementInvoiceCard } from './PlatformSettlementInvoiceCard';

vi.mock('../api/inspectionApi', () => ({
  inspectionApi: {
    downloadPaymentDocument: vi.fn().mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' })),
  },
}));

describe('PlatformSettlementInvoiceCard', () => {
  it('shows separate collection and payout pills, recipient, reference, PDF download, and finance link when paid', async () => {
    const onManageFinance = vi.fn();

    render(
      <LocaleProvider>
        <PlatformSettlementInvoiceCard
          inspectionId="insp-1"
          inspectorName="Đỗ Thị Phi Công"
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
            payoutStatus: 'ELIGIBLE',
            paymentMethod: 'VNPAY',
            paymentReference: 'VNPAY-14998899',
          }}
        />
      </LocaleProvider>,
    );

    expect(screen.getByText('Order & settlement breakdown')).toBeTruthy();
    expect(screen.getByText('INV-1858020523')).toBeTruthy();
    expect(screen.getByText('Customer paid')).toBeTruthy();
    expect(screen.getByText('Payout eligible')).toBeTruthy();
    expect(screen.getByText('Paid via VNPay · Order #1858020523 · Ref: VNPAY-14998899')).toBeTruthy();
    expect(screen.getByText('Inspector gross payout')).toBeTruthy();
    expect(screen.getByText('Đỗ Thị Phi Công · Eligible for manager payout')).toBeTruthy();
    expect(screen.getAllByText(/Platform commission/)).toHaveLength(1);
    expect(screen.queryByText('Platform revenue')).toBeNull();

    const receiptBtn = screen.getByRole('button', { name: 'Download receipt (PDF)' });
    fireEvent.click(receiptBtn);
    expect(vi.mocked(inspectionApi.downloadPaymentDocument)).toHaveBeenCalledWith('insp-1');

    const manageBtn = screen.getByRole('button', { name: 'Manage payout & refunds' });
    fireEvent.click(manageBtn);
    expect(onManageFinance).toHaveBeenCalledTimes(1);
  });

  it('shows due date and Payment Notice download when report is accepted but unpaid', () => {
    render(
      <LocaleProvider>
        <PlatformSettlementInvoiceCard
          inspectionId="insp-2"
          inspectorName="Phạm Văn Bay"
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

    expect(screen.getByText('Awaiting payment')).toBeTruthy();
    expect(screen.getByText('Payout pending')).toBeTruthy();
    expect(screen.getByText(/Pay by/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Download payment notice (PDF)' })).toBeTruthy();
  });

  it('settles payout inline via UNC reference when eligible and offers secondary drawer button', async () => {
    const onSettlePayout = vi.fn().mockResolvedValue(undefined);
    const onManageFinance = vi.fn();

    render(
      <LocaleProvider>
        <PlatformSettlementInvoiceCard
          inspectionId="insp-3"
          inspectorName="Đỗ Thị Phi Công"
          onSettlePayout={onSettlePayout}
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
            payoutStatus: 'ELIGIBLE',
            paymentMethod: 'VNPAY',
          }}
        />
      </LocaleProvider>,
    );

    const input = screen.getByPlaceholderText('Bank transfer reference (e.g. UNC-VCB-20261110)');
    const settleBtn = screen.getByRole('button', { name: 'Settle Inspector payout' });
    expect((settleBtn as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(input, { target: { value: 'UNC-VCB-20261124' } });
    expect((settleBtn as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(settleBtn);
    expect(onSettlePayout).toHaveBeenCalledWith('UNC-VCB-20261124');

    const secondaryBtn = screen.getByRole('button', { name: 'Refunds & wire transfer' });
    fireEvent.click(secondaryBtn);
    expect(onManageFinance).toHaveBeenCalledTimes(1);
  });
});
