import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/shared/api/client';
import { inspectionApi } from './inspectionApi';

describe('inspectionApi MF3 simplified contracts', () => {
  afterEach(() => vi.restoreAllMocks());

  it('uploads evidence without the UI-only source multipart field', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { id: 'evidence-1' } } as never);
    const file = new File(['image'], 'span.png', { type: 'image/png' });

    await inspectionApi.uploadEvidence('inspection-1', file, 'session-1');

    const form = post.mock.calls[0]?.[1] as FormData;
    expect(form.get('file')).toBe(file);
    expect(form.get('fieldSessionId')).toBe('session-1');
    expect(form.has('source')).toBe(false);
  });

  it('requests another field session through the MF2 preparation action', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { id: 'preparation-2' } } as never);

    await inspectionApi.requestAdditionalSession('inspection-1', 'East face was not covered');

    expect(post).toHaveBeenCalledWith(
      '/inspections/inspection-1/field-sessions/additional-session',
      { reason: 'East face was not covered' },
    );
  });
});

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
