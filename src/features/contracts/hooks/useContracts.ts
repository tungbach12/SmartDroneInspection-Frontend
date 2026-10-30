import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useToastStore } from '@/shared/ui/Toast';
import {
  contractApi,
  contractQueryKeys,
  type AssignOccurrenceInput,
  type CreateServiceRequestInput,
  type IssueServiceQuoteInput,
  type ServiceRequest,
} from '../api/contractApi';

export function useServiceRequests() {
  return useQuery({
    queryKey: contractQueryKeys.requests(),
    queryFn: contractApi.listRequests,
  });
}

export function useServiceRequest(requestId: string | undefined) {
  return useQuery({
    queryKey: contractQueryKeys.request(requestId ?? ''),
    queryFn: () => contractApi.getRequest(requestId as string),
    enabled: Boolean(requestId),
  });
}

function useContractMutation<TInput, TOutput = ServiceRequest>(
  mutationFn: (input: TInput) => Promise<TOutput>,
  successMessage: string,
) {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: contractQueryKeys.requests() });
      showToast(successMessage, 'success');
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
    'Message sent.',
  );
}

export function useIssueServiceQuote(requestId: string) {
  return useContractMutation<IssueServiceQuoteInput>(
    (input) => contractApi.issueQuote(requestId, input),
    'Quote issued.',
  );
}

export function useAcceptServiceQuote(requestId: string) {
  return useContractMutation<number>(
    (versionNo) => contractApi.acceptQuote(requestId, versionNo),
    'Latest quote accepted.',
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
  );
}

export function usePartnerInspectors() {
  return useQuery({
    queryKey: [...contractQueryKeys.partners(), 'inspectors'],
    queryFn: contractApi.listPartnerInspectors,
  });
}

export function usePartnerDrones() {
  return useQuery({
    queryKey: [...contractQueryKeys.partners(), 'drones'],
    queryFn: contractApi.listPartnerDrones,
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
