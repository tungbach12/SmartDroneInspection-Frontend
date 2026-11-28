import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import PlatformOperationsSettingsPage from './PlatformOperationsSettingsPage';
import { operationsSettingsApi } from '../api/operationsSettingsApi';

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PlatformOperationsSettingsPage embedded />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PlatformOperationsSettingsPage', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('loads and updates dispatch timeout hours, lead days, and API timeout seconds', async () => {
    vi.spyOn(operationsSettingsApi, 'getSettings').mockResolvedValue({
      assignmentAcceptanceTimeoutHours: 24,
      serviceRequestLeadDays: 20,
      apiRequestTimeoutSeconds: 120,
      updatedByUserId: null,
      updatedAt: null,
    });
    const updateSpy = vi.spyOn(operationsSettingsApi, 'updateSettings').mockResolvedValue({
      assignmentAcceptanceTimeoutHours: 36,
      serviceRequestLeadDays: 10,
      apiRequestTimeoutSeconds: 240,
      updatedByUserId: 'admin-1',
      updatedAt: '2026-11-27T10:00:00Z',
    });

    renderPage();

    const hoursInput = (await screen.findByLabelText(
      /Assignment acceptance timeout \(hours\)/i,
    )) as HTMLInputElement;
    const leadDaysInput = screen.getByLabelText(
      /Minimum scheduling lead time \(days\)/i,
    ) as HTMLInputElement;
    const apiTimeoutInput = screen.getByLabelText(
      /API request timeout \(seconds\)/i,
    ) as HTMLInputElement;

    expect(hoursInput.value).toBe('24');
    expect(leadDaysInput.value).toBe('20');
    expect(apiTimeoutInput.value).toBe('120');

    fireEvent.change(hoursInput, { target: { value: '36' } });
    fireEvent.change(leadDaysInput, { target: { value: '10' } });
    fireEvent.change(apiTimeoutInput, { target: { value: '240' } });
    fireEvent.click(screen.getByRole('button', { name: /Save settings/i }));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith({
        assignmentAcceptanceTimeoutHours: 36,
        serviceRequestLeadDays: 10,
        apiRequestTimeoutSeconds: 240,
      });
    });

    expect(await screen.findByText(/Operations settings updated successfully\./i)).toBeTruthy();
  });
});
