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
  ) =>
    api
      .post<SmartDroneHubTelemetry>(
        `/inspections/${inspectionId}/field-sessions/${sessionId}/drone-hub/start`,
        undefined,
        { params: { telemetrySource } },
      )
      .then((response) => response.data),
  telemetry: (inspectionId: string, sessionId: string) =>
    api
      .get<SmartDroneHubTelemetry>(
        `/inspections/${inspectionId}/field-sessions/${sessionId}/drone-hub/telemetry`,
      )
      .then((response) => response.data),
  importFlightLog: (inspectionId: string, sessionId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<SmartDroneHubFlightReport>(
      `/inspections/${inspectionId}/field-sessions/${sessionId}/drone-hub/import-log`,
      form,
    ).then((response) => response.data);
  },
  declareManualFlight: (
    inspectionId: string,
    sessionId: string,
    payload: { reasonCode: string; estimatedDurationMinutes: number; maxAltitudeMeters?: number | null; notes: string },
  ) => api.post<SmartDroneHubFlightReport>(
    `/inspections/${inspectionId}/field-sessions/${sessionId}/drone-hub/manual-declaration`,
    payload,
  ).then((response) => response.data),
  flightReport: (inspectionId: string, sessionId: string) =>
    api.get<SmartDroneHubFlightReport>(
      `/inspections/${inspectionId}/field-sessions/${sessionId}/drone-hub/flight-report`,
    ).then((response) => response.data),
  syncVideo: (inspectionId: string, sessionId: string) =>
    api
      .post<EvidenceItem>(
        `/inspections/${inspectionId}/field-sessions/${sessionId}/drone-hub/sync-video`,
      )
      .then((response) => response.data),
  captureFrame: (inspectionId: string, sessionId: string) =>
    api
      .post<EvidenceItem>(
        `/inspections/${inspectionId}/field-sessions/${sessionId}/drone-hub/capture`,
      )
      .then((response) => response.data),
};
