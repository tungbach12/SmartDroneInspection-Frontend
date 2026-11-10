import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/features/auth/store/authStore';
import type { SmartDroneHubFlightReport } from '../api/smartDroneHubApi';
import { fieldSessionKeys } from '../api/fieldSessionApi';
import { SmartDroneHubTelemetryPanel } from './SmartDroneHubTelemetryPanel';

const mocks = vi.hoisted(() => ({
  importFlightLog: vi.fn(),
  declareManualFlight: vi.fn(),
  telemetry: vi.fn(),
  start: vi.fn(),
}));

vi.mock('../api/smartDroneHubApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/smartDroneHubApi')>();
  return {
    ...actual,
    smartDroneHubApi: {
      ...actual.smartDroneHubApi,
      importFlightLog: mocks.importFlightLog,
      declareManualFlight: mocks.declareManualFlight,
      telemetry: mocks.telemetry,
      start: mocks.start,
    },
  };
});

const importedReport = {
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
  note: 'Imported SRT segment with available telemetry only.',
  flightTrace: [
    {
      latitude: 21.0285,
      longitude: 105.8542,
      altitudeMeters: null,
      groundSpeedMps: null,
      headingDeg: null,
      waypoint: null,
      recordedAt: '2026-11-10T00:00:00Z',
    },
    {
      latitude: 21.0286,
      longitude: 105.8543,
      altitudeMeters: null,
      groundSpeedMps: null,
      headingDeg: null,
      waypoint: null,
      recordedAt: '2026-11-10T00:00:03Z',
    },
  ],
} as unknown as SmartDroneHubFlightReport;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function renderPanel({
  roles = ['INSPECTOR'],
  hasFlightReport = false,
  telemetrySource = null,
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  }),
}: {
  roles?: ('INSPECTOR' | 'ADMIN' | 'MANAGER' | 'CUSTOMER' | 'MAINTENANCE_ENGINEER')[];
  hasFlightReport?: boolean;
  telemetrySource?: string | null;
  queryClient?: QueryClient;
} = {}) {
  useAuthStore.setState({ roles });
  const result = render(
    <QueryClientProvider client={queryClient}>
      <SmartDroneHubTelemetryPanel
        inspectionId="inspection-1"
        fieldSessionId="session-1"
        sessionActive
        hasFlightReport={hasFlightReport}
        telemetrySource={telemetrySource}
      />
    </QueryClientProvider>,
  );
  return { ...result, queryClient };
}

function fileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) throw new Error('Flight log input not found');
  return input;
}

