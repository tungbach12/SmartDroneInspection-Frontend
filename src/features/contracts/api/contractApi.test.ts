import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/shared/api/client';
import { contractApi } from './contractApi';

vi.mock('@/shared/api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

describe('contractApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists service requests using the contracts endpoint', async () => {
    const requests = [{ id: 'req-1' }];
    vi.mocked(api.get).mockResolvedValue({ data: requests } as never);

    await expect(contractApi.listRequests()).resolves.toBe(requests);
    expect(api.get).toHaveBeenCalledWith('/contracts/requests');
  });

  it('saves a quote via PUT /contracts/requests/:requestId/quote', async () => {
    const input = {
      scopeSnapshot: 'Scope',
      firstOccurrenceStartAt: '2027-02-01T09:00:00Z',
      firstOccurrenceEndAt: '2027-02-01T10:00:00Z',
      inspectorId: 'insp-1',
      droneId: 'drone-1',
      pricePerOccurrenceVnd: 12000000,
    };
    const response = { data: { id: 'req-1' } };
    vi.mocked(api.put).mockResolvedValue(response as never);

    await expect(contractApi.saveQuote('req-1', input)).resolves.toBe(response.data);
    expect(api.put).toHaveBeenCalledWith('/contracts/requests/req-1/quote', input);
  });

  it('accepts the current quote by providing its rowVersion in the request body', async () => {
    const response = { data: { id: 'req-1', acceptedQuoteId: 'q-1' } };
    vi.mocked(api.post).mockResolvedValue(response as never);

    await expect(contractApi.acceptQuote('req-1', 4)).resolves.toBe(response.data);
    expect(api.post).toHaveBeenCalledWith('/contracts/requests/req-1/accept', {
      quoteRowVersion: 4,
    });
  });

  it('filters partner drone data with its inspector owner id', async () => {
    const drones = [{ id: 'drone-1', inspectorOwnerId: 'inspector-1', serialNumber: 'SDI-001', model: 'M350' }];
    vi.mocked(api.get).mockResolvedValue({ data: drones } as never);

    const result = await contractApi.listPartnerDrones();

    expect(result[0]?.inspectorOwnerId).toBe('inspector-1');
    expect(api.get).toHaveBeenCalledWith('/contracts/partners/drones');
  });

  it('downloads the signed-contract attachment as a Blob', async () => {
    const attachment = new Blob(['signed'], { type: 'application/pdf' });
    vi.mocked(api.get).mockResolvedValue({ data: attachment } as never);

    await expect(contractApi.downloadSignedContract('req-1')).resolves.toBe(attachment);
    expect(api.get).toHaveBeenCalledWith('/contracts/requests/req-1/signed-contract', {
      responseType: 'blob',
    });
  });

  it('uploads signed contract as the file multipart field', async () => {
    const file = new File(['signed'], 'signed.pdf', { type: 'application/pdf' });
    vi.mocked(api.post).mockResolvedValue({ data: { id: 'req-1' } } as never);

    await contractApi.uploadSignedContract('req-1', file);

    const [, formData] = vi.mocked(api.post).mock.calls[0] ?? [];
    expect(formData).toBeInstanceOf(FormData);
    expect((formData as FormData).get('file')).toBe(file);
    expect(api.post).toHaveBeenCalledWith('/contracts/requests/req-1/signed-contract', formData);
  });
});
