import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/shared/api/client';
import { contractApi } from './contractApi';

vi.mock('@/shared/api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
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

  it('accepts the requested quote version as a query parameter', async () => {
    const response = { data: { id: 'req-1', acceptedQuoteVersion: 3 } };
    vi.mocked(api.post).mockResolvedValue(response as never);

    await expect(contractApi.acceptQuote('req-1', 3)).resolves.toBe(response.data);
    expect(api.post).toHaveBeenCalledWith('/contracts/requests/req-1/accept', undefined, {
      params: { versionNo: 3 },
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

  it('posts refund initiation before external transfer and keeps its own request reference', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { id: 'req-1' } } as never);
    const input = {
      amount: 250,
      requestReference: 'REF-REQ-1',
      reason: 'Service cancelled',
      inspectorReceivableAmount: 0,
      platformAbsorbedAmount: 0,
    };

    await contractApi.initiateOccurrenceRefund('req-1', 'occ-1', input);

    expect(api.post).toHaveBeenCalledWith(
      '/contracts/requests/req-1/occurrences/occ-1/refunds',
      input,
    );
  });

  it('completes an initiated refund by its ID with external transfer evidence', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { id: 'req-1' } } as never);
    const input = {
      inspectorPayoutReduction: 100,
      platformCommissionAdjustment: 20,
      vatAdjustment: 10,
      tncnAdjustment: 5,
      platformAbsorbedAmount: 15,
      externalReference: 'BANK-REF-1',
    };

    await contractApi.completeOccurrenceRefund('req-1', 'occ-1', 'refund-1', input);

    expect(api.post).toHaveBeenCalledWith(
      '/contracts/requests/req-1/occurrences/occ-1/refunds/refund-1/complete',
      input,
    );
  });

  it('reconciles one legacy refund and records a receivable recovery by ledger ID', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { id: 'req-1' } } as never);
    const allocation = {
      inspectorReceivableAmount: 75,
      platformAbsorbedPlanAmount: 25,
      inspectorPayoutReduction: 75,
      platformCommissionAdjustment: 0,
      vatAdjustment: 0,
      tncnAdjustment: 0,
      platformAbsorbedAmount: 25,
      reconciliationReference: 'LEGACY-DOC-1',
      note: 'Matched to bank statement',
    };
    await contractApi.reconcileRefundAllocation('req-1', 'occ-1', 'refund-1', allocation);
    expect(api.post).toHaveBeenCalledWith(
      '/contracts/requests/req-1/occurrences/occ-1/refunds/refund-1/reconcile-allocation',
      allocation,
    );

    const recovery = { amount: 10, externalReference: 'RECOVERY-1', note: 'Manual collection' };
    await contractApi.recordReceivableRecovery('req-1', 'occ-1', 'receivable-1', recovery);
    expect(api.post).toHaveBeenLastCalledWith(
      '/contracts/requests/req-1/occurrences/occ-1/receivables/receivable-1/recover',
      recovery,
    );
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
