import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { api } from '@/shared/api/client';
import { droneDocumentConfigApi } from './droneDocumentConfigApi';

describe('droneDocumentConfigApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists active or all document configurations', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [{ id: '1', code: 'REGISTRATION' }] });
    const res = await droneDocumentConfigApi.list(true);
    expect(api.get).toHaveBeenCalledWith('/drone-document-configs', { params: { includeInactive: true } });
    expect(res).toHaveLength(1);
  });

  it('creates a new document configuration', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { id: '2', code: 'INSURANCE' } });
    const res = await droneDocumentConfigApi.create({
      code: 'INSURANCE',
      titleVi: 'Bảo hiểm',
      titleEn: 'Insurance',
      isRequired: true,
      isActive: true,
      displayOrder: 4,
    });
    expect(api.post).toHaveBeenCalledWith('/drone-document-configs', expect.objectContaining({ code: 'INSURANCE' }));
    expect(res.code).toBe('INSURANCE');
  });

  it('toggles active status', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: { id: '1', isActive: false } });
    const res = await droneDocumentConfigApi.toggleActive('1');
    expect(api.patch).toHaveBeenCalledWith('/drone-document-configs/1/toggle-active');
    expect(res.isActive).toBe(false);
  });

  it('deletes document configuration', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: null });
    await droneDocumentConfigApi.delete('1');
    expect(api.delete).toHaveBeenCalledWith('/drone-document-configs/1');
  });
});
