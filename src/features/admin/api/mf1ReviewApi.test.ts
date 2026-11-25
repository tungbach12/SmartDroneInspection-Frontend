import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/api/client', () => ({ api: { get: vi.fn(), post: vi.fn() } }));

import { api } from '@/shared/api/client';
import { mf1ReviewApi } from './mf1ReviewApi';

describe('MF1 admin review API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads inspector-owned drone evidence only through review endpoints', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: new Blob(['%PDF-1.7']) });

    await mf1ReviewApi.droneEvidence('drone-1', 'OWNERSHIP');

    expect(api.get).toHaveBeenCalledWith('/drone-registration-applications/drone-1/evidence/OWNERSHIP', { responseType: 'blob' });
  });

  it('approves an inspector-owned drone registration without fabricating organization scope', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { data: { id: 'drone-app-1' } } });
    await mf1ReviewApi.approveDrone('drone-app-1');
    expect(api.post).toHaveBeenCalledWith('/drone-registration-applications/drone-app-1/approve');
  });
});
