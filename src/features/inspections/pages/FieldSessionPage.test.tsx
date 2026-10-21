import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  start: vi.fn(),
  postpone: vi.fn(),
  abort: vi.fn(),
}));

vi.mock('../api/fieldSessionApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/fieldSessionApi')>();
  return {
    ...actual,
    fieldSessionApi: {
      ...actual.fieldSessionApi,
      list: mocks.list,
      start: mocks.start,
      postpone: mocks.postpone,
      abort: mocks.abort,
    },
  };
});

import FieldSessionPage from './FieldSessionPage';

const SESSION = {
  id: 'session-1',
  inspectionId: 'inspection-1',
  organizationId: 'org-1',
  inspectorUserId: 'inspector-1',
  droneId: 'drone-1',
  readinessDecisionId: 'readiness-1',
  checklistTemplateId: null,
  readinessVersion: 1,
  status: 'IN_PROGRESS' as const,
  startedAt: '2026-10-20T02:00:00Z',
  endedAt: null,
  postponementReason: null,
  abortReason: null,
};

function renderWithClient() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/operations/inspections/inspection-1/field-session']}>
        <Routes>
          <Route
            path="/operations/inspections/:inspectionId/field-session"
            element={<FieldSessionPage />}
          />
          <Route path="/operations/inspections/:inspectionId" element={<div>inspection</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('FieldSessionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockResolvedValue([SESSION]);
    mocks.start.mockResolvedValue(SESSION);
    mocks.postpone.mockResolvedValue({ ...SESSION, status: 'POSTPONED' });
    mocks.abort.mockResolvedValue({ ...SESSION, status: 'ABORTED' });
  });

  afterEach(() => {
    cleanup();
  });

  it('lists the sessions with their status', async () => {
    renderWithClient();

    expect(await screen.findByText('IN_PROGRESS')).toBeTruthy();
  });

  it('requires the inspector own pre-flight note before starting a session', async () => {
    renderWithClient();

    fireEvent.click(await screen.findByRole('button', { name: 'Start session' }));

    const note = await screen.findByLabelText(/Pre-flight checklist note/);
    const submit = screen.getByRole('button', { name: 'Start session', hidden: false });
    expect((submit as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(note, { target: { value: 'Checked assigned drone M350, site access clear.' } });
    await waitFor(() =>
      expect(
        (screen.getByRole('button', { name: 'Start session', hidden: false }) as HTMLButtonElement)
          .disabled,
      ).toBe(false),
    );
  });

  it('starts the session with the recorded pre-flight note', async () => {
    renderWithClient();

    fireEvent.click(await screen.findByRole('button', { name: 'Start session' }));
    fireEvent.change(await screen.findByLabelText(/Pre-flight checklist note/), {
      target: { value: 'Checked assigned drone M350, site access clear.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Start session', hidden: false }));

    await waitFor(() =>
      expect(mocks.start).toHaveBeenCalledWith(
        'inspection-1',
        'Checked assigned drone M350, site access clear.',
      ),
    );
  });

  it('records a postponement with the inspector stated reason', async () => {
    renderWithClient();

    fireEvent.click(await screen.findByRole('button', { name: 'Postpone' }));
    fireEvent.change(await screen.findByLabelText(/Reason/), {
      target: { value: 'Crosswind above the safe limit.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Postpone session' }));

    await waitFor(() =>
      expect(mocks.postpone).toHaveBeenCalledWith(
        'inspection-1',
        'session-1',
        'Crosswind above the safe limit.',
      ),
    );
  });

  it('records an abort with the inspector stated reason', async () => {
    renderWithClient();

    fireEvent.click(await screen.findByRole('button', { name: 'Abort' }));
    fireEvent.change(await screen.findByLabelText(/Reason/), {
      target: { value: 'Unauthorised personnel entered the exclusion zone.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Abort session' }));

    await waitFor(() =>
      expect(mocks.abort).toHaveBeenCalledWith(
        'inspection-1',
        'session-1',
        'Unauthorised personnel entered the exclusion zone.',
      ),
    );
  });

  it('does not offer a second session while one is open', async () => {
    renderWithClient();

    const startButton = await screen.findByRole('button', { name: 'Session already open' });
    expect((startButton as HTMLButtonElement).disabled).toBe(true);
  });
});
