import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '@/shared/ui/Toast';
import { documentApi, documentKeys } from '../api/documentApi';

export function useAssetDocuments(assetId: string) {
  return useQuery({
    queryKey: documentKeys.forAsset(assetId),
    queryFn: () => documentApi.list(assetId),
    enabled: Boolean(assetId),
  });
}

export function useUploadDocument(assetId: string) {
  const queryClient = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);

  return useMutation({
    mutationFn: ({
      file,
      documentType,
      documentDate,
    }: {
      file: File;
      documentType: string;
      documentDate?: string;
    }) => documentApi.upload(assetId, file, documentType, documentDate),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: documentKeys.forAsset(assetId) });
      showToast('Document uploaded');
    },
  });
}
