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
  flightReport: vi.fn(),
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
      flightReport: mocks.flightReport,
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

function renderWithClient(stage?: 'permit' | 'pre-flight' | 'flight' | 'post-flight') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/operations/inspections/inspection-1/field-session']}>
        <Routes>
          <Route
            path="/operations/inspections/:inspectionId/field-session"
            element={stage ? <FieldSessionPage stage={stage} /> : <FieldSessionPage />}
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
    mocks.flightReport.mockResolvedValue({
      inspectionId: 'inspection-1',
      fieldSessionId: 'session-1',
      telemetrySource: 'NONE',
      startedAt: null,
      endedAt: null,
      durationSeconds: null,
      distanceFlownMeters: null,
      maxAltitudeMeters: null,
      startBatteryPercent: null,
      endBatteryPercent: null,
      finalState: 'UNKNOWN',
      note: '',
      flightTrace: [],
    });
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
      flightPermitVerificationStatus: 'NOT_UPLOADED',
    });
    mocks.list.mockResolvedValue([]);

    renderWithClient();

    expect(await screen.findByText('Flight permit')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Choose permit file' })).toBeTruthy();
    expect(
      screen.queryByText(/Upload the permit document and details for Platform Manager verification/i),
    ).toBeNull();
    expect(
      (screen.getByRole('button', { name: 'Start session' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('blocks starting a field session while flight permit verification is PENDING_REVIEW or REJECTED', async () => {
    mocks.getById.mockResolvedValue({
      ...INSPECTION,
      status: 'SCHEDULED',
      flightPermitVerificationStatus: 'PENDING_REVIEW',
    });
    mocks.list.mockResolvedValue([]);

    renderWithClient();

    expect(
      await screen.findByText(/Awaiting Manager verification/i),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Submit flight permit for verification' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Replace permit' }));
    expect(screen.getByRole('button', { name: 'Submit flight permit for verification' })).toBeTruthy();
    expect(
      (screen.getByRole('button', { name: 'Start session' }) as HTMLButtonElement).disabled,
    ).toBe(true);

    cleanup();
    mocks.getById.mockResolvedValue({
      ...INSPECTION,
      status: 'SCHEDULED',
      flightPermitVerificationStatus: 'REJECTED',
      flightPermitRejectionReason: 'Missing military authority stamp',
    });

    renderWithClient();

    expect(
      await screen.findByText(/Missing military authority stamp/i),
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

  it('does not duplicate the aborted-session alert owned by InspectionDetailPage', async () => {
    mocks.list.mockResolvedValue([
      {
        ...SESSION,
        status: 'ABORTED',
        abortReason: 'Heavy rain and storm',
        endedAt: '2026-10-20T03:00:00Z',
      },
    ]);
    renderWithClient();

    expect(await screen.findByRole('button', { name: 'Start session' })).toBeTruthy();
    expect(screen.queryByText('Previous flight session was aborted')).toBeNull();
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
        expect.stringContaining('[✓] Airframe, propellers & mounting secure'),
      ),
    );
  });

  it('blocks starting a field session when reassignmentRequired is true', async () => {
    mocks.getById.mockResolvedValue({
      ...INSPECTION,
      reassignmentRequired: true,
      declineReason: 'Weather hold',
    });
    mocks.list.mockResolvedValue([]);

    renderWithClient();

    expect(
      await screen.findByText(/This inspection was declined and requires Platform Manager reassignment/i),
    ).toBeTruthy();
    expect(
      (screen.getByRole('button', { name: 'Start session' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('disables starting a new session when the scheduled flight window has elapsed after an abort', async () => {
    mocks.getById.mockResolvedValue({
      ...INSPECTION,
      plannedStartAt: new Date(Date.now() - 7200_000).toISOString(),
      plannedEndAt: new Date(Date.now() - 3600_000).toISOString(),
    });
    mocks.list.mockResolvedValue([
      {
        ...SESSION,
        status: 'ABORTED',
        abortReason: 'UAV battery or hardware warning',
        endedAt: '2026-11-14T10:00:00Z',
      },
    ]);

    renderWithClient();

    expect(
      await screen.findByText(/The scheduled flight window has elapsed\. Contact the Platform Manager to reschedule/i),
    ).toBeTruthy();
    expect(screen.queryByText('Previous flight session was aborted')).toBeNull();
    expect(
      (screen.getByRole('button', { name: 'Start session' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('warns and requires confirmation before replacing an already approved flight permit', async () => {
    mocks.getById.mockResolvedValue({
      ...INSPECTION,
      status: 'SCHEDULED',
      flightPermitVerificationStatus: 'APPROVED',
      flightPermitNumber: '184/GP-TC',
      flightPermitAuthority: 'Cục Tác chiến',
      flightPermitValidFrom: '2026-12-20T01:00:00Z',
      flightPermitValidTo: '2026-12-20T05:00:00Z',
    });
    mocks.list.mockResolvedValue([]);
    mocks.uploadFlightPermit.mockResolvedValue({
      ...INSPECTION,
      flightPermitVerificationStatus: 'PENDING_REVIEW',
    });

    renderWithClient();

    fireEvent.click(await screen.findByRole('button', { name: 'Replace permit' }));
    expect(
      screen.getByText(
        /Replacing an approved permit revokes the current approval and resets verification to Pending Review/i,
      ),
    ).toBeTruthy();

    const fileInput = screen.getByLabelText('Choose permit file') as HTMLInputElement;
    const replacementFile = new File(['%PDF-1.4\n'], 'replacement-permit.pdf', {
      type: 'application/pdf',
    });
    fireEvent.change(fileInput, { target: { files: [replacementFile] } });

    fireEvent.click(screen.getByRole('button', { name: 'Submit flight permit for verification' }));

    expect(await screen.findByText('Replace approved flight permit?')).toBeTruthy();
    expect(mocks.uploadFlightPermit).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Replace & resubmit' }));

    await waitFor(() => expect(mocks.uploadFlightPermit).toHaveBeenCalledTimes(1));
  });

  it('separates required and optional general pre-flight checks and only gates takeoff on required checks', async () => {
    mocks.getById.mockResolvedValue({
      ...INSPECTION,
      status: 'SCHEDULED',
      flightPermitVerificationStatus: 'APPROVED',
    });
    mocks.list.mockResolvedValue([]);

    renderWithClient('pre-flight');

    expect(await screen.findByText('Pre-flight safety checklist')).toBeTruthy();
    expect(screen.getByText('Required checks')).toBeTruthy();
    expect(screen.getByText('Optional checks')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Check all' })).toHaveLength(1);

    const codes = screen
      .getAllByText(/^PF-0[1-7]$/)
      .map((el) => el.textContent?.trim());
    expect(codes).toEqual(['PF-01', 'PF-02', 'PF-03', 'PF-04', 'PF-05', 'PF-06', 'PF-07']);

    const submitButton = screen.getByRole('button', {
      name: 'Start session & Continue to Flight',
    }) as HTMLButtonElement;
    expect(submitButton.disabled).toBe(true);

    // Tick only the 4 required items (leave PF-05..PF-07 optional unchecked)
    fireEvent.click(screen.getByText('Airframe, propellers & mounting secure'));
    fireEvent.click(screen.getByText('Battery levels sufficient for planned flight'));
    fireEvent.click(screen.getByText('Weather & visibility within safe operating limits'));
    fireEvent.click(screen.getByText('Takeoff/landing zone clear of people & hazards'));

    expect(submitButton.disabled).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Check all' }));
    expect(screen.getByText('7/7 verified')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Clear all' })).toBeTruthy();
  });

  it('treats default post-flight checks as optional while still gating on unchecked building inspection items', async () => {
    mocks.list.mockResolvedValue([
      { ...SESSION, hasFlightReport: true, telemetrySource: 'IMPORTED_LOG_SRT' },
    ]);

    renderWithClient('post-flight');

    expect(await screen.findByText('Post-flight & Inspection Items')).toBeTruthy();
    expect(screen.getByText('Optional')).toBeTruthy();

    const completeButton = screen.getByRole('button', {
      name: 'Complete session & Continue to Evidence',
    }) as HTMLButtonElement;
    // Unchecked building inspection items still require checking or explanation
    expect(completeButton.disabled).toBe(true);

    // Checking only Target Building Inspection Items unlocks completion even with optional post-flight items unchecked
    fireEvent.click(screen.getByText('Mố cầu'));
    fireEvent.click(screen.getByText('Dầm chính'));
    expect(completeButton.disabled).toBe(false);
  });

  it('opens the hidden 3D flight simulation demo dialog from Step 3 flight panel', async () => {
    renderWithClient('flight');

    const hiddenBtn = await screen.findByTestId('step3-hidden-3d-demo-trigger');
    expect(hiddenBtn).toBeTruthy();

    fireEvent.click(hiddenBtn);

    expect(await screen.findByText('3D WAYPOINT SIMULATION')).toBeTruthy();
    expect(screen.getByText('Gazebo Gimbal Feed (Synced)')).toBeTruthy();
  });

  it('starts immediately with startNow=true via the hidden pre-flight Start now trigger', async () => {
    mocks.getById.mockResolvedValue({
      ...INSPECTION,
      status: 'SCHEDULED',
      flightPermitVerificationStatus: 'APPROVED',
    });
    mocks.list.mockResolvedValue([]);

    renderWithClient('pre-flight');

    const hiddenStartNow = await screen.findByTestId('preflight-hidden-start-now-trigger');
    fireEvent.change(screen.getByLabelText(/Pre-flight note/), {
      target: { value: 'Immediate demo start requested' },
    });
    fireEvent.click(hiddenStartNow);

    await waitFor(() =>
      expect(mocks.start).toHaveBeenCalledWith(
        'inspection-1',
        'Immediate demo start requested',
        true,
      ),
    );
  });

  it('keeps flight log re-upload available on Step 3 after Step 4 completes (FIELD_COMPLETED)', async () => {
    useAuthStore.setState({ roles: ['INSPECTOR'] });
    mocks.getById.mockResolvedValue({
      ...INSPECTION,
      status: 'FIELD_COMPLETED',
      flightPermitVerificationStatus: 'APPROVED',
    });
    mocks.list.mockResolvedValue([
      {
        ...SESSION,
        status: 'FIELD_COMPLETED',
        endedAt: '2026-10-20T03:00:00Z',
        hasFlightReport: true,
        telemetrySource: 'IMPORTED_LOG_SRT',
      },
    ]);
    mocks.flightReport.mockResolvedValue({
      inspectionId: 'inspection-1',
      fieldSessionId: 'session-1',
      telemetrySource: 'IMPORTED_LOG_SRT',
      startedAt: null,
      endedAt: null,
      durationSeconds: 24,
      distanceFlownMeters: 210.5,
      maxAltitudeMeters: 36,
      startBatteryPercent: null,
      endBatteryPercent: null,
      finalState: 'UNKNOWN',
      note: 'Imported SRT',
      flightTrace: [],
    });

    renderWithClient('flight');

    expect(await screen.findByText('Field session complete')).toBeTruthy();
    expect(screen.getByText('No MAVLink? Import a flight log')).toBeTruthy();
    expect(await screen.findByRole('button', { name: 'Upload another log' })).toBeTruthy();
  });
});
