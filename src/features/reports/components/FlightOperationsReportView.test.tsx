import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FlightOperationsReportView } from './FlightOperationsReportView';

const mocks = vi.hoisted(() => ({ report: vi.fn() }));
vi.mock('@/features/inspections/api/smartDroneHubApi', () => ({
  smartDroneHubApi: { flightReport: mocks.report },
}));
vi.mock('./MapLibreFlightTrajectoryCanvas', () => ({
  MapLibreFlightTrajectoryCanvas: ({
    samples,
    viewDimension,
  }: {
    samples: Array<{ latitude: number; longitude: number; altitude: number | null }>;
    viewDimension: '2d' | '3d';
  }) => (
    <div data-testid="trajectory-map" data-dimension={viewDimension} data-count={samples.length}>
      {`Map:${viewDimension}:${samples.length}`}
    </div>
  ),
}));

const manualReport = {
  inspectionId: 'inspection-1',
  fieldSessionId: 'session-1',
  telemetrySource: 'MANUAL_DECLARATION',
  startedAt: null,
  endedAt: null,
  durationSeconds: 1200,
  distanceFlownMeters: null,
  maxAltitudeMeters: 40,
  startBatteryPercent: null,
  endBatteryPercent: null,
  finalState: null,
  note: 'Manual flight declaration (no telemetry). Inspector note=Survey complete.',
  flightTrace: [],
};

function renderReport() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <FlightOperationsReportView inspectionId="inspection-1" fieldSessionId="session-1" />
    </QueryClientProvider>,
  );
}

