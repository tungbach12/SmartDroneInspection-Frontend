import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/api/client', () => ({ api: { get: vi.fn(), post: vi.fn() } }));

import { api } from '@/shared/api/client';
import { mf1DroneApi, uploadDroneEvidence } from './mf1DroneApi';

describe('inspector drone registration API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('submits registration evidence without organization scope', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { id: 'application-1', status: 'PENDING' } });
    await mf1DroneApi.submit({
      serialNumber: 'SN-01', registrationNumber: 'REG-01', registrationFileKey: 'reg/file',
      registrationExpiresAt: '2027-12-31T00:00:00Z', ownershipFileKey: 'owner/file', inspectionFileKey: 'inspection/file',
    });
    expect(api.post).toHaveBeenCalledWith('/drone-registration-applications', expect.not.objectContaining({ organizationId: expect.anything() }));
  });

  it('uploads drone evidence with a typed evidence category and returns the server key', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, data: { fileKey: 'drone-registration-applications/inspector/evidence/OWNERSHIP/uuid.pdf' } } });
    const file = new File(['%PDF-1.7'], 'ownership.pdf', { type: 'application/pdf' });

    await expect(uploadDroneEvidence(file, 'OWNERSHIP')).resolves.toContain('/evidence/OWNERSHIP/');
    expect(api.post).toHaveBeenCalledWith('/drone-registration-applications/evidence', expect.any(FormData), { params: { type: 'OWNERSHIP' } });
  });

  it('loads only the current inspector applications and approved drones', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    await mf1DroneApi.mine();
    await mf1DroneApi.drones();
    expect(api.get).toHaveBeenNthCalledWith(1, '/drone-registration-applications/mine');
    expect(api.get).toHaveBeenNthCalledWith(2, '/drone-registration-applications/mine/drones');
  });
});
