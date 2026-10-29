import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/api/client', () => ({ api: { get: vi.fn(), post: vi.fn() } }));

import { api } from '@/shared/api/client';
import { mf1ReviewApi } from './mf1ReviewApi';

describe('MF1 admin review API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads pending customer airspace registrations from the platform review queue', async () => {
    const rows = [{ id: 'review-1' }];
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, message: 'ok', data: rows } });
    await expect(mf1ReviewApi.pendingCustomers()).resolves.toEqual(rows);
    expect(api.get).toHaveBeenCalledWith('/platform/customer-airspace-reviews/pending');
  });

  it('requires a review note when approving a prospect', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { data: { id: 'review-1' } } });
    await mf1ReviewApi.approveCustomer('review-1', 'Checked authority guidance');
    expect(api.post).toHaveBeenCalledWith(
      '/platform/customer-airspace-reviews/review-1/approve',
      { reviewNote: 'Checked authority guidance' },
    );
  });

  it('sends a verified contract key when approving an inspector partner', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { data: { id: 'partner-1' } } });
    await mf1ReviewApi.approvePartner('partner-1', 'contracts/partner-1.pdf', 'Contract verified');
    expect(api.post).toHaveBeenCalledWith(
      '/inspector-partner-applications/partner-1/approve',
      { partnerContractFileKey: 'contracts/partner-1.pdf', reviewNote: 'Contract verified' },
    );
  });

  it('approves an inspector-owned drone registration without fabricating organization scope', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { data: { id: 'drone-app-1' } } });
    await mf1ReviewApi.approveDrone('drone-app-1');
    expect(api.post).toHaveBeenCalledWith('/drone-registration-applications/drone-app-1/approve');
  });
});
