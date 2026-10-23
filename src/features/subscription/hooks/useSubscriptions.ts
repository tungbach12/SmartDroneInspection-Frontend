import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '@/shared/ui/Toast';
import {
  subscriptionApi,
  subscriptionKeys,
  type CapturePayPalOrderInput,
  type ConfirmPaymentInput,
  type CreateSubscriptionInput,
} from '../api/subscriptionApi';

export function useCurrentSubscription() {
  return useQuery({
    queryKey: subscriptionKeys.current(),
    queryFn: subscriptionApi.getCurrent,
  });
}

export function useCreateSubscription() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);

  return useMutation({
    mutationFn: (input: CreateSubscriptionInput) => subscriptionApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });
      showToast(
        'Subscription request submitted successfully. Choose PayPal hosted approval or corporate wire transfer below.',
        'success',
      );
    },
    onError: (err) => {
      showToast(err instanceof Error ? err.message : 'Failed to request subscription', 'error');
    },
  });
}

export function useCreatePayPalOrder() {
  const showToast = useToastStore((s) => s.showToast);
  return useMutation({
    mutationFn: (subscriptionId: string) => subscriptionApi.createPayPalOrder(subscriptionId),
    onError: (err) => {
      showToast(err instanceof Error ? err.message : 'Failed to create PayPal order', 'error');
    },
  });
}

export function useCapturePayPalOrder() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);

  return useMutation({
    mutationFn: (input: CapturePayPalOrderInput) => subscriptionApi.capturePayPalOrder(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });
      showToast('PayPal capture confirmed. Subscription status is refreshing.', 'success');
    },
    onError: (err) => {
      showToast(err instanceof Error ? err.message : 'Failed to capture PayPal payment', 'error');
    },
  });
}

export function useSubscriptionTransactions(subscriptionId: string | null) {
  return useQuery({
    queryKey: subscriptionKeys.transactions(subscriptionId ?? ''),
    queryFn: () => subscriptionApi.listTransactions(subscriptionId!),
    enabled: Boolean(subscriptionId),
  });
}

export function usePlatformSubscriptions(statusFilter?: string) {
  return useQuery({
    queryKey: subscriptionKeys.platformList(statusFilter),
    queryFn: () => subscriptionApi.platformList(statusFilter),
  });
}

export function usePlatformSubscriptionDetail(id: string | null) {
  return useQuery({
    queryKey: subscriptionKeys.platformDetail(id ?? ''),
    queryFn: () => subscriptionApi.platformDetail(id!),
    enabled: Boolean(id),
  });
}

export function useConfirmSubscriptionPayment() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ConfirmPaymentInput }) =>
      subscriptionApi.confirmPayment(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });
      showToast('Payment confirmed and subscription activated successfully', 'success');
    },
    onError: (err) => {
      showToast(err instanceof Error ? err.message : 'Failed to confirm payment', 'error');
    },
  });
}
