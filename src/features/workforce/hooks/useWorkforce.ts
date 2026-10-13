import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '@/shared/ui/Toast';
import {
  workforceApi,
  workforceKeys,
  type ProvisionWorkforceUserInput,
  type UpdateWorkforceUserRolesInput,
  type UpdateWorkforceUserStatusInput,
} from '../api/workforceApi';

export function useWorkforceUsers() {
  return useQuery({
    queryKey: workforceKeys.users(),
    queryFn: () => workforceApi.listUsers(),
  });
}

/**
 * Provisions a workforce member without returning the one-time password through TanStack's
 * mutation result. The password bypasses the result entirely and travels only through the caller's
 * page-local success callback; MutationCache retains only the safe user projection.
 */
export function useProvisionWorkforceUser(
  onProvisioned: (credential: Awaited<ReturnType<typeof workforceApi.provisionUser>>) => void,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ProvisionWorkforceUserInput) => {
      const provisioned = await workforceApi.provisionUser(input);
      onProvisioned(provisioned);
      return provisioned.user;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workforceKeys.all });
    },
  });
}

export function useUpdateWorkforceUserStatus() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);

  return useMutation({
    mutationFn: ({
      userId,
      status,
    }: {
      userId: string;
      status: UpdateWorkforceUserStatusInput['status'];
    }) => workforceApi.updateUserStatus(userId, { status }),
    onSuccess: (user) => {
      void queryClient.invalidateQueries({ queryKey: workforceKeys.all });
      showToast(`${user.fullName} is now ${user.status.toLowerCase()}`);
    },
  });
}

export function useUpdateWorkforceUserRoles() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);

  return useMutation({
    mutationFn: ({
      userId,
      roles,
    }: {
      userId: string;
      roles: UpdateWorkforceUserRolesInput['roles'];
    }) => workforceApi.updateUserRoles(userId, { roles }),
    onSuccess: (user) => {
      void queryClient.invalidateQueries({ queryKey: workforceKeys.all });
      showToast(`Roles updated for ${user.fullName}`);
    },
  });
}