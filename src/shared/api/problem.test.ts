import { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';
import { getProblemStatus, isConflict, isPermissionDenied } from './problem';

function problem(status: number, code: string): AxiosError {
  return new AxiosError(
    `Request failed with status code ${status}`,
    'ERR_BAD_RESPONSE',
    undefined,
    undefined,
    {
      data: { type: 'about:blank', title: 'Error', status, detail: 'x', code },
      status,
      statusText: 'Error',
      headers: {},
      config: { headers: {} } as never,
    },
  );
}

describe('problem status decoding', () => {
  it('classifies a 403 as a permissions denial', () => {
    expect(isPermissionDenied(problem(403, 'FORBIDDEN'))).toBe(true);
    expect(isConflict(problem(403, 'FORBIDDEN'))).toBe(false);
  });

  it('classifies a 409 as a business-rule conflict', () => {
    expect(isConflict(problem(409, 'INVALID_STATE'))).toBe(true);
    expect(isPermissionDenied(problem(409, 'INVALID_STATE'))).toBe(false);
  });

  it('does not classify a 404 as a denial or a conflict', () => {
    expect(getProblemStatus(problem(404, 'NOT_FOUND'))).toBe(404);
    expect(isPermissionDenied(problem(404, 'NOT_FOUND'))).toBe(false);
    expect(isConflict(problem(404, 'NOT_FOUND'))).toBe(false);
  });

  it('returns undefined for a non-axios failure', () => {
    expect(getProblemStatus(new Error('network down'))).toBeUndefined();
    expect(isPermissionDenied(undefined)).toBe(false);
  });
});
