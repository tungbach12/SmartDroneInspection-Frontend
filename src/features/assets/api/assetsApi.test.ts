import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import { api } from '@/shared/api/client';
import { assetApi } from './assetApi';
import { catalogApi } from './catalogApi';
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
    vi.mocked(api.post).mockResolvedValue({ data: { id: 'a1', status: 'ACTIVE' } });

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

  it('patches editable asset fields including clear flags', async () => {
    const updated = { id: 'a1', structureHeightMeters: null, footprintAreaSquareMeters: 900 };
    vi.mocked(api.patch).mockResolvedValue({ data: updated });
    const input = { name: 'Updated bridge', clearStructureHeight: true, footprintAreaSquareMeters: 900 };

    await expect(assetApi.update('a1', input)).resolves.toEqual(updated);
    expect(api.patch).toHaveBeenCalledWith('/assets/a1', input);
  });

  it('retires an asset', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { id: 'a1', status: 'RETIRED' } });

    await assetApi.retire('a1');

    expect(api.post).toHaveBeenCalledWith('/assets/a1/retire');
  });
});

describe('catalogApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists categories', async () => {
    const categories = [{ id: 'c1', code: 'BRIDGE', name: 'Bridge', description: null, active: true }];
    vi.mocked(api.get).mockResolvedValue({ data: categories });

    await expect(catalogApi.listCategories()).resolves.toEqual(categories);
    expect(api.get).toHaveBeenCalledWith('/asset-categories');
  });

  it('creates category', async () => {
    const created = { id: 'c1', code: 'BRIDGE', name: 'Bridge', description: null, active: true };
    vi.mocked(api.post).mockResolvedValue({ data: created });

    await expect(catalogApi.createCategory({ code: 'BRIDGE', name: 'Bridge' })).resolves.toEqual(created);
    expect(api.post).toHaveBeenCalledWith('/asset-categories', { code: 'BRIDGE', name: 'Bridge' });
  });

  it('updates category', async () => {
    const updated = { id: 'c1', code: 'BRIDGE', name: 'Bridge Updated', description: 'desc', active: true };
    vi.mocked(api.put).mockResolvedValue({ data: updated });

    await expect(catalogApi.updateCategory('c1', { code: 'BRIDGE', name: 'Bridge Updated', description: 'desc' })).resolves.toEqual(updated);
    expect(api.put).toHaveBeenCalledWith('/asset-categories/c1', { code: 'BRIDGE', name: 'Bridge Updated', description: 'desc' });
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
    expect((form as FormData).get('primaryImage')).toBeNull();
    expect(config).toEqual({ headers: { 'Content-Type': 'multipart/form-data' } });
  });

  it('marks a primary asset image explicitly', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { id: 'd1', documentType: 'ASSET_PHOTO' } });
    await documentApi.upload('a1', new File(['image'], 'bridge.png', { type: 'image/png' }), 'ASSET_PHOTO', undefined, true);
    const form = vi.mocked(api.post).mock.calls[0]![1] as FormData;
    expect(form.get('primaryImage')).toBe('true');
    expect(form.get('documentType')).toBe('ASSET_PHOTO');
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
});