describe('SmartDroneHubTelemetryPanel fallback records', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.telemetry.mockReturnValue(new Promise(() => undefined));
  });

  afterEach(() => {
    cleanup();
    useAuthStore.setState({ roles: [] });
  });

  it('imports a partial SRT and summarizes only the available report metadata without starting live telemetry', async () => {
    mocks.importFlightLog.mockResolvedValue(importedReport);
    const { container, queryClient } = renderPanel();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    queryClient.setQueryData(fieldSessionKeys.forInspection('inspection-1'), [
      { id: 'session-1', hasFlightReport: false },
    ]);
    const file = new File(['partial trace'], 'bridge-track.srt', { type: 'text/plain' });

    fireEvent.change(fileInput(container), { target: { files: [file] } });

    expect(await screen.findByText('Flight log report recorded')).toBeTruthy();
    expect(screen.getByText('bridge-track.srt · SRT · 1 KB')).toBeTruthy();
    expect(screen.getByText('Source: SRT subtitle log')).toBeTruthy();
    expect(screen.getByText('Trace points: 2')).toBeTruthy();
    expect(screen.getByText('Duration: —')).toBeTruthy();
    expect(screen.getByText('Distance: —')).toBeTruthy();
    expect(screen.getByText('Started: —')).toBeTruthy();
    expect(screen.getByText('Ended: —')).toBeTruthy();
    expect(screen.getByText('Recorded flight state: UNKNOWN')).toBeTruthy();
    expect(screen.getByText(/SRT subtitles can contain a partial trace/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Connect Flight Operations' })).toBeTruthy();
    expect(mocks.start).not.toHaveBeenCalled();
    expect(queryClient.getQueryData(['smartdronehub', 'flight-report', 'inspection-1', 'session-1'])).toEqual(importedReport);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: fieldSessionKeys.forInspection('inspection-1') });
  });

  it('shows upload progress and prevents duplicate import while parsing', async () => {
    const upload = deferred<SmartDroneHubFlightReport>();
    mocks.importFlightLog.mockReturnValue(upload.promise);
    const { container } = renderPanel();
    const input = fileInput(container);

    fireEvent.change(input, {
      target: { files: [new File(['gps'], 'flight.csv', { type: 'text/csv' })] },
    });

    expect(await screen.findByRole('button', { name: 'Parsing flight log…' })).toBeTruthy();
    expect((input.closest('label') as HTMLLabelElement).className).toContain('Mui-disabled');
    upload.resolve(importedReport);
    expect(await screen.findByText('Flight log report recorded')).toBeTruthy();
  });

  it('shows an API error and permits re-upload after a failed parse', async () => {
    mocks.importFlightLog.mockRejectedValueOnce(new Error('Unsupported GPS data'));
    mocks.importFlightLog.mockResolvedValueOnce(importedReport);
    const { container } = renderPanel();
    const input = fileInput(container);

    fireEvent.change(input, {
      target: { files: [new File(['invalid'], 'flight.gpx', { type: 'application/gpx+xml' })] },
    });
    expect(await screen.findByRole('alert', { name: '' }).catch(() => screen.findByText('Unsupported GPS data'))).toBeTruthy();
    expect(screen.getByText('Unsupported GPS data')).toBeTruthy();

    fireEvent.change(input, {
      target: { files: [new File(['valid'], 'flight.gpx', { type: 'application/gpx+xml' })] },
    });
    expect(await screen.findByText('Flight log report recorded')).toBeTruthy();
    await waitFor(() => expect(screen.queryByText('Unsupported GPS data')).toBeNull());
    expect(mocks.importFlightLog).toHaveBeenCalledTimes(2);
  });

  it('records a manual declaration only after explicit confirmation and shows estimated values as a declaration', async () => {
    const declaration = deferred<SmartDroneHubFlightReport>();
    mocks.declareManualFlight.mockReturnValue(declaration.promise);
    const { queryClient } = renderPanel();
    queryClient.setQueryData(fieldSessionKeys.forInspection('inspection-1'), [
      { id: 'session-1', hasFlightReport: false },
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'No supported log? Declare flight manually' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Estimated flight duration (minutes)' }), {
      target: { value: '20' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Field note' }), {
      target: { value: 'Inspector reports a short visual survey.' },
    });
    const saveButton = screen.getByRole('button', { name: 'Save manual declaration' });
    expect((saveButton as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('checkbox', { name: /I confirm this is my field declaration/ }));
    fireEvent.click(saveButton);

    expect(await screen.findByRole('button', { name: 'Saving declaration…' })).toBeTruthy();
    expect(mocks.declareManualFlight).toHaveBeenCalledWith('inspection-1', 'session-1', {
      reasonCode: 'NO_MAVLINK_SUPPORT',
      estimatedDurationMinutes: 20,
      maxAltitudeMeters: null,
      notes: 'Inspector reports a short visual survey.',
    });
    declaration.resolve({
      ...importedReport,
      telemetrySource: 'MANUAL_DECLARATION',
      flightTrace: [],
      note: 'Manual declaration',
    });

    expect(await screen.findByText('Manual flight declaration recorded')).toBeTruthy();
    expect(screen.getByText('Inspector declaration only; values are estimates, not telemetry or independent verification.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Connect Flight Operations' })).toBeTruthy();
    expect(mocks.start).not.toHaveBeenCalled();
  });

  it('renders a manual declaration error and enforces the file-size limit before upload', async () => {
    mocks.declareManualFlight.mockRejectedValue(new Error('Declaration was refused'));
    const { container } = renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'No supported log? Declare flight manually' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Estimated flight duration (minutes)' }), {
      target: { value: '20' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Field note' }), {
      target: { value: 'Inspector field note.' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: /I confirm this is my field declaration/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save manual declaration' }));
    expect(await screen.findByText('Declaration was refused')).toBeTruthy();

    const oversized = new File([new Uint8Array(15 * 1024 * 1024 + 1)], 'large.csv', { type: 'text/csv' });
    fireEvent.change(fileInput(container), { target: { files: [oversized] } });
    expect(await screen.findByText('Select a non-empty flight log no larger than 15 MB.')).toBeTruthy();
    expect(mocks.importFlightLog).not.toHaveBeenCalled();
  });

  it('hides import and manual controls from non-inspector roles', () => {
    renderPanel({ roles: ['MANAGER'] });

    expect(screen.queryByRole('button', { name: 'Choose flight log' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'No exportable log? Record a manual declaration' })).toBeNull();
    expect(mocks.importFlightLog).not.toHaveBeenCalled();
    expect(mocks.declareManualFlight).not.toHaveBeenCalled();
  });

  it('uses persisted source metadata after refresh without browser storage or guessed report values', () => {
    renderPanel({ hasFlightReport: true, telemetrySource: 'IMPORTED_LOG_CSV' });

    expect(screen.getByText('Source: Imported log · CSV')).toBeTruthy();
    expect(screen.getByText('Duration: —')).toBeTruthy();
    expect(screen.getByText('Recorded flight state: —')).toBeTruthy();
  });
});
