import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '@/shared/ui/Toast';
import {
  platformUserApi,
  platformUserKeys,
  type CreatePlatformUserInput,
  type PlatformUserRole,
  type PlatformUserStatus,
  type UpdatePlatformUserRolesInput,
} from '../api/platformUserApi';
export function usePlatformUsers() {
  return useQuery({
    queryKey: platformUserKeys.all,
    queryFn: platformUserApi.list,
  });
}

export function useCreatePlatformUser() {
  const client = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);
  return useMutation({
    mutationFn: (input: CreatePlatformUserInput) => platformUserApi.create(input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: platformUserKeys.all });
      showToast('Account created');
    },
  });
}

export function useResetPlatformUserPassword() {
  const client = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);
  return useMutation({
    mutationFn: (userId: string) => platformUserApi.resetPassword(userId),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: platformUserKeys.all });
      showToast('Password reset; the account must set a new one at next sign-in');
    },
  });
}

export function useUpdatePlatformUserRoles() {
  const client = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);
  return useMutation({
    mutationFn: ({
      userId,
      input,
    }: {
      userId: string;
      input: UpdatePlatformUserRolesInput;
    }) => platformUserApi.updateRoles(userId, input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: platformUserKeys.all });
      showToast('Roles updated; the account signs in again to pick them up');
    },
  });
}

export function useUpdatePlatformUserStatus() {
  const client = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);
  return useMutation({
    mutationFn: ({
      userId,
      status,
    }: {
      userId: string;
      status: PlatformUserStatus;
    }) => platformUserApi.updateStatus(userId, { status }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: platformUserKeys.all });
      showToast('Account status updated');
    },
  });
}
export type { PlatformUserRole };
