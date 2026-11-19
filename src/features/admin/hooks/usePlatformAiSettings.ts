import { useContext } from 'react';
import {
  QueryClient,
  QueryClientContext,
  useMutation,
  useQuery,
} from '@tanstack/react-query';
import { useToastStore } from '@/shared/ui/Toast';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import {
  inspectionApi,
  type PlatformAiAnalytics,
  type UpdatePlatformAiSettingsInput,
} from '@/features/inspections/api/inspectionApi';

export const platformAiSettingsKey = ['inspections', 'ai-settings-analytics'] as const;

const fallbackClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

export function usePlatformAiAnalytics(enabled = true) {
  const contextClient = useContext(QueryClientContext);
  const client = contextClient ?? fallbackClient;
  return useQuery<PlatformAiAnalytics>(
    {
      queryKey: platformAiSettingsKey,
      queryFn: () => inspectionApi.getAiSettingsAndAnalytics(),
      enabled: Boolean(enabled && contextClient),
      staleTime: 15_000,
    },
    client,
  );
}

export function useUpdatePlatformAiSettings() {
  const { t } = useLocale();
  const contextClient = useContext(QueryClientContext);
  const client = contextClient ?? fallbackClient;
  const showToast = useToastStore((state) => state.showToast);
  return useMutation(
    {
      mutationFn: (input: UpdatePlatformAiSettingsInput) => inspectionApi.updateAiSettings(input),
      onSuccess: (data) => {
        client.setQueryData(platformAiSettingsKey, data);
        client.invalidateQueries({ queryKey: ['inspections'] });
        showToast(
          `${t('Updated AI auto-confirm threshold')} (${data.autoConfirmThreshold}%).`,
          'success',
        );
      },
      onError: (error) =>
        showToast(getErrorMessage(error, t('Could not update AI threshold configuration.')), 'error'),
    },
    client,
  );
}
