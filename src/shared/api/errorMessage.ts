import axios from 'axios';

/**
 * The fields a Problem Details body carries that are worth showing to a user.
 *
 * A body is only treated as a problem document if it actually carries one of these as a string;
 * an opaque payload that merely happens to parse as JSON (an empty object, for instance) is left
 * alone so the transport message is used instead of a fabricated one.
 */
const PROBLEM_FIELDS = ['detail', 'title', 'code'] as const;

function isProblemDocument(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const body = value as Record<string, unknown>;
  return PROBLEM_FIELDS.some((field) => typeof body[field] === 'string');
}

/**
 * Reads an error body that is still raw bytes into text.
 *
 * A download requests `responseType: 'blob'`, so axios hands back whatever the transport can
 * hold: a Blob in the browser, a Buffer under the node adapter. Anything already parsed (the
 * ordinary JSON path) yields undefined and is therefore never touched.
 */
async function readOpaqueBody(body: unknown): Promise<string | undefined> {
  if (typeof Blob !== 'undefined' && body instanceof Blob) {
    return body.text();
  }
  if (body instanceof ArrayBuffer) {
    return new TextDecoder().decode(body);
  }
  if (ArrayBuffer.isView(body)) {
    return new TextDecoder().decode(
      new Uint8Array(body.buffer, body.byteOffset, body.byteLength),
    );
  }
  if (typeof body === 'string') {
    return body;
  }
  return undefined;
}

/**
 * Decodes a failed blob download's body so the shared message helper can read it.
 *
 * `getErrorMessage` reads a parsed problem document, so on a blob response every field lookup
 * misses and the server's own reason is replaced by "Request failed with status code 403". This
 * decodes the body in place, in the shared rejection path, so every caller — and every screen
 * that depends on this helper — keeps the server's detail without a second error path.
 */
export async function decodeBlobProblemBody(error: unknown): Promise<void> {
  if (!axios.isAxiosError(error) || !error.response) {
    return;
  }

  const response = error.response;
  if (isProblemDocument(response.data)) {
    return;
  }

  const text = await readOpaqueBody(response.data);
  if (text === undefined) {
    return;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    // A proxy HTML page or an empty body is not a problem document; keep the transport message.
    return;
  }

  if (isProblemDocument(parsed)) {
    response.data = parsed;
  }
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as
      | { detail?: unknown; title?: unknown; code?: unknown }
      | undefined;
    if (typeof body?.detail === 'string') return body.detail;
    if (typeof body?.title === 'string') return body.title;
    if (typeof body?.code === 'string') return body.code;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}
