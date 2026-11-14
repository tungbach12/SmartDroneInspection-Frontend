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
      requiredDroneFeatureCodes: ['THERMAL_CAMERA'],
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

  it('loads the active partner capability catalog from the API', async () => {
    const options = [
      {
        code: 'THERMAL_CAMERA',
        nameVi: 'Camera nhiệt',
        nameEn: 'Thermal Camera',
        displayOrder: 1,
        isActive: true,
        category: 'CAPABILITY',
      },
      { code: 'LEGACY', nameVi: 'Cũ', nameEn: 'Legacy', displayOrder: 9, isActive: false, category: 'CAPABILITY' },
    ];
    vi.mocked(api.get).mockResolvedValue({ data: options } as never);

    await expect(contractApi.listPartnerCapabilities()).resolves.toEqual([options[0]]);
    expect(api.get).toHaveBeenCalledWith('/contracts/requests/partner-capabilities');
  });

  it('evaluates partner candidates for a service request schedule and capability list', async () => {
    const input = {
      plannedStartAt: '2026-12-04T01:00:00Z',
      plannedEndAt: '2026-12-04T03:00:00Z',
      requiredDroneFeatureCodes: ['THERMAL_CAMERA'],
    };
    const candidates = [{ inspectorId: 'insp-1', droneId: 'drone-1', droneFeatureCodes: ['THERMAL_CAMERA'], eligibility: 'PASS', capabilityFit: 'MATCH' }];
    vi.mocked(api.post).mockResolvedValue({ data: candidates } as never);

    await expect(contractApi.evaluatePartnerCandidates('req-1', input)).resolves.toBe(candidates);
    expect(api.post).toHaveBeenCalledWith('/contracts/requests/req-1/partner-candidates', input);
  });
});
