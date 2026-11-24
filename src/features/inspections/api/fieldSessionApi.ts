import { api } from '@/shared/api/client';

/**
 * MF2-09 to MF2-12: the Inspector's on-site field-session record and per-flight sorties.
 */

export type FieldSessionStatus =
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'FIELD_COMPLETED'
  | 'POSTPONED'
  | 'ABORTED';

export interface ChecklistItemSnapshot {
  code: string;
  category: string;
  label: string;
  details: string | null;
  referenceThreshold: string | null;
  safetyCritical: boolean;
  required: boolean;
  checked: boolean;
}

export interface PreFlightConditions {
  windSpeedMs?: number | null;
  ambientTempC?: number | null;
  visibilityKm?: number | null;
  minBatteryPercent?: number | null;
  gpsSatellites?: number | null;
  rthAltitudeMeters?: number | null;
  safetyPerimeterMeters?: number | null;
  weatherSummary?: string | null;
}

export interface FieldSessionFlight {
  id: string;
  fieldSessionId: string;
  inspectionId: string;
  flightNumber: number;
  flightDate: string;
  flightLabel: string | null;
  telemetrySource: string | null;
  startedAt: string | null;
  endedAt: string | null;
  flightDurationSeconds: number | null;
  distanceFlownMeters: number | null;
  maxAltitudeMeters: number | null;
  startBatteryPercent: number | null;
  endBatteryPercent: number | null;
  flightFinalState: string | null;
  flightReportNote: string | null;
  flightVideoEvidenceId: string | null;
  hasFlightReport: boolean;
}

export interface FieldSession {
  id: string;
  inspectionId: string;
  status: FieldSessionStatus;
  preFlightChecklistNote: string | null;
  startedAt: string | null;
  endedAt: string | null;
  postponementReason: string | null;
  abortReason: string | null;
  outcomeNotes: string | null;
  flightVideoEvidenceId?: string | null;
  telemetrySource?: string | null;
  hasFlightReport?: boolean;
  sessionDate?: string | null;
  preFlightChecklistSnapshot?: ChecklistItemSnapshot[];
  preFlightConditions?: PreFlightConditions | null;
  postFlightChecklistSnapshot?: ChecklistItemSnapshot[];
  flights?: FieldSessionFlight[];
}

export interface StartFieldSessionPayload {
  preFlightChecklistNote: string;
  startNow?: boolean;
  sessionDate?: string | null;
  preFlightChecklistSnapshot?: ChecklistItemSnapshot[];
  preFlightConditions?: PreFlightConditions | null;
}

export interface CompleteFieldSessionPayload {
  outcomeNotes: string;
  postFlightChecklistSnapshot?: ChecklistItemSnapshot[];
}

export const fieldSessionKeys = {
  all: ['field-sessions'] as const,
  forInspection: (inspectionId: string) =>
    [...fieldSessionKeys.all, 'inspection', inspectionId] as const,
  flightsForInspection: (inspectionId: string) =>
    [...fieldSessionKeys.all, 'flights', inspectionId] as const,
};

export const fieldSessionApi = {
  list: (inspectionId: string) =>
    api
      .get<FieldSession[]>(`/inspections/${inspectionId}/field-sessions`)
      .then((r) => r.data),

  listAllFlights: (inspectionId: string) =>
    api
      .get<FieldSessionFlight[]>(`/inspections/${inspectionId}/flights`)
      .then((r) => r.data),

  listSessionFlights: (inspectionId: string, sessionId: string) =>
    api
      .get<FieldSessionFlight[]>(
        `/inspections/${inspectionId}/field-sessions/${sessionId}/flights`,
      )
      .then((r) => r.data),

  createFlight: (
    inspectionId: string,
    sessionId: string,
    payload?: { flightLabel?: string | null; flightDate?: string | null },
  ) =>
    api
      .post<FieldSessionFlight>(
        `/inspections/${inspectionId}/field-sessions/${sessionId}/flights`,
        payload ?? {},
      )
      .then((r) => r.data),

  deleteFlight: (inspectionId: string, sessionId: string, flightId: string) =>
    api
      .delete(
        `/inspections/${inspectionId}/field-sessions/${sessionId}/flights/${flightId}`,
      )
      .then(() => undefined),

  /**
   * MF2-10: record completed pre-flight safety verification & start onsite field session.
   */
  start: (
    inspectionId: string,
    preFlightChecklistNoteOrPayload: string | StartFieldSessionPayload,
    startNow?: boolean,
  ) => {
    const body: StartFieldSessionPayload =
      typeof preFlightChecklistNoteOrPayload === 'string'
        ? {
            preFlightChecklistNote: preFlightChecklistNoteOrPayload,
            ...(startNow ? { startNow: true } : {}),
          }
        : preFlightChecklistNoteOrPayload;
    return api
      .post<FieldSession>(`/inspections/${inspectionId}/field-sessions`, body)
      .then((r) => r.data);
  },

  /** MF2-12: finish the field session and move the inspection into FIELD_COMPLETED. */
  complete: (
    inspectionId: string,
    sessionId: string,
    outcomeNotesOrPayload: string | CompleteFieldSessionPayload,
  ) => {
    const body: CompleteFieldSessionPayload =
      typeof outcomeNotesOrPayload === 'string'
        ? { outcomeNotes: outcomeNotesOrPayload }
        : outcomeNotesOrPayload;
    return api
      .post<FieldSession>(
        `/inspections/${inspectionId}/field-sessions/${sessionId}/completion`,
        body,
      )
      .then((r) => r.data);
  },

  /** MF2-11: abort the open session with recorded reason. */
  abort: (inspectionId: string, sessionId: string, reason: string) =>
    api
      .post<FieldSession>(
        `/inspections/${inspectionId}/field-sessions/${sessionId}/abort`,
        { reason },
      )
      .then((r) => r.data),

  /** Manager/Admin recovery: force-aborts a hung IN_PROGRESS session so dispatch can recover. */
  forceAbort: (inspectionId: string, sessionId: string, reason: string) =>
    api
      .post<FieldSession>(
        `/inspections/${inspectionId}/field-sessions/${sessionId}/force-abort`,
        { reason },
      )
      .then((r) => r.data),
};
