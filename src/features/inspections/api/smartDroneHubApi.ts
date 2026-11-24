import { api } from '@/shared/api/client';
import type { EvidenceItem } from './inspectionApi';

export type SmartDroneHubMissionState =
  | 'READY'
  | 'IN_FLIGHT'
  | 'RETURNING'
  | 'LANDED'
  | 'ABORTED'
  | 'NO_FLIGHT'
  | 'UNKNOWN';
export type SmartDroneHubSource =
  | 'MISSION_PLANNER_MAVLINK'
  | 'SMARTDRONEHUB_SIMULATION'
  | 'NONE'
  | 'IMPORTED_LOG_SRT'
  | 'IMPORTED_LOG_CSV'
  | 'IMPORTED_LOG_KML'
  | 'IMPORTED_LOG_GPX'
  | 'MANUAL_DECLARATION';

export interface SmartDroneHubFlightTracePoint {
  latitude: number;
  longitude: number;
  altitudeMeters: number | null;
  groundSpeedMps: number | null;
  headingDeg: number | null;
  batteryPercent?: number | null;
  flightMode?: string | null;
  waypoint: number | null;
  recordedAt: string | null;
}

export interface SmartDroneHubTelemetry {
  inspectionId: string;
  fieldSessionId: string;
  missionState: SmartDroneHubMissionState;
  telemetrySource: SmartDroneHubSource;
  connected: boolean;
  lastUpdateAt: string | null;
  latitude: number | null;
  longitude: number | null;
  altitudeMeters: number | null;
  groundSpeedMps: number | null;
  headingDeg: number | null;
  batteryPercent: number | null;
  flightMode: string | null;
  armed: boolean | null;
  currentWaypoint: number | null;
  distanceFlownMeters: number;
}

export interface SmartDroneHubFlightReport {
  inspectionId: string;
  fieldSessionId: string;
  telemetrySource: SmartDroneHubSource;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  distanceFlownMeters: number | null;
  maxAltitudeMeters: number | null;
  startBatteryPercent: number | null;
  endBatteryPercent: number | null;
  finalState: SmartDroneHubMissionState;
  note: string;
  flightTrace?: SmartDroneHubFlightTracePoint[];
  flightVideoEvidenceId?: string | null;
}

export const smartDroneHubApi = {
  start: (
    inspectionId: string,
    sessionId: string,
    telemetrySource: 'AUTO' | 'MAVLINK' | 'SIMULATION' = 'AUTO',
    flightId?: string,
  ) =>
    api
      .post<SmartDroneHubTelemetry>(
        `/inspections/${inspectionId}/field-sessions/${sessionId}/drone-hub/start`,
        undefined,
        { params: { telemetrySource, ...(flightId ? { flightId } : {}) } },
      )
      .then((response) => response.data),
  complete: (inspectionId: string, sessionId: string, flightId?: string) =>
    api
      .post<SmartDroneHubFlightReport>(
        `/inspections/${inspectionId}/field-sessions/${sessionId}/drone-hub/complete`,
        undefined,
        flightId ? { params: { flightId } } : undefined,
      )
      .then((response) => response.data),
  telemetry: (inspectionId: string, sessionId: string, flightId?: string) =>
    api
      .get<SmartDroneHubTelemetry>(
        `/inspections/${inspectionId}/field-sessions/${sessionId}/drone-hub/telemetry`,
        flightId ? { params: { flightId } } : undefined,
      )
      .then((response) => response.data),
  importFlightLog: (
    inspectionId: string,
    sessionId: string,
    file: File,
    options?: { flightId?: string; flightDate?: string; flightLabel?: string },
  ) => {
    const form = new FormData();
    form.append('file', file);
    const params: Record<string, string> = {};
    if (options?.flightId) params.flightId = options.flightId;
    if (options?.flightDate) params.flightDate = options.flightDate;
    if (options?.flightLabel) params.flightLabel = options.flightLabel;
    return api
      .post<SmartDroneHubFlightReport>(
        `/inspections/${inspectionId}/field-sessions/${sessionId}/drone-hub/import-log`,
        form,
        Object.keys(params).length > 0 ? { params } : undefined,
      )
      .then((response) => response.data);
  },
  declareManualFlight: (
    inspectionId: string,
    sessionId: string,
    payload: {
      reasonCode: string;
      estimatedDurationMinutes: number;
      maxAltitudeMeters?: number | null;
      notes: string;
      flightDate?: string | null;
      flightLabel?: string | null;
    },
    flightId?: string,
  ) =>
    api
      .post<SmartDroneHubFlightReport>(
        `/inspections/${inspectionId}/field-sessions/${sessionId}/drone-hub/manual-declaration`,
        payload,
        flightId ? { params: { flightId } } : undefined,
      )
      .then((response) => response.data),
  flightReport: (inspectionId: string, sessionId: string, flightId?: string) =>
    api
      .get<SmartDroneHubFlightReport>(
        `/inspections/${inspectionId}/field-sessions/${sessionId}/drone-hub/flight-report`,
        flightId ? { params: { flightId } } : undefined,
      )
      .then((response) => response.data),
  syncVideo: (inspectionId: string, sessionId: string, flightId?: string) =>
    api
      .post<EvidenceItem>(
        `/inspections/${inspectionId}/field-sessions/${sessionId}/drone-hub/sync-video`,
        undefined,
        flightId ? { params: { flightId } } : undefined,
      )
      .then((response) => response.data),
  captureFrame: (inspectionId: string, sessionId: string) =>
    api
      .post<EvidenceItem>(
        `/inspections/${inspectionId}/field-sessions/${sessionId}/drone-hub/capture`,
      )
      .then((response) => response.data),
};
