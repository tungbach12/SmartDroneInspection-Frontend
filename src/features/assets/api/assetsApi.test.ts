import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import { api } from '@/shared/api/client';
import { assetApi } from './assetApi';
import { catalogApi } from './catalogApi';
import { proposalApi } from './proposalApi';
import { documentApi } from './documentApi';
import { droneApi } from './droneApi';

describe('assetApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists assets and returns the paged payload', async () => {
    const page = {
      items: [],
      page: 1,
      pageSize: 20,
      totalCount: 0,
      totalPages: 0,
    };
    vi.mocked(api.get).mockResolvedValue({ data: page });

    await expect(assetApi.list({ page: 1, pageSize: 20 })).resolves.toEqual(page);
    expect(api.get).toHaveBeenCalledWith('/assets', {
      params: { page: 1, pageSize: 20 },
    });
  });

  it('creates an asset without sending organizationId', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { id: 'a1', status: 'PENDING_REVIEW' } });

    await assetApi.create({
      code: 'BR-1',
      name: 'Bridge',
      categoryId: 'c1',
      locationText: 'District 1',
    });

    const body = vi.mocked(api.post).mock.calls[0]![1] as Record<string, unknown>;
    expect(body).not.toHaveProperty('organizationId');
    expect(api.post).toHaveBeenCalledWith('/assets', body);
  });

  it('reviews an asset through the manager endpoint', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { assetId: 'a1', status: 'ACTIVE', proposalCount: 2 },
    });

    await assetApi.review('a1', { action: 'APPROVE', note: 'looks good' });

    expect(api.post).toHaveBeenCalledWith('/assets/a1/review', {
      action: 'APPROVE',
      note: 'looks good',
    });
  });

  it('loads the platform review queue from the manager endpoint', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { items: [] } });

    await assetApi.listPendingReview({ page: 1, pageSize: 50 });

    expect(api.get).toHaveBeenCalledWith('/assets/pending-review', {
      params: { page: 1, pageSize: 50 },
    });
  });
});

describe('catalogApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads suggested frequencies for a category', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] });

    await catalogApi.listFrequencies('c1');

    expect(api.get).toHaveBeenCalledWith('/asset-categories/c1/suggested-frequencies');
  });

  it('adds a suggested frequency', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { id: 'f1' } });

    await catalogApi.addFrequency('c1', { frequencyUnit: 'MONTH', frequencyInterval: 3 });

    expect(api.post).toHaveBeenCalledWith('/asset-categories/c1/suggested-frequencies', {
      frequencyUnit: 'MONTH',
      frequencyInterval: 3,
    });
  });

  it('deletes a suggested frequency', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: undefined });

    await catalogApi.deleteFrequency('c1', 'f1');

    expect(api.delete).toHaveBeenCalledWith('/asset-categories/c1/suggested-frequencies/f1');
  });
});

describe('proposalApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists proposals for an asset', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] });

    await proposalApi.listForAsset('a1');

    expect(api.get).toHaveBeenCalledWith('/schedule-proposals', { params: { assetId: 'a1' } });
  });

  it('selects a proposal', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { id: 'p1', status: 'ORG_ADMIN_SELECTED' } });

    await proposalApi.select('p1');

    expect(api.post).toHaveBeenCalledWith('/schedule-proposals/p1/select');
  });
});

