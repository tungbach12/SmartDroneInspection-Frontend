import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ratingApi, type UpsertInspectorRatingPayload } from '../api/ratingApi';
import { inspectionKeys } from './useInspections';
import { useToastStore } from '@/shared/ui/Toast';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { useLocale } from '@/shared/i18n/LocaleProvider';

export function useInspectionRating(inspectionId: string, enabled = true) {
  return useQuery({
    queryKey: ['inspection-rating', inspectionId],
    queryFn: () => ratingApi.getInspectionRatings(inspectionId),
    enabled: Boolean(inspectionId) && enabled,
  });
}

export function useUpsertInspectionRating(inspectionId: string) {
  const queryClient = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);
  const { t } = useLocale();

  return useMutation({
    mutationFn: (payload: UpsertInspectorRatingPayload) =>
      ratingApi.upsertInspectionRating(inspectionId, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(['inspection-rating', inspectionId], updated);
      void queryClient.invalidateQueries({ queryKey: inspectionKeys.detail(inspectionId) });
      void queryClient.invalidateQueries({ queryKey: inspectionKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['inspector-ratings'] });
      void queryClient.invalidateQueries({ queryKey: ['partner-candidates'] });
      showToast(t('Rating saved.'));
    },
    onError: (err) => {
      showToast(getErrorMessage(err, t('Could not save rating.')), 'error');
    },
  });
}

export function useInspectorRatingProfile(
  inspectorId: string | undefined,
  page = 0,
  size = 10,
  enabled = true,
) {
  return useQuery({
    queryKey: ['inspector-ratings', inspectorId, page, size],
    queryFn: () => ratingApi.getInspectorRatings(inspectorId!, page, size),
    enabled: Boolean(inspectorId) && enabled,
  });
}

export function useMyInspectorRatings(page = 0, size = 10, enabled = true) {
  return useQuery({
    queryKey: ['inspector-ratings', 'me', page, size],
    queryFn: () => ratingApi.getMyRatings(page, size),
    enabled,
  });
}
