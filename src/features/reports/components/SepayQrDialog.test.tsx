import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SepayCheckoutDetails } from '@/features/inspections/api/inspectionApi';
import { SepayQrDialog } from './SepayQrDialog';

vi.mock('@/shared/i18n/LocaleProvider', () => ({
  useLocale: () => ({
    locale: 'en' as const,
    t: (key: string) => key,
    formatNumber: (value: number) => String(value),
  }),
}));

const checkout: SepayCheckoutDetails = {
  orderCode: 100123,
  amount: 11000000,
  paymentLinkId: 'link-1',
  checkoutUrl:
    'https://qr.sepay.vn/img?acc=0123456789&bank=MB&holder=SMART%20DRONE&amount=11000000&des=SDI100123',
  qrCode: 'SDI100123',
};

describe('SepayQrDialog', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it('renders the VietQR image, amount, bank details and transfer content', () => {
    render(<SepayQrDialog details={checkout} amountVnd="11.000.000 ₫" onClose={vi.fn()} />);

    const img = screen.getByRole('img', { name: 'VietQR code for this service fee payment' });
    expect(img.getAttribute('src')).toBe(checkout.checkoutUrl);

    expect(screen.getByText('11.000.000 ₫')).toBeTruthy();
    expect(screen.getByText('MB')).toBeTruthy();
    expect(screen.getByText('0123456789')).toBeTruthy();
    expect(screen.getByText('SMART DRONE')).toBeTruthy();
    expect(screen.getByText('SDI100123')).toBeTruthy();
  });

  it('copies the transfer content so the customer can paste it into their banking app', async () => {
    render(<SepayQrDialog details={checkout} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Transfer content' }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('SDI100123');
    });
    await waitFor(() => {
      expect(screen.getByText('Transfer content copied.')).toBeTruthy();
    });
  });

  it('falls back to manual bank-transfer guidance when the QR image cannot load', async () => {
    render(<SepayQrDialog details={checkout} amountVnd="11.000.000 ₫" onClose={vi.fn()} />);

    fireEvent.error(screen.getByRole('img', { name: 'VietQR code for this service fee payment' }));

    await waitFor(() => {
      expect(
        screen.getByText(
          'QR image unavailable. Use the bank details below to transfer manually.',
        ),
      ).toBeTruthy();
    });
    // The manual transfer details must remain available so the customer can still pay.
    expect(screen.getByText('SDI100123')).toBeTruthy();
    expect(screen.getByText('0123456789')).toBeTruthy();
  });

  it('does not render the dialog body when there are no checkout details', () => {
    render(<SepayQrDialog details={undefined} onClose={vi.fn()} />);

    expect(screen.queryByRole('img', { name: 'VietQR code for this service fee payment' })).toBeNull();
    expect(screen.queryByText('SDI100123')).toBeNull();
  });

  it('offers a manual status check and reports the checking state', () => {
    const onCheckNow = vi.fn();
    render(
      <SepayQrDialog details={checkout} checking onCheckNow={onCheckNow} onClose={vi.fn()} />,
    );

    const checkButton = screen.getByRole('button', { name: 'Checking…' });
    expect(checkButton.hasAttribute('disabled')).toBe(true);

    cleanup();
    render(<SepayQrDialog details={checkout} onCheckNow={onCheckNow} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Check payment status' }));
    expect(onCheckNow).toHaveBeenCalledTimes(1);
  });

  it('closes through the dialog close action', () => {
    const onClose = vi.fn();
    render(<SepayQrDialog details={checkout} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });
});
