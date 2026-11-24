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
  inspectionChatApi,
  type AssignOccurrenceInput,
  type CreateServiceRequestInput,
  type EvaluatePartnerCandidatesInput,
  type InspectionChatThread,
  type IssueServiceQuoteInput,
  type PartnerCandidate,
  type PartnerCapabilityOption,
  type ServiceRequest,
  type ServiceManagerOption,
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

export function useClaimServiceRequest() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({
    mutationFn: (requestId: string) => contractApi.claimRequest(requestId),
    onSuccess: async (updatedRequest) => {
      queryClient.setQueryData(contractQueryKeys.request(updatedRequest.id), updatedRequest);
      queryClient.setQueryData<ServiceRequest[]>(contractQueryKeys.requests(), (old) => {
        if (!old) return old;
        return old.map((request) =>
          request.id === updatedRequest.id ? updatedRequest : request,
        );
      });
      await queryClient.invalidateQueries({ queryKey: contractQueryKeys.requests() });
      showToast('Service request assigned to you.', 'success');
    },
  });
}

export function useAdminReassignServiceRequest() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({
    mutationFn: ({ requestId, managerId }: { requestId: string; managerId: string }) =>
      contractApi.reassignRequest(requestId, managerId),
    onSuccess: async (updatedRequest) => {
      queryClient.setQueryData(contractQueryKeys.request(updatedRequest.id), updatedRequest);
      await queryClient.invalidateQueries({ queryKey: contractQueryKeys.requests() });
      showToast('Service request reassigned.', 'success');
    },
  });
}

