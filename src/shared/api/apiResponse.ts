import type { AxiosResponse } from 'axios';

export interface ApiResponseEnvelope<T> {
  success: true;
  message: string;
  data: T;
}

function isApiResponseEnvelope(value: unknown): value is ApiResponseEnvelope<unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const envelope = value as Record<string, unknown>;
  return (
    envelope.success === true &&
    typeof envelope.message === 'string' &&
    'data' in envelope
  );
}

export function unwrapApiResponse<T>(
  response: AxiosResponse<T | ApiResponseEnvelope<T>>,
): AxiosResponse<T> {
  if (isApiResponseEnvelope(response.data)) {
    return { ...response, data: response.data.data } as AxiosResponse<T>;
  }

  return response as AxiosResponse<T>;
}
