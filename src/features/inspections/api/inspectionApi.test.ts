import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/shared/api/client';
import { inspectionApi } from './inspectionApi';

describe('inspectionApi.generateDraft', () => {
  afterEach(() => vi.restoreAllMocks());

  it('allows report generation to wait past 30 seconds but within the existing proxy limit', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { id: 'version-1' } } as never);

    await inspectionApi.generateDraft('inspection-1');

    expect(post).toHaveBeenCalledWith(
      '/inspections/inspection-1/report/draft',
      undefined,
      { timeout: 110_000 },
    );
    expect(api.defaults.timeout).toBe(30_000);
  });
});