export function useAdminUnassignServiceRequest() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({
    mutationFn: (requestId: string) => contractApi.unassignRequest(requestId),
    onSuccess: async (updatedRequest) => {
      queryClient.setQueryData(contractQueryKeys.request(updatedRequest.id), updatedRequest);
      await queryClient.invalidateQueries({ queryKey: contractQueryKeys.requests() });
      showToast('Service request unassigned.', 'success');
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
  return useContractMutation<string | { body: string; files: File[] }>(
    (input) =>
      typeof input === 'string'
        ? contractApi.postMessage(requestId, input)
        : contractApi.postMessage(requestId, input.body, input.files),
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

export function usePartnerCapabilities() {
  return useQuery<PartnerCapabilityOption[]>({
    queryKey: [...contractQueryKeys.partners(), 'capabilities'],
    queryFn: contractApi.listPartnerCapabilities,
  });
}

export function useEvaluatePartnerCandidates(requestId: string) {
  return useMutation<PartnerCandidate[], Error, EvaluatePartnerCandidatesInput>({
    mutationFn: (input) => contractApi.evaluatePartnerCandidates(requestId, input),
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

/**
 * Reuses one already-confirmed Inspector/drone pair for the remaining unassigned occurrences.
 * Sequential on purpose: each occurrence is a separate dispatch with its own schedule-conflict
 * check, so failures must be reported per occurrence instead of being rolled back silently.
 */
export function useAssignRemainingOccurrences(requestId: string) {
  return useContractMutation<
    {
      occurrences: Array<{ id: string; plannedStartAt: string; plannedEndAt: string }>;
      inspectorId: string;
      droneId: string;
    },
    { assigned: number; failed: number }
  >(
    async ({ occurrences, inspectorId, droneId }) => {
      let assigned = 0;
      let failed = 0;
      for (const occurrence of occurrences) {
        try {
          await contractApi.assignOccurrence(requestId, occurrence.id, {
            plannedStartAt: occurrence.plannedStartAt,
            plannedEndAt: occurrence.plannedEndAt,
            inspectorId,
            droneId,
          });
          assigned += 1;
        } catch {
          failed += 1;
        }
      }
      return { assigned, failed };
    },
    undefined,
    requestId,
  );
}

export function useOccurrenceFinance(requestId: string, occurrenceId: string, enabled = true) {
  return useQuery({
    queryKey: [...contractQueryKeys.request(requestId), 'occurrences', occurrenceId, 'finance'],
    queryFn: () => contractApi.getOccurrenceFinance(requestId, occurrenceId),
    enabled: enabled && Boolean(requestId && occurrenceId),
    refetchInterval: enabled ? 3000 : false,
    refetchIntervalInBackground: false,
  });
}

export function useConfirmOccurrencePayment(requestId: string, occurrenceId: string) {
  return useContractMutation<{ paymentReference: string; amount: number }>(
    (input) => contractApi.confirmOccurrencePayment(requestId, occurrenceId, input),
    'Customer payment confirmed.',
    requestId,
  );
}

export function useCancelUnpaidPaymentOrder(requestId: string, occurrenceId: string) {
  return useContractMutation<void>(
    () => contractApi.cancelUnpaidPaymentOrder(requestId, occurrenceId),
    'Unpaid payment order cleared.',
    requestId,
  );
}

export function useInitiateOccurrenceRefund(requestId: string, occurrenceId: string) {
  return useContractMutation<{ amount: number; requestReference: string; reasonCode: string; serviceStage: string; reason: string; contractClauseReference: string; evidenceReference: string; inspectorReceivableAmount: number; platformAbsorbedAmount: number }>(
    (input) => contractApi.initiateOccurrenceRefund(requestId, occurrenceId, input),
    'Refund initiated; payout is held until the external transfer is confirmed.', requestId);
}

export function useCompleteOccurrenceRefund(requestId: string, occurrenceId: string, refundId: string) {
  return useContractMutation<{ inspectorPayoutReduction: number; platformCommissionAdjustment: number; vatAdjustment: number; tncnAdjustment: number; platformAbsorbedAmount: number; externalReference: string }>(
    (input) => contractApi.completeOccurrenceRefund(requestId, occurrenceId, refundId, input),
    'External refund transfer recorded.', requestId);
}

export function useCancelOccurrenceRefund(requestId: string, occurrenceId: string, refundId: string) {
  return useContractMutation<{ reason: string }>(
    (input) => contractApi.cancelOccurrenceRefund(requestId, occurrenceId, refundId, input.reason),
    'Pending refund cancelled; payout hold recalculated.', requestId);
}

export function useReconcileRefundAllocation(requestId: string, occurrenceId: string, refundId: string) {
  return useContractMutation<{
    inspectorReceivableAmount: number; platformAbsorbedPlanAmount: number;
    inspectorPayoutReduction: number; platformCommissionAdjustment: number;
    vatAdjustment: number; tncnAdjustment: number; platformAbsorbedAmount: number;
    reconciliationReference: string; note: string;
  }>((input) => contractApi.reconcileRefundAllocation(requestId, occurrenceId, refundId, input),
    'Legacy refund allocation reconciled.', requestId);
}

export function useRecordReceivableRecovery(requestId: string, occurrenceId: string, receivableId: string) {
  return useContractMutation<{ amount: number; externalReference: string; note: string }>(
    (input) => contractApi.recordReceivableRecovery(requestId, occurrenceId, receivableId, input),
    'Inspector receivable recovery recorded.', requestId);
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

export function useServiceManagers(enabled = true) {
  return useQuery<ServiceManagerOption[]>({
    queryKey: contractQueryKeys.serviceManagers(),
    queryFn: contractApi.listServiceManagers,
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

export const inspectionChatQueryKeys = {
  threads: ['inspections', 'messages', 'threads'] as const,
  thread: (inspectionId: string) => ['inspections', 'messages', 'thread', inspectionId] as const,
};

export function useInspectionChatThreads(enabled = true, realtime = true) {
  return useQuery({
    queryKey: inspectionChatQueryKeys.threads,
    queryFn: inspectionChatApi.listThreads,
    enabled,
    refetchInterval: realtime ? 3000 : false,
    refetchIntervalInBackground: false,
  });
}

export function usePostInspectionMessage(inspectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { body: string; files?: File[] }) =>
      inspectionChatApi.postMessage(inspectionId, input),
    onSuccess: async (updatedThread: InspectionChatThread) => {
      queryClient.setQueryData(inspectionChatQueryKeys.thread(inspectionId), updatedThread);
      await queryClient.invalidateQueries({ queryKey: inspectionChatQueryKeys.threads });
    },
  });
}

export function useMarkInspectionMessagesRead(inspectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targetId?: string) =>
      inspectionChatApi.markMessagesRead(targetId ?? inspectionId),
    onSuccess: (updatedThread: InspectionChatThread) => {
      queryClient.setQueryData(inspectionChatQueryKeys.thread(updatedThread.inspectionId), updatedThread);
      queryClient.setQueryData<InspectionChatThread[]>(
        inspectionChatQueryKeys.threads,
        (prev) =>
          prev?.map((item) =>
            item.inspectionId === updatedThread.inspectionId ? updatedThread : item,
          ) ?? prev,
      );
    },
  });
}

export function useUnreadChatSummary() {
  const currentUser = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const roles = useAuthStore((state) => state.roles);
  const isAuth = status === 'authenticated' && Boolean(currentUser);
  const canAccessContracts =
    isAuth && (roles.includes('CUSTOMER') || roles.includes('MANAGER'));
  const canAccessInspectionChat =
    isAuth && (roles.includes('CUSTOMER') || roles.includes('INSPECTOR'));
  const { data: requests = [] } = useServiceRequests(canAccessContracts, canAccessContracts);
  const { data: inspectionThreads = [] } = useInspectionChatThreads(
    canAccessInspectionChat,
    canAccessInspectionChat,
  );

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

      inspectionThreads.forEach((thread) => {
        const incomingMessages = (thread.messages || []).filter(
          (m) => m.authorUserId !== currentUser.id,
        );
        if (incomingMessages.length === 0) return;

        const unreadIncoming = incomingMessages.filter((m) => !m.readAt);
        const unreadForThis = unreadIncoming.length;

        if (unreadForThis > 0) {
          totalUnread += unreadForThis;
          const latestIncoming = incomingMessages[incomingMessages.length - 1];
          items.push({
            requestId: thread.inspectionId,
            requestDescription: thread.assetName || 'Inspection',
            unreadCount: unreadForThis,
            latestMessageBody: latestIncoming?.body || '',
            latestMessageAuthor: latestIncoming?.authorName || thread.counterpartName || 'Partner',
            latestMessageTime: latestIncoming?.createdAt || '',
          });
        }
      });

      return { totalUnread, items };
    } catch {
      return { totalUnread: 0, items: [] as UnreadChatNotification[] };
    }
  }, [requests, inspectionThreads, currentUser, isAuth]);
}
