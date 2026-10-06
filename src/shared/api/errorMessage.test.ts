import { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';
import { decodeBlobProblemBody, getErrorMessage } from './errorMessage';

const FORBIDDEN_PROBLEM = {
  type: 'about:blank',
  title: 'Forbidden',
  status: 403,
  detail: 'No organization scope',
  code: 'FORBIDDEN',
};

function errorWithBody(status: number, data: unknown): AxiosError {
  return new AxiosError(
    `Request failed with status code ${status}`,
    'ERR_BAD_RESPONSE',
    undefined,
    undefined,
    {
      data,
      status,
      statusText: 'Error',
      headers: {},
      config: { headers: {} } as never,
    },
  );
}

function blobProblemError(status: number, body: unknown): AxiosError {
  return errorWithBody(
    status,
    new Blob([JSON.stringify(body)], { type: 'application/problem+json' }),
  );
}

describe('decodeBlobProblemBody', () => {
  it('parses a blob problem body so the server detail reaches the message', async () => {
    const error = blobProblemError(403, FORBIDDEN_PROBLEM);

    await decodeBlobProblemBody(error);

    expect(getErrorMessage(error, 'Permission required.')).toBe('No organization scope');
  });

  it('leaves an already parsed problem body as the same object, not a re-encoded one', async () => {
    const parsed = { ...FORBIDDEN_PROBLEM };
    const error = errorWithBody(403, parsed);

    await decodeBlobProblemBody(error);

    expect(error.response?.data).toBe(parsed);
  });

  it('leaves a blob that is not a problem document untouched', async () => {
    const html = new Blob(['<html><body>502 Bad Gateway</body></html>'], { type: 'text/html' });
    const error = errorWithBody(502, html);

    await decodeBlobProblemBody(error);

    expect(error.response?.data).toBe(html);
    expect(getErrorMessage(error, 'Could not open the document.')).toBe(
      'Request failed with status code 502',
    );
  });

  it('does nothing for a failure that did not come from the API client', async () => {
    const error = new Error('network down');

    await expect(decodeBlobProblemBody(error)).resolves.toBeUndefined();
    expect(error.message).toBe('network down');
  });
});

describe('getErrorMessage', () => {
  it('reads the problem detail from a parsed body without touching it', () => {
    expect(getErrorMessage(errorWithBody(409, FORBIDDEN_PROBLEM), 'fallback')).toBe(
      'No organization scope',
    );
  });

  it('falls back to the transport message when the body carries no problem fields', () => {
    expect(getErrorMessage(errorWithBody(403, new Blob(['not json'])), 'fallback')).toBe(
      'Request failed with status code 403',
    );
  });

  it('falls back to the supplied message when there is no error at all', () => {
    expect(getErrorMessage(undefined, 'Nothing to report.')).toBe('Nothing to report.');
  });
});
