/**
 * Tracks whether advisory detection has already made its automatic pass for an inspection.
 *
 * MF3-05 starts detection once the Inspector accepts the evidence set. That offer must not repeat
 * for the rest of the working session: reopening Findings returns the inspection to FIELD_COMPLETED,
 * which would otherwise re-arm the automatic run and silently start the model in the middle of a
 * review. The Inspector can still analyse any image from the Analyze action.
 *
 * <p>The flag lives in session storage because this stage is a tab route: every visit remounts the
 * page, so component state cannot remember the earlier pass. It is keyed by user and inspection so
 * one Inspector's pass never suppresses another's, and it is scoped to the tab, so a later session
 * can offer detection again. No credential or access token is stored here (FE-18).
 */
const storageKey = (userId: string, inspectionId: string): string =>
  `sdi_auto_detection:${userId}:${inspectionId}`;

export function hasAutoDetectionRun(userId: string, inspectionId: string): boolean {
  try {
    return window.sessionStorage.getItem(storageKey(userId, inspectionId)) !== null;
  } catch {
    // A browser that refuses storage still gets the page; detection simply offers itself again.
    return false;
  }
}

export function markAutoDetectionRun(userId: string, inspectionId: string): void {
  try {
    window.sessionStorage.setItem(storageKey(userId, inspectionId), 'done');
  } catch {
    // Non-fatal: the automatic pass repeats rather than failing the Inspector's work.
  }
}