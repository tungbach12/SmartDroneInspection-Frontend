import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '@/shared/i18n/LocaleProvider';
import { PlatformSettlementInvoiceCard } from './PlatformSettlementInvoiceCard';

describe('PlatformSettlementInvoiceCard', () => {
  it('shows Commission & payout alongside Service invoice cleanly without duplicate revenue callouts', () => {
    render(
      <LocaleProvider>
        <PlatformSettlementInvoiceCard
          inspectionId="insp-1"
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

    expect(screen.getByText('Order & settlement breakdown')).toBeTruthy();
    expect(screen.getByText('Customer paid · payout pending')).toBeTruthy();
    expect(screen.getByText('INV-1858020523')).toBeTruthy();
    expect(screen.getByText('Paid via VNPay · Order #1858020523')).toBeTruthy();
    expect(screen.getByText('Inspector gross payout')).toBeTruthy();
    expect(screen.getAllByText(/Platform commission/)).toHaveLength(1);
    expect(screen.queryByText('Platform revenue')).toBeNull();
  });
});
