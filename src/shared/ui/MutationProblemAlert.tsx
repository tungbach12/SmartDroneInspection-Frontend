import { Alert } from '@mui/material';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { isPermissionDenied } from '@/shared/api/problem';

interface MutationProblemAlertProps {
  /** The rejected mutation, or its error. */
  error: unknown;
  isError: boolean;
  fallbackMessage: string;
}

/**
 * Renders a failed mutation, distinguishing a permissions denial from a generic failure.
 *
 * A 403 is an expected outcome of a re-authorized review, not a fault to report as an error, so it
 * is shown as a warning that says the caller may not perform the action. The server still decides
 * whether the action is allowed; this only labels the answer it already gave.
 */
export function MutationProblemAlert({
  error,
  isError,
  fallbackMessage,
}: MutationProblemAlertProps) {
  if (!isError) {
    return null;
  }

  if (isPermissionDenied(error)) {
    return (
      <Alert severity="warning" data-testid="permission-denied">
        <strong>Permission required</strong> — {getErrorMessage(error, fallbackMessage)}
      </Alert>
    );
  }

  return <Alert severity="error">{getErrorMessage(error, fallbackMessage)}</Alert>;
}

interface RefusalNoticeProps {
  /** The server's own reason, when it sent one. */
  reason?: string;
  /** Only used when the server sent no readable reason at all. */
  fallbackMessage: string;
  testId?: string;
}

/**
 * Renders a refusal the server described, without adding a claim the server did not make.
 *
 * A 409 is a business rule refusing, not a fault, so it reads as a warning. Crucially it carries no
 * client-invented heading: the same status covers several different rules (one active schedule per
 * asset, a schedule that is not active, an inactive asset or checklist), and the client cannot tell
 * them apart. Naming the wrong one produces advice that contradicts the reason shown next to it, so
 * the server's own wording stands alone unless nothing readable arrived.
 */
export function RefusalNotice({ reason, fallbackMessage, testId }: RefusalNoticeProps) {
  return (
    <Alert severity="warning" data-testid={testId ?? 'refusal'}>
      {reason ?? fallbackMessage}
    </Alert>
  );
}
