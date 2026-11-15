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

  it('uploads flight permit through the flight-permit endpoint', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { id: 'inspection-1', status: 'READY_FOR_FLIGHT' } } as never);
    const file = new File(['permit'], 'permit.pdf', { type: 'application/pdf' });

    await inspectionApi.uploadFlightPermit('inspection-1', file);

    const [url, form] = post.mock.calls[0]!;
    expect(url).toBe('/inspections/inspection-1/flight-permit');
    expect((form as FormData).get('file')).toBe(file);
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

  it('builds variant-aware content URLs and resumable upload / media ticket contracts', async () => {
    expect(inspectionApi.evidenceContentUrl('i1', 'e1')).toBe(
      '/api/v1/inspections/i1/evidence/e1/content',
    );
    expect(inspectionApi.evidenceContentUrl('i1', 'e1', 'thumb')).toBe(
      '/api/v1/inspections/i1/evidence/e1/content?variant=thumb',
    );

    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { sessionId: 's1' } } as never);
    const put = vi.spyOn(api, 'put').mockResolvedValue({ data: { sessionId: 's1', uploadedPartNumbers: [1] } } as never);
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: { sessionId: 's1' } } as never);
    const del = vi.spyOn(api, 'delete').mockResolvedValue({ data: { sessionId: 's1', status: 'CANCELLED' } } as never);

    await inspectionApi.beginEvidenceUpload('i1', {
      fileName: 'flight.mp4',
      contentType: 'video/mp4',
      totalSizeBytes: 12345,
    });
    expect(post).toHaveBeenCalledWith('/inspections/i1/evidence/uploads', {
      fileName: 'flight.mp4',
      contentType: 'video/mp4',
      totalSizeBytes: 12345,
    });

    await inspectionApi.getEvidenceUploadStatus('i1', 's1');
    expect(get).toHaveBeenCalledWith('/inspections/i1/evidence/uploads/s1');

    const chunk = new Blob(['chunk']);
    await inspectionApi.uploadEvidencePart('i1', 's1', 1, chunk);
    expect(put.mock.calls[0]?.[0]).toBe('/inspections/i1/evidence/uploads/s1/parts/1');
    const uploadedPartBody = put.mock.calls[0]?.[1];
    expect(uploadedPartBody instanceof FormData ? uploadedPartBody.get('file') : null).toBeTruthy();

    await inspectionApi.completeEvidenceUpload('i1', 's1');
    expect(post).toHaveBeenCalledWith('/inspections/i1/evidence/uploads/s1/complete');

    await inspectionApi.cancelEvidenceUpload('i1', 's1');
    expect(del).toHaveBeenCalledWith('/inspections/i1/evidence/uploads/s1');

    await inspectionApi.retryEvidenceProcessing('i1', 'e1');
    expect(post).toHaveBeenCalledWith('/inspections/i1/evidence/e1/retry-processing');

    await inspectionApi.issueMediaTicket('i1', 'e1', 'primary');
    expect(post).toHaveBeenCalledWith(
      '/inspections/i1/evidence/e1/media-ticket',
      null,
      { params: { variant: 'primary' } },
    );
  });
});
