import type { AxiosResponse } from 'axios';
import { describe, expect, it } from 'vitest';
import { unwrapApiResponse } from './apiResponse';

describe('unwrapApiResponse', () => {
  it('unwraps a successful API envelope while preserving the Axios response', () => {
    const response = {
      data: {
        success: true,
        message: 'Success',
        data: [{ id: 'inspection-1' }],
      },
      status: 200,
    } as AxiosResponse<unknown>;

    const result = unwrapApiResponse(response);

    expect(result.data).toEqual([{ id: 'inspection-1' }]);
    expect(result.status).toBe(200);
  });

  it('leaves Problem Details errors unchanged', () => {
    const problem = {
      type: 'about:blank',
      title: 'Forbidden',
      status: 403,
      code: 'ACCESS_DENIED',
    };
    const response = { data: problem, status: 403 } as AxiosResponse<unknown>;

    expect(unwrapApiResponse(response).data).toEqual(problem);
  });

  it('leaves unwrapped payloads unchanged for compatibility', () => {
    const payload = { id: 'inspection-1' };
    const response = { data: payload, status: 200 } as AxiosResponse<unknown>;

    expect(unwrapApiResponse(response).data).toBe(payload);
  });
});
