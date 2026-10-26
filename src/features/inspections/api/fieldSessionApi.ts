import { api } from '@/shared/api/client';

/**
 * MF2-09 to MF2-12: the Inspector's own field-session record.
 *
 * A session is the software's record that the Inspector started working on site after the
 * pre-flight checklist was in order. It is not hardware flight time, and nothing here arms an
 * aircraft. The startedAt instant is the software's session start.
 */

export type FieldSessionStatus =
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'FIELD_COMPLETED'
  | 'POSTPONED'
  | 'ABORTED';

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
}

export const fieldSessionKeys = {
  all: ['field-sessions'] as const,
  forInspection: (inspectionId: string) =>
    [...fieldSessionKeys.all, 'inspection', inspectionId] as const,
};

export const fieldSessionApi = {
  list: (inspectionId: string) =>
    api
      .get<FieldSession[]>(`/inspections/${inspectionId}/field-sessions`)
      .then((r) => r.data),

  /**
   * MF2-10. The pre-flight note is the Inspector's own record that MF2-09's checklist was
   * completed on site, so it is prose the Inspector writes rather than a flag the client sets.
   */
  start: (inspectionId: string, preFlightChecklistNote: string) =>
    api
      .post<FieldSession>(`/inspections/${inspectionId}/field-sessions`, {
        preFlightChecklistNote,
      })
      .then((r) => r.data),

  /** MF2-12: the on-site session finished and moves the inspection into FIELD_COMPLETED. */
  complete: (inspectionId: string, sessionId: string, outcomeNotes: string) =>
    api
      .post<FieldSession>(
        `/inspections/${inspectionId}/field-sessions/${sessionId}/completion`,
        { outcomeNotes },
      )
      .then((r) => r.data),

  /** MF2-09: weather or site safety stopped the session; the inspection stays startable. */
  postpone: (inspectionId: string, sessionId: string, reason: string) =>
    api
      .post<FieldSession>(
        `/inspections/${inspectionId}/field-sessions/${sessionId}/postponement`,
        { reason },
      )
      .then((r) => r.data),

  /** MF2-11: the session cannot continue and will not resume under this record. */
  abort: (inspectionId: string, sessionId: string, reason: string) =>
    api
      .post<FieldSession>(
        `/inspections/${inspectionId}/field-sessions/${sessionId}/abort`,
        { reason },
      )
      .then((r) => r.data),
};
