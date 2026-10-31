import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  start: vi.fn(),
  complete: vi.fn(),
  postpone: vi.fn(),
  abort: vi.fn(),
  getById: vi.fn(),
  uploadFlightPermit: vi.fn(),
}));

vi.mock('../api/fieldSessionApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/fieldSessionApi')>();
  return {
    ...actual,
    fieldSessionApi: {
      ...actual.fieldSessionApi,
      list: mocks.list,
      start: mocks.start,
      complete: mocks.complete,
      postpone: mocks.postpone,
      abort: mocks.abort,
    },
  };
});

vi.mock('../api/inspectionApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/inspectionApi')>();
  return {
    ...actual,
    inspectionApi: {
      ...actual.inspectionApi,
      getById: mocks.getById,
      uploadFlightPermit: mocks.uploadFlightPermit,
    },
  };
});

import FieldSessionPage from './FieldSessionPage';

const SESSION = {
  id: 'session-1',
  inspectionId: 'inspection-1',
  status: 'IN_PROGRESS' as const,
  preFlightChecklistNote: 'Checked assigned drone M350, site access clear.',
  startedAt: '2026-10-20T02:00:00Z',
  endedAt: null,
  postponementReason: null,
  abortReason: null,
  outcomeNotes: null,
};

const INSPECTION = {
  id: 'inspection-1',
  assetName: 'Red River Bridge',
  locationText: JSON.stringify({ latitude: 21.0285, longitude: 105.8542, label: 'Hanoi, Vietnam' }),
  status: 'SCHEDULED',
  flightPermitFileName: 'permit-license.pdf',
  flightPermitUploadedAt: '2026-10-20T01:00:00Z',
  inspectionItems: ['Mố cầu', 'Dầm chính'],
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
    mocks.getById.mockResolvedValue(INSPECTION);
    mocks.list.mockResolvedValue([SESSION]);
    mocks.start.mockResolvedValue(SESSION);
    mocks.complete.mockResolvedValue({
      ...SESSION,
      status: 'FIELD_COMPLETED',
      outcomeNotes: 'All bridge spans surveyed.',
    });
    mocks.postpone.mockResolvedValue({ ...SESSION, status: 'POSTPONED' });
    mocks.abort.mockResolvedValue({ ...SESSION, status: 'ABORTED' });
  });

  afterEach(() => {
    cleanup();
  });

  it('keeps the field-session screen focused on permit and session actions', async () => {
    renderWithClient();

    expect(await screen.findByText('Session in progress')).toBeTruthy();
    expect(screen.getByText('Red River Bridge')).toBeTruthy();
    expect(screen.getByText(/permit-license\.pdf/)).toBeTruthy();
    expect(screen.getByText(/Checked assigned drone M350/)).toBeTruthy();
    expect(screen.queryByText('Bản đồ Không phận & Vùng cấm bay')).toBeNull();
    expect(screen.queryByText('Asset Inspection Checkpoints & Pre-Flight Checklist')).toBeNull();
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.getByRole('button', { name: 'Complete session' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Postpone' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Abort' })).toBeTruthy();
  });

  it('shows the permit upload action when inspection status is SCHEDULED', async () => {
    mocks.getById.mockResolvedValue({
      ...INSPECTION,
      status: 'SCHEDULED',
      flightPermitFileName: null,
    });
    mocks.list.mockResolvedValue([]);

    renderWithClient();

    expect(await screen.findByText('Flight permit')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Choose permit file' })).toBeTruthy();
    expect(
      screen.getByText(/does not verify validity or grant permission to fly/i),
    ).toBeTruthy();
    expect(
      (screen.getByRole('button', { name: 'Start session' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('requires the inspector own pre-flight note before starting a session', async () => {
    mocks.list.mockResolvedValue([]);
    renderWithClient();

    fireEvent.click(await screen.findByRole('button', { name: 'Start session' }));

    const note = await screen.findByLabelText(/Pre-flight note/);
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
    mocks.list.mockResolvedValue([]);
    renderWithClient();

    fireEvent.click(await screen.findByRole('button', { name: 'Start session' }));
    fireEvent.change(await screen.findByLabelText(/Pre-flight note/), {
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
    fireEvent.click(screen.getByRole('button', { name: 'Stop session' }));

    await waitFor(() =>
      expect(mocks.abort).toHaveBeenCalledWith(
        'inspection-1',
        'session-1',
        'Unauthorised personnel entered the exclusion zone.',
      ),
    );
  });

  it('records session completion with the inspector outcome notes and displays them when completed', async () => {
    renderWithClient();

    fireEvent.click(await screen.findByRole('button', { name: 'Complete session' }));
    fireEvent.change(await screen.findByLabelText(/Session notes/), {
      target: { value: 'All bridge spans surveyed.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Complete session', hidden: false }));

    await waitFor(() =>
      expect(mocks.complete).toHaveBeenCalledWith(
        'inspection-1',
        'session-1',
        'All bridge spans surveyed.',
      ),
    );
  });

  it('displays outcome notes on a FIELD_COMPLETED session row', async () => {
    mocks.list.mockResolvedValue([
      {
        ...SESSION,
        status: 'FIELD_COMPLETED',
        endedAt: '2026-10-20T03:00:00Z',
        outcomeNotes: 'North and south spans fully photographed.',
      },
    ]);

    renderWithClient();

    expect(
      await screen.findByText(/North and south spans fully photographed\./),
    ).toBeTruthy();
  });

  it('does not offer session start after the inspection has left the ready state', async () => {
    mocks.getById.mockResolvedValue({ ...INSPECTION, status: 'REPORT_DRAFT' });
    mocks.list.mockResolvedValue([
      { ...SESSION, status: 'FIELD_COMPLETED', endedAt: '2026-10-20T03:00:00Z' },
    ]);

    renderWithClient();

    expect(await screen.findByText('Field session complete')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Continue to evidence' }).getAttribute('href')).toContain('/evidence');
    expect(screen.queryByRole('button', { name: 'Start session' })).toBeNull();
  });

  it('does not treat browser-only checklist state as a readiness gate', async () => {
    localStorage.setItem('inspection_checked_items_inspection-1', '{"0":true,"1":true}');
    localStorage.setItem('inspection_checklist_confirmed_inspection-1', 'true');
    mocks.list.mockResolvedValue([]);

    renderWithClient();

    expect(await screen.findByRole('button', { name: 'Start session' })).toBeTruthy();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });
});
