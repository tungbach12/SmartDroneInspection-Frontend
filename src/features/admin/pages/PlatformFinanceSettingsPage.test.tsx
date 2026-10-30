import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PlatformFinanceSettingsPage from './PlatformFinanceSettingsPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as financeHooks from '../hooks/useInspectionFinance';

vi.mock('../hooks/useInspectionFinance');

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe('PlatformFinanceSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders settings fields and allows submitting updated rates', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({});
    vi.spyOn(financeHooks, 'useInspectionFinanceSettings').mockReturnValue({
      data: {
        commissionRate: 25.0,
        vatRate: 10.0,
        tncnRate: 10.0,
        configured: true,
        updatedByUserId: 'admin-1',
        updatedAt: '2026-10-30T10:00:00Z',
        accountingDisclaimer: 'Test disclaimer',
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.spyOn(financeHooks, 'useUpdateInspectionFinanceSettings').mockReturnValue({
      mutateAsync,
      isPending: false,
      isError: false,
      error: null,
    } as any);

    renderWithClient(<PlatformFinanceSettingsPage />);

    const commInput = screen.getByLabelText(/Commission Rate/i) as HTMLInputElement;
    const vatInput = screen.getByLabelText(/VAT Rate/i) as HTMLInputElement;
    const tncnInput = screen.getByLabelText(/TNCN Rate/i) as HTMLInputElement;

    expect(commInput.value).toBe('25');
    expect(vatInput.value).toBe('10');
    expect(tncnInput.value).toBe('10');

    fireEvent.change(commInput, { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Rates/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        commissionRate: 20,
        vatRate: 10,
        tncnRate: 10,
      });
    });
  });
});
