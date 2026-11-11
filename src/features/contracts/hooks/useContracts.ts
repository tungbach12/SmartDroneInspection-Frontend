import { useMemo } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useToastStore } from '@/shared/ui/Toast';
import {
  contractApi,
  contractQueryKeys,
  type AssignOccurrenceInput,
  type CreateServiceRequestInput,
  type IssueServiceQuoteInput,
  type ServiceRequest,
} from '../api/contractApi';

export function useServiceRequests(enabled = true, realtime = true) {
  return useQuery({
    queryKey: contractQueryKeys.requests(),
    queryFn: contractApi.listRequests,
    enabled,
    refetchInterval: realtime ? 3000 : false,
    refetchIntervalInBackground: false,
  });
}

export function useServiceRequest(requestId: string | undefined, realtime = true) {
  return useQuery({
    queryKey: contractQueryKeys.request(requestId ?? ''),
    queryFn: () => contractApi.getRequest(requestId as string),
    enabled: Boolean(requestId),
    refetchInterval: realtime ? 2500 : false,
    refetchIntervalInBackground: false,
  });
}

function useContractMutation<TInput, TOutput = ServiceRequest>(
  mutationFn: (input: TInput) => Promise<TOutput>,
  successMessage?: string,
  requestId?: string,
) {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      if (requestId) {
        await queryClient.invalidateQueries({ queryKey: contractQueryKeys.request(requestId) });
      }
      await queryClient.invalidateQueries({ queryKey: contractQueryKeys.requests() });
      if (successMessage) {
        showToast(successMessage, 'success');
      }
    },
  });
}

export function useCreateServiceRequest() {
  return useContractMutation<CreateServiceRequestInput>(
    contractApi.createRequest,
    'Inspection request submitted.',
  );
}

export function usePostRequestMessage(requestId: string) {
  return useContractMutation<string>(
    (body) => contractApi.postMessage(requestId, body),
    undefined,
    requestId,
  );
}

export function useMarkMessagesRead(requestId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targetRequestId: string) => contractApi.markMessagesRead(targetRequestId),
    onSuccess: async (updatedRequest, targetRequestId) => {
      const id = requestId ?? targetRequestId;
      if (id) {
        queryClient.setQueryData(contractQueryKeys.request(id), updatedRequest);
        await queryClient.invalidateQueries({ queryKey: contractQueryKeys.request(id) });
      }
      queryClient.setQueryData<ServiceRequest[]>(contractQueryKeys.requests(), (old) => {
        if (!old) return old;
        return old.map((r) => (r.id === updatedRequest.id ? updatedRequest : r));
      });
      await queryClient.invalidateQueries({ queryKey: contractQueryKeys.requests() });
    },
  });
}

export function useIssueServiceQuote(requestId: string) {
  return useContractMutation<IssueServiceQuoteInput>(
    (input) => contractApi.saveQuote(requestId, input),
    'Quote saved.',
  );
}

export function useAcceptServiceQuote(requestId: string) {
  return useContractMutation<number>(
    (quoteRowVersion) => contractApi.acceptQuote(requestId, quoteRowVersion),
    'Quote accepted.',
    requestId,
  );
}

export function useUploadSignedContract(requestId: string) {
  return useContractMutation<File>(
    (file) => contractApi.uploadSignedContract(requestId, file),
    'Signed contract uploaded.',
  );
}

export function useDownloadSignedContract() {
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({
    mutationFn: (requestId: string) => contractApi.downloadSignedContract(requestId),
    onError: () => showToast('Signed contract could not be downloaded.', 'error'),
  });
}

export function useAssignServiceOccurrence(requestId: string, occurrenceId: string) {
  return useContractMutation<AssignOccurrenceInput>(
    (input) => contractApi.assignOccurrence(requestId, occurrenceId, input),
    'Occurrence assigned.',
    requestId,
  );
}

export function useConfirmOccurrencePayment(requestId: string, occurrenceId: string) {
  return useContractMutation<{ paymentReference: string; amount: number }>(
    (input) => contractApi.confirmOccurrencePayment(requestId, occurrenceId, input),
    'Customer payment confirmed.',
    requestId,
  );
}

export function useRecordOccurrencePayout(requestId: string, occurrenceId: string) {
  return useContractMutation<{ payoutReference: string }>(
    (input) => contractApi.recordOccurrencePayout(requestId, occurrenceId, input),
    'Inspector partner payout settled.',
    requestId,
  );
}

export function usePartnerInspectors(enabled = true) {
  return useQuery({
    queryKey: [...contractQueryKeys.partners(), 'inspectors'],
    queryFn: contractApi.listPartnerInspectors,
    enabled,
  });
}

export function usePartnerDrones(enabled = true) {
  return useQuery({
    queryKey: [...contractQueryKeys.partners(), 'drones'],
    queryFn: contractApi.listPartnerDrones,
    enabled,
  });
}

export function useRegisterPartnerInspector() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: contractApi.registerPartnerInspector,
    onSuccess: async () =>
      queryClient.invalidateQueries({ queryKey: [...contractQueryKeys.partners(), 'inspectors'] }),
  });
}

export function useRegisterPartnerDrone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: contractApi.registerPartnerDrone,
    onSuccess: async () =>
      queryClient.invalidateQueries({ queryKey: [...contractQueryKeys.partners(), 'drones'] }),
  });
}

export interface UnreadChatNotification {
  requestId: string;
  requestDescription: string;
  unreadCount: number;
  latestMessageBody: string;
  latestMessageAuthor: string;
  latestMessageTime: string;
}

export function useUnreadChatSummary() {
  const currentUser = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const roles = useAuthStore((state) => state.roles);
  const isAuth = status === 'authenticated' && Boolean(currentUser);
  const canAccessContracts =
    isAuth && (roles.includes('CUSTOMER') || roles.includes('MANAGER'));
  const { data: requests = [] } = useServiceRequests(canAccessContracts, canAccessContracts);

  return useMemo(() => {
    if (!isAuth || !currentUser) {
      return { totalUnread: 0, items: [] as UnreadChatNotification[] };
    }
    try {
      const items: UnreadChatNotification[] = [];
      let totalUnread = 0;

      requests.forEach((req) => {
        const incomingMessages = (req.messages || []).filter(
          (m) => m.authorUserId !== currentUser.id,
        );
        if (incomingMessages.length === 0) return;

        const unreadIncoming = incomingMessages.filter((m) => !m.readAt);
        const unreadForThis = unreadIncoming.length;

        if (unreadForThis > 0) {
          totalUnread += unreadForThis;
          const latestIncoming = incomingMessages[incomingMessages.length - 1];
          items.push({
            requestId: req.id,
            requestDescription: req.description || 'Service request',
            unreadCount: unreadForThis,
            latestMessageBody: latestIncoming?.body || '',
            latestMessageAuthor: latestIncoming?.authorName || 'Partner',
            latestMessageTime: latestIncoming?.createdAt || '',
          });
        }
      });

      return { totalUnread, items };
    } catch {
      return { totalUnread: 0, items: [] as UnreadChatNotification[] };
    }
  }, [requests, currentUser, isAuth]);
}
