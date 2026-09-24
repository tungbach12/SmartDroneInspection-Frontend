import axios from 'axios';

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
