import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/features/auth/store/authStore';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  start: vi.fn(),
  complete: vi.fn(),
  postpone: vi.fn(),
  abort: vi.fn(),
  getById: vi.fn(),
  uploadFlightPermit: vi.fn(),
  importFlightLog: vi.fn(),
  declareManualFlight: vi.fn(),
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

vi.mock('../api/smartDroneHubApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/smartDroneHubApi')>();
  return {
    ...actual,
    smartDroneHubApi: {
      ...actual.smartDroneHubApi,
      importFlightLog: mocks.importFlightLog,
      declareManualFlight: mocks.declareManualFlight,
    },
  };
});

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
  telemetrySource: null,
  hasFlightReport: false,
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
    sessionStorage.clear();
    localStorage.clear();
    useAuthStore.setState({ roles: [] });
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
    expect(screen.queryByRole('button', { name: 'Postpone' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Abort session' })).toBeTruthy();
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

  it('records an abort with the inspector stated reason', async () => {
    renderWithClient();

    fireEvent.click(await screen.findByRole('button', { name: 'Abort session' }));
    fireEvent.change(await screen.findByLabelText(/Abort reason/), {
      target: { value: 'Unauthorised personnel entered the exclusion zone.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Abort session', hidden: false }));

    await waitFor(() =>
      expect(mocks.abort).toHaveBeenCalledWith(
        'inspection-1',
        'session-1',
        'Unauthorised personnel entered the exclusion zone.',
      ),
    );
  });

  it('displays a warning alert when previous flight session was aborted', async () => {
    mocks.list.mockResolvedValue([
      {
        ...SESSION,
        status: 'ABORTED',
        abortReason: 'Heavy rain and storm',
        endedAt: '2026-10-20T03:00:00Z',
      },
    ]);
    renderWithClient();

    expect(await screen.findByText('Previous flight session was aborted')).toBeTruthy();
    expect(screen.getByText(/Heavy rain and storm/)).toBeTruthy();
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

  it('unlocks the post-flight step from persisted imported-log state after reload', async () => {
    mocks.list.mockResolvedValue([{ ...SESSION, hasFlightReport: true, telemetrySource: 'IMPORTED_LOG_SRT' }]);
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        <MemoryRouter initialEntries={['/operations/inspections/inspection-1/post-flight']}>
          <Routes>
            <Route path="/operations/inspections/:inspectionId/post-flight" element={<FieldSessionPage stage="post-flight" />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Post-flight & Inspection Items')).toBeTruthy();
    expect(screen.queryByText(/Record the flight using live telemetry/)).toBeNull();
  });

  it('shows one inclusive blocker when post-flight is opened before any flight record exists', async () => {
    mocks.list.mockResolvedValue([SESSION]);
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        <MemoryRouter initialEntries={['/operations/inspections/inspection-1/post-flight']}>
          <Routes>
            <Route path="/operations/inspections/:inspectionId/post-flight" element={<FieldSessionPage stage="post-flight" />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText(
        'Record the flight using live telemetry, an imported flight log, or a manual declaration before completing the post-flight checklist.',
      ),
    ).toBeTruthy();
  });

  it('invalidates field sessions on flight log import so the flight step enables Continue to Post-flight & Items', async () => {
    useAuthStore.setState({ roles: ['INSPECTOR'] });
    mocks.list
      .mockResolvedValueOnce([SESSION])
      .mockResolvedValueOnce([{ ...SESSION, hasFlightReport: true, telemetrySource: 'IMPORTED_LOG_SRT' }]);
    mocks.importFlightLog.mockResolvedValue({
      inspectionId: 'inspection-1',
      fieldSessionId: 'session-1',
      telemetrySource: 'IMPORTED_LOG_SRT',
      startedAt: null,
      endedAt: null,
      durationSeconds: null,
      distanceFlownMeters: null,
      maxAltitudeMeters: null,
      startBatteryPercent: null,
      endBatteryPercent: null,
      finalState: 'UNKNOWN',
      note: 'Imported SRT',
      flightTrace: [],
    });

    const { container } = render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        <MemoryRouter initialEntries={['/operations/inspections/inspection-1/field-session']}>
          <Routes>
            <Route path="/operations/inspections/:inspectionId/field-session" element={<FieldSessionPage stage="flight" />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const continueButton = (await screen.findByRole('button', { name: 'Continue to Post-flight & Items' })) as HTMLButtonElement;
    expect(continueButton.disabled).toBe(true);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(['srt'], 'flight.srt', { type: 'text/plain' })] },
    });

    await waitFor(() => expect(continueButton.disabled).toBe(false));
    expect(sessionStorage.getItem('sdi_has_flown_session-1')).toBeNull();
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

  it('allows starting and completing a session using the structured pre-flight and post-flight checklists', async () => {
    mocks.list.mockResolvedValue([]);
    renderWithClient();

    fireEvent.click(await screen.findByRole('button', { name: 'Start session' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Check all' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start session', hidden: false }));

    await waitFor(() =>
      expect(mocks.start).toHaveBeenCalledWith(
        'inspection-1',
        expect.stringContaining('[✓] Drone airframe, propellers & camera gimbal inspected and intact'),
      ),
    );
  });
});
