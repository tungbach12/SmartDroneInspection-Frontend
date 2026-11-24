import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { theme } from '@/app/theme/theme';
import { DroneFeatureConfigTab } from './DroneFeatureConfigTab';
import { droneFeatureConfigApi } from '../api/droneFeatureConfigApi';

vi.mock('@/shared/i18n/LocaleProvider', () => ({
  useLocale: () => ({ locale: 'en', setLocale: vi.fn(), t: (s: string) => s }),
}));

vi.mock('../api/droneFeatureConfigApi', () => ({
  droneFeatureConfigApi: {
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({
      id: 'cfg-1',
      code: 'LOA_PHAT_THANH',
      nameVi: 'Loa phát thanh',
      nameEn: 'Loa phát thanh',
      category: 'CAPABILITY',
      isActive: true,
      displayOrder: 1,
      createdAt: '2026-11-24T00:00:00Z',
      updatedAt: '2026-11-24T00:00:00Z',
    }),
    update: vi.fn(),
    toggleActive: vi.fn(),
    delete: vi.fn(),
  },
}));

function renderTab() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <DroneFeatureConfigTab />
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('DroneFeatureConfigTab', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('auto-generates feature code and allows creating a capability from a single name', async () => {
    renderTab();

    fireEvent.click(await screen.findByRole('button', { name: /Add Feature/i }));
    const dialog = await screen.findByRole('dialog');

    fireEvent.change(within(dialog).getByLabelText(/Vietnamese Name/i), {
      target: { value: 'Loa phát thanh' },
    });

    const codeInput = within(dialog).getByLabelText(/Feature Code/i) as HTMLInputElement;
    expect(codeInput.value).toBe('LOA_PHAT_THANH');

    fireEvent.click(within(dialog).getByRole('button', { name: /Save Config/i }));

    await waitFor(() => {
      expect(droneFeatureConfigApi.create).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'LOA_PHAT_THANH',
          nameVi: 'Loa phát thanh',
          nameEn: 'Loa phát thanh',
          category: 'CAPABILITY',
          isActive: true,
        }),
      );
    });
  });
});
