import axios from 'axios';

/**
 * Reads the HTTP status out of a failed API call.
 *
 * The server is the authority on why a call failed: a 403 is a permissions decision, a 409 is a
 * business-rule conflict, and a 404 can be a deliberate concealment of another organization's
 * record. Clients classify the response, they never re-decide the rule.
 */
export function getProblemStatus(error: unknown): number | undefined {
  if (!axios.isAxiosError(error)) {
    return undefined;
  }

  return error.response?.status;
}

export function isPermissionDenied(error: unknown): boolean {
  return getProblemStatus(error) === 403;
}

export function isConflict(error: unknown): boolean {
  return getProblemStatus(error) === 409;
}
