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
    expect(screen.getByText('Real log · Imported flight log (SRT)')).toBeTruthy();
    expect(
      screen.getByText('SRT records a video segment; it does not establish the full flight duration or milestones.'),
    ).toBeTruthy();
    expect(screen.getByText('Duration unavailable in this source')).toBeTruthy();
    expect(screen.getAllByText('Speed data not included in this log').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Battery data not included in this log').length).toBeGreaterThanOrEqual(2);
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

    expect(await screen.findByText('Real log · Imported flight log (CSV)')).toBeTruthy();
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

    expect(await screen.findByText('Real telemetry · MAVLink telemetry')).toBeTruthy();
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
    expect(screen.getByText('Simulation · Simulation telemetry')).toBeTruthy();
    expect(screen.queryByText(/Real telemetry|Real log|Verified MAVLink/i)).toBeNull();
  });
});

