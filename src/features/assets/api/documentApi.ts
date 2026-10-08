import { api } from '@/shared/api/client';

export interface AssetDocument {
  id: string;
  documentType: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  checksumSha256: string;
  documentDate: string | null;
  createdAt: string;
}

export const documentKeys = {
  all: ['asset-documents'] as const,
  forAsset: (assetId: string) => [...documentKeys.all, assetId] as const,
};

export const documentApi = {
  list: (assetId: string) =>
    api.get<AssetDocument[]>(`/assets/${assetId}/documents`).then((r) => r.data),

  upload: (assetId: string, file: File, documentType: string, documentDate?: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('documentType', documentType);
    if (documentDate) form.append('documentDate', documentDate);
    return api
      .post<AssetDocument>(`/assets/${assetId}/documents`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  /**
   * Streams document bytes through the shared authenticated client.
   *
   * The content endpoint is organization-scoped and bearer-authenticated, so a plain link or a
   * bare URL cannot reach it. The upload response carries the stored document id precisely so this
   * call can be made with the id the server assigned.
   */
  content: (assetId: string, documentId: string) =>
    api
      .get<Blob>(`/assets/${assetId}/documents/${documentId}/content`, {
        responseType: 'blob',
      })
      .then((r) => r.data),
};