describe('documentApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uploads a document as multipart form data', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { id: 'd1' } });
    const file = new File(['x'], 'deed.pdf', { type: 'application/pdf' });

    await documentApi.upload('a1', file, 'OWNERSHIP', '2026-01-01');

    const [url, form, config] = vi.mocked(api.post).mock.calls[0]!;
    expect(url).toBe('/assets/a1/documents');
    expect(form).toBeInstanceOf(FormData);
    expect((form as FormData).get('documentType')).toBe('OWNERSHIP');
    expect((form as FormData).get('documentDate')).toBe('2026-01-01');
    expect(config).toEqual({ headers: { 'Content-Type': 'multipart/form-data' } });
  });

  it('surfaces the server-assigned id on upload rather than assuming it is null', async () => {
    const stored = {
      id: 'd-uuid-1',
      documentType: 'PERMIT',
      fileName: 'permit.png',
      contentType: 'image/png',
      sizeBytes: 12,
      checksumSha256: 'abc',
      documentDate: null,
      createdAt: '2026-09-25T00:00:00Z',
    };
    vi.mocked(api.post).mockResolvedValue({ data: stored });

    const uploaded = await documentApi.upload('a1', new File(['x'], 'permit.png'), 'PERMIT');

    // The client must carry the id the server assigned; that the server populates it is backend
    // evidence, which this assertion cannot demonstrate.
    expect(uploaded.id).toBe('d-uuid-1');
  });

  it('streams document content as a blob through the authenticated client', async () => {
    const blob = new Blob(['pdf']);
    vi.mocked(api.get).mockResolvedValue({ data: blob });

    await expect(documentApi.content('a1', 'd1')).resolves.toBe(blob);
    expect(api.get).toHaveBeenCalledWith('/assets/a1/documents/d1/content', {
      responseType: 'blob',
    });
  });
});

describe('droneApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists drones without sending organization scope', async () => {
    const drones = [{ id: 'drone-1', serialNumber: 'SDI-01', serviceability: 'ACTIVE' }];
    vi.mocked(api.get).mockResolvedValue({ data: drones });

    await expect(droneApi.list()).resolves.toEqual(drones);
    expect(api.get).toHaveBeenCalledWith('/drones');
  });

  it('creates a drone with JSON-string metadata and no organization id', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { id: 'drone-1' } });
    const input = {
      serialNumber: 'SDI-01',
      model: 'Surveyor',
      manufacturer: 'AeroCo',
      payloadMetadata: JSON.stringify({ camera: 'thermal' }),
      notes: 'Bridge inspections',
    };

    await droneApi.create(input);

    expect(api.post).toHaveBeenCalledWith('/drones', input);
    expect(vi.mocked(api.post).mock.calls[0]![1]).not.toHaveProperty('organizationId');
  });

  it('loads a drone by id and selection options', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { id: 'drone-1' } });

    await droneApi.getById('drone-1');
    expect(api.get).toHaveBeenCalledWith('/drones/drone-1');

    await droneApi.selection();
    expect(api.get).toHaveBeenCalledWith('/drones/selection');
  });

  it('updates serviceability with the typed maintenance state', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: { id: 'drone-1', serviceability: 'MAINTENANCE' } });

    await droneApi.updateServiceability('drone-1', { serviceability: 'MAINTENANCE' });

    expect(api.patch).toHaveBeenCalledWith('/drones/drone-1/serviceability', {
      serviceability: 'MAINTENANCE',
    });
  });

  it('lists documents belonging to a drone', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] });

    await droneApi.listDocuments('drone-1');

    expect(api.get).toHaveBeenCalledWith('/drones/drone-1/documents');
  });

  it('uploads document file and metadata as multipart without a client checksum', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { id: 'doc-1', status: 'PENDING_REVIEW' } });
    const file = new File(['pdf'], 'airworthiness.pdf', { type: 'application/pdf' });
    const input = {
      file,
      documentType: 'AIRWORTHINESS',
      issuer: 'Aviation Office',
      documentReference: 'CERT-101',
      validFrom: '2026-01-01T00:00:00Z',
      validUntil: '2027-01-01T00:00:00Z',
    };

    await droneApi.uploadDocument('drone-1', input);

    const [url, body, config] = vi.mocked(api.post).mock.calls[0]!;
    expect(url).toBe('/drones/drone-1/documents');
    expect(body).toBeInstanceOf(FormData);
    for (const [name, value] of Object.entries(input)) {
      expect((body as FormData).get(name)).toBe(value);
    }
    expect((body as FormData).has('checksumSha256')).toBe(false);
    expect(config).toBeUndefined();
  });

  it('updates a drone document status', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: { id: 'doc-1', status: 'ACTIVE' } });

    await droneApi.updateDocumentStatus('drone-1', 'doc-1', { status: 'ACTIVE' });

    expect(api.patch).toHaveBeenCalledWith('/drones/drone-1/documents/doc-1/status', {
      status: 'ACTIVE',
    });
  });
});
