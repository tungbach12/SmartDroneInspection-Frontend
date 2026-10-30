import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  financeApi,
  type UpdateInspectionFinanceSettingsPayload,
  type ConfirmOccurrencePaymentPayload,
  type RecordOccurrencePayoutPayload,
} from '../api/financeApi';

const SETTINGS_KEY = ['admin', 'inspection-finance-settings'];
const OCCURRENCE_FINANCE_KEY = (requestId: string, occurrenceId: string) => [
  'contracts',
  requestId,
  'occurrences',
  occurrenceId,
  'finance',
];

export function useInspectionFinanceSettings() {
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: financeApi.getAdminSettings,
  });
}

export function useUpdateInspectionFinanceSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateInspectionFinanceSettingsPayload) =>
      financeApi.updateAdminSettings(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(SETTINGS_KEY, data);
    },
  });
}

export function useOccurrenceFinance(requestId: string, occurrenceId: string) {
  return useQuery({
    queryKey: OCCURRENCE_FINANCE_KEY(requestId, occurrenceId),
    queryFn: () => financeApi.getOccurrenceFinance(requestId, occurrenceId),
    enabled: Boolean(requestId && occurrenceId),
  });
}

export function useConfirmOccurrencePayment(requestId: string, occurrenceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ConfirmOccurrencePaymentPayload) =>
      financeApi.confirmOccurrencePayment(requestId, occurrenceId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: OCCURRENCE_FINANCE_KEY(requestId, occurrenceId),
      });
      void queryClient.invalidateQueries({ queryKey: ['inspections'] });
    },
  });
}

export function useRecordOccurrencePayout(requestId: string, occurrenceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RecordOccurrencePayoutPayload) =>
      financeApi.recordOccurrencePayout(requestId, occurrenceId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: OCCURRENCE_FINANCE_KEY(requestId, occurrenceId),
      });
    },
  });
}

export function useCreatePayOSPaymentLink(requestId: string, occurrenceId: string) {
  return useMutation({
    mutationFn: () => financeApi.createPayOSPaymentLink(requestId, occurrenceId),
  });
}
