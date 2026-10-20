import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { useToastStore } from '@/shared/ui/Toast';
import {
  droneApi,
  droneKeys,
  type CreateDroneInput,
  type DroneDocumentStatus,
  type DroneServiceability,
  type UploadDroneDocumentInput,
} from '../api/droneApi';

export function useDrones() {
  return useQuery({
    queryKey: droneKeys.list(),
    queryFn: () => droneApi.list(),
  });
}

export function useDroneSelection() {
  return useQuery({
    queryKey: droneKeys.selection(),
    queryFn: () => droneApi.selection(),
  });
}

export function useDrone(id: string, enabled = true) {
  return useQuery({
    queryKey: droneKeys.detail(id),
    queryFn: () => droneApi.getById(id),
    enabled: enabled && Boolean(id),
  });
}

export function useDroneDocuments(id: string, enabled = true) {
  return useQuery({
    queryKey: droneKeys.documents(id),
    queryFn: () => droneApi.listDocuments(id),
    enabled: enabled && Boolean(id),
  });
}

export function useCreateDrone() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({
    mutationFn: (input: CreateDroneInput) => droneApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: droneKeys.all });
      showToast('Drone registered');
    },
  });
}

export function useUpdateDroneServiceability() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({
    mutationFn: ({
      id,
      serviceability,
    }: {
      id: string;
      serviceability: DroneServiceability;
    }) => droneApi.updateServiceability(id, { serviceability }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: droneKeys.all });
      void queryClient.invalidateQueries({
        queryKey: droneKeys.detail(variables.id),
      });
      showToast('Drone serviceability updated');
    },
  });
}

export function useUploadDroneDocument(droneId: string) {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const pendingFile = useRef<File | null>(null);
  const mutation = useMutation({
    mutationFn: (metadata: Omit<UploadDroneDocumentInput, 'file'>) => {
      const file = pendingFile.current;
      pendingFile.current = null;
      if (!file) throw new Error('Choose a document before uploading.');
      return droneApi.uploadDocument(droneId, { ...metadata, file });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: droneKeys.documents(droneId),
      });
      showToast('Drone document uploaded');
    },
    onSettled: () => {
      pendingFile.current = null;
    },
  });

  return {
    ...mutation,
    mutate: (
      input: UploadDroneDocumentInput,
      options?: Parameters<typeof mutation.mutate>[1],
    ) => {
      pendingFile.current = input.file;
      const { file: _file, ...metadata } = input;
      mutation.mutate(metadata, options);
    },
  };
}

export function useUpdateDroneDocumentStatus(droneId: string) {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  return useMutation({
    mutationFn: ({
      documentId,
      status,
    }: {
      documentId: string;
      status: DroneDocumentStatus;
    }) => droneApi.updateDocumentStatus(droneId, documentId, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: droneKeys.documents(droneId),
      });
      showToast('Drone document status updated');
    },
  });
}
