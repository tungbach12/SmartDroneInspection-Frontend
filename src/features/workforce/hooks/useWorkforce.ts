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
 * Provisions a workforce member.
 *
 * The response carries a one-time temporary password. TanStack Query records every resolved
 * mutation value in its MutationCache and keeps it there for `gcTime` after the last observer
 * detaches, so a provisioning result would otherwise outlive the dialog by minutes in memory.
 * `gcTime: 0` makes that retention zero, and the page also calls `reset()` when the one-time
 * surface closes. Neither path writes the response into the query cache, a store, or browser
 * storage.
 */
export function useProvisionWorkforceUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ProvisionWorkforceUserInput) => workforceApi.provisionUser(input),
    gcTime: 0,
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