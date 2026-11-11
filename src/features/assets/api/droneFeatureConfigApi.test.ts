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
import { droneFeatureConfigApi } from './droneFeatureConfigApi';

describe('droneFeatureConfigApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists active or all feature configurations', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [{ id: '1', code: 'RTK_POSITIONING' }] });
    const res = await droneFeatureConfigApi.list(true);
    expect(api.get).toHaveBeenCalledWith('/drone-feature-configs', { params: { includeInactive: true } });
    expect(res).toHaveLength(1);
  });

  it('creates a new feature configuration', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { id: '2', code: 'PARACHUTE' } });
    const res = await droneFeatureConfigApi.create({
      code: 'PARACHUTE',
      nameVi: 'Dù hạ cánh khẩn cấp',
      nameEn: 'Emergency Parachute',
      category: 'SAFETY',
      isActive: true,
      displayOrder: 8,
    });
    expect(api.post).toHaveBeenCalledWith('/drone-feature-configs', expect.objectContaining({ code: 'PARACHUTE' }));
    expect(res.code).toBe('PARACHUTE');
  });

  it('toggles active status', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: { id: '1', isActive: false } });
    const res = await droneFeatureConfigApi.toggleActive('1');
    expect(api.patch).toHaveBeenCalledWith('/drone-feature-configs/1/toggle-active');
    expect(res.isActive).toBe(false);
  });

  it('deletes feature configuration', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: null });
    await droneFeatureConfigApi.delete('1');
    expect(api.delete).toHaveBeenCalledWith('/drone-feature-configs/1');
  });
});
