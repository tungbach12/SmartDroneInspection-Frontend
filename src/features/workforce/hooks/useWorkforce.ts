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
 * The response carries a one-time temporary password, so it is returned to the caller and never
 * written into the query cache, a store, or browser storage — the page hands it straight to the
 * one-time result dialog and lets it go when that dialog closes.
 */
export function useProvisionWorkforceUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ProvisionWorkforceUserInput) => workforceApi.provisionUser(input),
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