import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '@/shared/ui/Toast';
import { droneKeys } from '../api/droneApi';
import {
  droneLeaseApi,
  droneLeaseKeys,
  type CapturePayPalLeaseOrderInput,
  type ConfirmDroneLeasePaymentInput,
  type CreateDroneLeaseInput,
  type CreatePlatformDroneInput,
  type ReclaimDroneLeaseInput,
  type UpdatePlatformDroneStatusInput,
} from '../api/droneLeaseApi';

export function usePlatformDronePool() {
  return useQuery({
    queryKey: droneLeaseKeys.pool(),
    queryFn: droneLeaseApi.listPool,
  });
}

export function useCreatePlatformDrone() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);

  return useMutation({
    mutationFn: (input: CreatePlatformDroneInput) => droneLeaseApi.createPoolDrone(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: droneLeaseKeys.all });
      showToast('Platform drone added to leasable pool.', 'success');
    },
    onError: (err) => {
      showToast(err instanceof Error ? err.message : 'Failed to add platform drone', 'error');
    },
  });
}

export function useUpdatePlatformDroneStatus() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePlatformDroneStatusInput }) =>
      droneLeaseApi.updatePoolDroneStatus(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: droneLeaseKeys.all });
      showToast('Platform drone status updated.', 'success');
    },
    onError: (err) => {
      showToast(err instanceof Error ? err.message : 'Failed to update drone status', 'error');
    },
  });
}

export function usePlatformDroneLeases(statusFilter?: string) {
  return useQuery({
    queryKey: droneLeaseKeys.platformLeases(statusFilter),
    queryFn: () => droneLeaseApi.listPlatformLeases(statusFilter),
  });
}

export function useConfirmDroneLeasePayment() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);

  return useMutation({
    mutationFn: ({
      leaseId,
      input,
    }: {
      leaseId: string;
      input: ConfirmDroneLeasePaymentInput;
    }) => droneLeaseApi.confirmPayment(leaseId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: droneLeaseKeys.all });
      void queryClient.invalidateQueries({ queryKey: droneKeys.all });
      showToast('Lease payment confirmed and customer drone provisioned.', 'success');
    },
    onError: (err) => {
      showToast(err instanceof Error ? err.message : 'Failed to confirm lease payment', 'error');
    },
  });
}

export function useReclaimDroneLease() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);

  return useMutation({
    mutationFn: ({ leaseId, input }: { leaseId: string; input?: ReclaimDroneLeaseInput }) =>
      droneLeaseApi.reclaimLease(leaseId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: droneLeaseKeys.all });
      void queryClient.invalidateQueries({ queryKey: droneKeys.all });
      showToast('Drone lease reclaimed and returned to platform pool.', 'success');
    },
    onError: (err) => {
      showToast(err instanceof Error ? err.message : 'Failed to reclaim leased drone', 'error');
    },
  });
}

export function useAvailableLeasableDrones() {
  return useQuery({
    queryKey: droneLeaseKeys.availableDrones(),
    queryFn: droneLeaseApi.listAvailableDrones,
  });
}

export function useOrganizationDroneLeases() {
  return useQuery({
    queryKey: droneLeaseKeys.organizationLeases(),
    queryFn: droneLeaseApi.listOrganizationLeases,
  });
}

export function useRequestDroneLease() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);

  return useMutation({
    mutationFn: (input: CreateDroneLeaseInput) => droneLeaseApi.requestLease(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: droneLeaseKeys.all });
      showToast(
        'Drone lease request created. Complete payment via PayPal or corporate wire transfer.',
        'success',
      );
    },
    onError: (err) => {
      showToast(err instanceof Error ? err.message : 'Failed to request drone lease', 'error');
    },
  });
}

export function useCreateDroneLeasePayPalOrder() {
  const showToast = useToastStore((s) => s.showToast);

  return useMutation({
    mutationFn: (leaseId: string) => droneLeaseApi.createPayPalOrder(leaseId),
    onError: (err) => {
      showToast(err instanceof Error ? err.message : 'Failed to create PayPal order', 'error');
    },
  });
}

export function useCaptureDroneLeasePayPalOrder() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);

  return useMutation({
    mutationFn: ({
      leaseId,
      input,
    }: {
      leaseId: string;
      input: CapturePayPalLeaseOrderInput;
    }) => droneLeaseApi.capturePayPalOrder(leaseId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: droneLeaseKeys.all });
      void queryClient.invalidateQueries({ queryKey: droneKeys.all });
      showToast('PayPal payment captured and leased drone provisioned to your fleet.', 'success');
    },
    onError: (err) => {
      showToast(err instanceof Error ? err.message : 'Failed to capture PayPal payment', 'error');
    },
  });
}
