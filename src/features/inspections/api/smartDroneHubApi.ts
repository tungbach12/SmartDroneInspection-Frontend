import { api } from '@/shared/api/client';
import type { EvidenceItem } from './inspectionApi';

export type SmartDroneHubMissionState =
  | 'READY'
  | 'IN_FLIGHT'
  | 'RETURNING'
  | 'LANDED'
  | 'ABORTED'
  | 'NO_FLIGHT';
export type SmartDroneHubSource =
  | 'MISSION_PLANNER_MAVLINK'
  | 'SMARTDRONEHUB_SIMULATION'
  | 'NONE';

export interface SmartDroneHubFlightTracePoint {
  latitude: number;
  longitude: number;
  altitudeMeters: number | null;
  groundSpeedMps: number | null;
  headingDeg: number | null;
  batteryPercent?: number | null;
  flightMode?: string | null;
  waypoint: number | null;
  recordedAt: string;
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
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  distanceFlownMeters: number;
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
