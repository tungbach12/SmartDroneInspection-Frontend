import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  maintenanceApi,
  type CreateQuotationInput,
  type CreateTicketInput,
  type SubmitWorkLogInput,
} from '../api/maintenanceApi';

export const maintenanceKeys = {
  all: ['maintenance'] as const,
  tickets: () => [...maintenanceKeys.all, 'tickets'] as const,
  ticketDetail: (id: string) => [...maintenanceKeys.all, 'ticket', id] as const,
  quotations: (ticketId: string) => [...maintenanceKeys.all, 'quotations', ticketId] as const,
  orders: (ticketId: string) => [...maintenanceKeys.all, 'orders', ticketId] as const,
  workLogs: (ticketId: string) => [...maintenanceKeys.all, 'workLogs', ticketId] as const,
  myAssignments: () => [...maintenanceKeys.all, 'myAssignments'] as const,
};

export function useMaintenanceTickets() {
  return useQuery({
    queryKey: maintenanceKeys.tickets(),
    queryFn: () => maintenanceApi.listTickets(),
  });
}

export function useMaintenanceTicketDetail(id: string | null) {
  return useQuery({
    queryKey: maintenanceKeys.ticketDetail(id ?? ''),
    queryFn: () => maintenanceApi.getTicketDetail(id!),
    enabled: Boolean(id),
  });
}

export function useMaintenanceQuotations(ticketId: string | null) {
  return useQuery({
    queryKey: maintenanceKeys.quotations(ticketId ?? ''),
    queryFn: () => maintenanceApi.listQuotationsForTicket(ticketId!),
    enabled: Boolean(ticketId),
  });
}

export function useMaintenanceOrders(ticketId: string | null) {
  return useQuery({
    queryKey: maintenanceKeys.orders(ticketId ?? ''),
    queryFn: () => maintenanceApi.listOrdersForTicket(ticketId!),
    enabled: Boolean(ticketId),
  });
}

export function useMaintenanceWorkLogs(ticketId: string | null) {
  return useQuery({
    queryKey: maintenanceKeys.workLogs(ticketId ?? ''),
    queryFn: () => maintenanceApi.listWorkLogsForTicket(ticketId!),
    enabled: Boolean(ticketId),
  });
}

export function useMyMaintenanceAssignments(enabled = true) {
  return useQuery({
    queryKey: maintenanceKeys.myAssignments(),
    queryFn: () => maintenanceApi.listMyAssignments(),
    enabled,
  });
}

export function useCreateMaintenanceTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTicketInput) => maintenanceApi.createTicket(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.tickets() });
    },
  });
}

export function useCreateMaintenanceQuotation(ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateQuotationInput) => maintenanceApi.createQuotation(ticketId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.all });
    },
  });
}

export function useApproveMaintenanceQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => maintenanceApi.approveQuotation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.all });
    },
  });
}

export function useRejectMaintenanceQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      maintenanceApi.rejectQuotation(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.all });
    },
  });
}

export function useCreateMaintenanceOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (quotationId: string) => maintenanceApi.createOrder(quotationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.all });
    },
  });
}

export function useAcceptMaintenanceCompletion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => maintenanceApi.acceptCompletion(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.all });
    },
  });
}

export function useConfirmMaintenancePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, bankAccount, bankName }: { orderId: string; bankAccount: string; bankName: string }) =>
      maintenanceApi.confirmPayment(orderId, bankAccount, bankName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.all });
    },
  });
}

export function useAssignMaintenanceEngineer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, engineerUserId, deadline }: { orderId: string; engineerUserId: string; deadline?: string }) =>
      maintenanceApi.assignEngineer(orderId, engineerUserId, 'EXECUTION', deadline),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.all });
    },
  });
}

export function useUploadMaintenanceEvidence() {
  return useMutation({
    mutationFn: ({ orderId, kind, file }: { orderId: string; kind: 'BEFORE_MAINTENANCE' | 'AFTER_MAINTENANCE'; file: File }) =>
      maintenanceApi.uploadEvidence(orderId, kind, file),
  });
}

export function useSubmitMaintenanceWorkLog(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitWorkLogInput) => maintenanceApi.submitWorkLog(orderId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.all });
    },
  });
}

export function useVerifyMaintenanceWorkLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (workLogId: string) => maintenanceApi.verifyWorkLog(workLogId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.all });
    },
  });
}