describe('FlightOperationsReportView', () => {
  afterEach(() => {
    cleanup();
    mocks.report.mockReset();
  });

  it('shows a manual declaration without inventing a telemetry path, battery reading, or landing proof', async () => {
    mocks.report.mockResolvedValue(manualReport);
    renderReport();
    expect(await screen.findByText('Manual declaration · no telemetry')).toBeTruthy();
    expect(screen.getByText(/Survey complete/)).toBeTruthy();
    expect(screen.queryByText(/100%/)).toBeNull();
    expect(screen.queryByText(/LANDED|Takeoff|Landing/i)).toBeNull();
    expect(screen.queryByTestId('trajectory-map')).toBeNull();
  });

  it('renders imported SRT video segment data truthfully with missing battery, speed, timestamps, and duration=0', async () => {
    mocks.report.mockResolvedValue({
      inspectionId: 'inspection-1',
      fieldSessionId: 'session-1',
      telemetrySource: 'IMPORTED_LOG_SRT',
      startedAt: null,
      endedAt: null,
      durationSeconds: 0,
      distanceFlownMeters: 28.4,
      maxAltitudeMeters: 22.5,
      startBatteryPercent: null,
      endBatteryPercent: null,
      finalState: 'UNKNOWN',
      note: 'Imported flight log: clip_01.srt. Flight trace parsed from the uploaded SRT file; unavailable telemetry fields are not inferred.',
      flightTrace: [
        {
          latitude: 21.0285,
          longitude: 105.8542,
          altitudeMeters: 20.0,
          groundSpeedMps: null,
          headingDeg: null,
          batteryPercent: null,
          flightMode: null,
          waypoint: 1,
          recordedAt: null,
        },
        {
          latitude: 21.0287,
          longitude: 105.8544,
          altitudeMeters: 22.5,
          groundSpeedMps: null,
          headingDeg: null,
          batteryPercent: null,
          flightMode: null,
          waypoint: 2,
          recordedAt: null,
        },
      ],
    });

    renderReport();

    expect(await screen.findByText('Imported flight log summary')).toBeTruthy();
    expect(screen.getByText(/Imported flight log \(SRT\)/)).toBeTruthy();
    expect(screen.getByText('Data source: Uploaded file after flight')).toBeTruthy();
    expect(screen.getByText('Uploaded file after flight · clip_01.srt')).toBeTruthy();
    expect(screen.queryByText(/unavailable telemetry fields are not inferred/i)).toBeNull();
    expect(
      screen.queryByText('SRT records a video segment; it does not establish the full flight duration or milestones.'),
    ).toBeNull();
    expect(screen.getByText('Speed data not included in this log')).toBeTruthy();
    expect(screen.getByText('Battery data not included in this log')).toBeTruthy();
    expect(screen.getByText('No permit document details available')).toBeTruthy();
    expect(screen.getByTestId('trajectory-map').getAttribute('data-dimension')).toBe('3d');
    expect(screen.queryByText(/Verified MAVLink|Verified on-site permit|0m 00s|100%|GUIDED|LANDED|Takeoff/i)).toBeNull();
  });

  it('renders imported CSV with partial points and missing altitude without fabricating trajectory height or modes', async () => {
    mocks.report.mockResolvedValue({
      inspectionId: 'inspection-1',
      fieldSessionId: 'session-1',
      telemetrySource: 'IMPORTED_LOG_CSV',
      startedAt: null,
      endedAt: null,
      durationSeconds: null,
      distanceFlownMeters: null,
      maxAltitudeMeters: null,
      startBatteryPercent: null,
      endBatteryPercent: null,
      finalState: null,
      note: 'Imported flight log: partial.csv.',
      flightTrace: [
        {
          latitude: 21.0285,
          longitude: 105.8542,
          altitudeMeters: null,
          groundSpeedMps: 4.2,
          headingDeg: null,
          batteryPercent: null,
          flightMode: null,
          waypoint: 1,
          recordedAt: null,
        },
        {
          latitude: 21.0289,
          longitude: 105.8548,
          altitudeMeters: null,
          groundSpeedMps: null,
          headingDeg: null,
          batteryPercent: null,
          flightMode: null,
          waypoint: 2,
          recordedAt: '2026-11-10T01:00:05Z',
        },
      ],
    });

    renderReport();

    expect(await screen.findByText(/Imported flight log \(CSV\)/)).toBeTruthy();
    expect(screen.getByText('Altitude data not included in this log')).toBeTruthy();
    expect(screen.getByTestId('trajectory-map').getAttribute('data-dimension')).toBe('2d');
    expect(screen.queryByText(/0m 00s|100%|GUIDED|LANDED|Takeoff|Landing/i)).toBeNull();
  });

  it('renders live MAVLink telemetry with real badge and recorded sample table without synthetic defaults', async () => {
    mocks.report.mockResolvedValue({
      inspectionId: 'inspection-1',
      fieldSessionId: 'session-1',
      telemetrySource: 'MISSION_PLANNER_MAVLINK',
      startedAt: '2026-11-10T01:00:00Z',
      endedAt: '2026-11-10T01:05:00Z',
      durationSeconds: 300,
      distanceFlownMeters: 142.5,
      maxAltitudeMeters: 35.0,
      startBatteryPercent: 92,
      endBatteryPercent: 78,
      finalState: 'LANDED',
      note: 'Recorded from MAVLink stream.',
      flightTrace: [
        {
          latitude: 21.0285,
          longitude: 105.8542,
          altitudeMeters: 12.0,
          groundSpeedMps: 3.5,
          headingDeg: 90,
          batteryPercent: 92,
          flightMode: 'AUTO',
          waypoint: 1,
          recordedAt: '2026-11-10T01:00:00Z',
        },
        {
          latitude: 21.0288,
          longitude: 105.8546,
          altitudeMeters: 35.0,
          groundSpeedMps: 5.0,
          headingDeg: 95,
          batteryPercent: 85,
          flightMode: 'AUTO',
          waypoint: 2,
          recordedAt: '2026-11-10T01:02:30Z',
        },
        {
          latitude: 21.0285,
          longitude: 105.8542,
          altitudeMeters: 1.5,
          groundSpeedMps: 0.4,
          headingDeg: 90,
          batteryPercent: 78,
          flightMode: 'RTL',
          waypoint: 3,
          recordedAt: '2026-11-10T01:05:00Z',
        },
      ],
    });

    renderReport();

    expect(await screen.findByText(/MAVLink telemetry/)).toBeTruthy();
    expect(screen.getByText('Data source: Live stream during flight')).toBeTruthy();
    expect(screen.getByText('Reported state: LANDED')).toBeTruthy();
    expect(screen.getByText('Recorded telemetry samples & evidence geotags')).toBeTruthy();
    expect(screen.getByText('First recorded sample')).toBeTruthy();
    expect(screen.getByText('Maximum altitude recorded')).toBeTruthy();
    expect(screen.getByText('Last recorded sample')).toBeTruthy();
    expect(screen.queryByText(/Verified MAVLink/i)).toBeNull();
  });

  it('distinguishes simulation telemetry clearly with a Simulation badge', async () => {
    mocks.report.mockResolvedValue({
      inspectionId: 'inspection-1',
      fieldSessionId: 'session-1',
      telemetrySource: 'SMARTDRONEHUB_SIMULATION',
      startedAt: '2026-11-10T02:00:00Z',
      endedAt: '2026-11-10T02:04:00Z',
      durationSeconds: 240,
      distanceFlownMeters: 95.0,
      maxAltitudeMeters: 28.0,
      startBatteryPercent: 98,
      endBatteryPercent: 89,
      finalState: 'LANDED',
      note: 'Generated in SmartDroneHub simulation mode.',
      flightTrace: [
        {
          latitude: 21.0285,
          longitude: 105.8542,
          altitudeMeters: 28.0,
          groundSpeedMps: 4.0,
          headingDeg: 180,
          batteryPercent: 98,
          flightMode: 'GUIDED',
          waypoint: 1,
          recordedAt: '2026-11-10T02:00:00Z',
        },
      ],
    });

    renderReport();

    expect(await screen.findByText('Simulated flight telemetry')).toBeTruthy();
    expect(screen.getByText(/Simulation telemetry/)).toBeTruthy();
    expect(screen.getByText('Data source: Simulated telemetry')).toBeTruthy();
    expect(screen.queryByText(/Real telemetry|Real log|Verified MAVLink/i)).toBeNull();
  });

  it('extracts [WARN: First GPS point is X km ...] from imported log notes into a structured alert instead of a long raw field', async () => {
    mocks.report.mockResolvedValue({
      inspectionId: 'inspection-1',
      fieldSessionId: 'session-1',
      telemetrySource: 'IMPORTED_LOG_SRT',
      startedAt: '2026-11-15T08:30:00Z',
      endedAt: '2026-11-15T08:33:00Z',
      durationSeconds: 180,
      distanceFlownMeters: 240.7,
      maxAltitudeMeters: 64.5,
      startBatteryPercent: null,
      endBatteryPercent: null,
      finalState: 'UNKNOWN',
      note: 'Imported flight log: nvhsv-waypoint-mission.srt. Flight trace parsed from the uploaded SRT file; unavailable telemetry fields are not inferred. [WARN: First GPS point is 19.8 km from registered asset coordinates.]',
      flightTrace: [
        {
          latitude: 10.875,
          longitude: 106.8,
          altitudeMeters: 30.0,
          groundSpeedMps: null,
          headingDeg: null,
          batteryPercent: null,
          flightMode: null,
          waypoint: 1,
          recordedAt: '2026-11-15T08:30:00Z',
        },
      ],
    });

    renderReport();

    expect(await screen.findByText('Uploaded file after flight · nvhsv-waypoint-mission.srt')).toBeTruthy();
    expect(
      screen.queryByText('First recorded GPS point is 19.8 km from the registered asset coordinates.'),
    ).toBeNull();
    expect(screen.queryByText(/\[WARN:/i)).toBeNull();
  });

  it('filters uninitialized (0, 0) Null Island coordinates from trajectory map samples', async () => {
    mocks.report.mockResolvedValue({
      inspectionId: 'inspection-1',
      fieldSessionId: 'session-1',
      telemetrySource: 'MISSION_PLANNER_MAVLINK',
      startedAt: '2026-11-18T07:11:30Z',
      endedAt: '2026-11-18T07:48:48Z',
      durationSeconds: 2238,
      distanceFlownMeters: 313.8,
      maxAltitudeMeters: 30,
      startBatteryPercent: 100,
      endBatteryPercent: 38,
      finalState: 'IN_FLIGHT',
      note: 'Telemetry is live MAVLink data.',
      flightTrace: [
        {
          latitude: 0,
          longitude: 0,
          altitudeMeters: 23.35,
          groundSpeedMps: 0,
          headingDeg: 0,
          batteryPercent: null,
          flightMode: 'STABILIZE',
          waypoint: 0,
          recordedAt: '2026-11-18T07:11:30Z',
        },
        {
          latitude: 10.8755588,
          longitude: 106.8008852,
          altitudeMeters: 15,
          groundSpeedMps: 2,
          headingDeg: 90,
          batteryPercent: 90,
          flightMode: 'AUTO',
          waypoint: 1,
          recordedAt: '2026-11-18T07:11:38Z',
        },
        {
          latitude: 10.8756588,
          longitude: 106.8009852,
          altitudeMeters: 20,
          groundSpeedMps: 3,
          headingDeg: 95,
          batteryPercent: 88,
          flightMode: 'AUTO',
          waypoint: 2,
          recordedAt: '2026-11-18T07:11:45Z',
        },
      ],
    });

    renderReport();

    const map = await screen.findByTestId('trajectory-map');
    expect(map.getAttribute('data-count')).toBe('2');
  });
});

