import { useRef } from 'react';
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
  // The ref is not part of mutation variables/data/cache. The page permits one in-flight provision
  // at a time, so only one transient credential can be held here.
  const oneTimeCredential = useRef<
    Awaited<ReturnType<typeof workforceApi.provisionUser>> | null
  >(null);

  return useMutation({
    mutationFn: async (input: ProvisionWorkforceUserInput) => {
      const provisioned = await workforceApi.provisionUser(input);
      oneTimeCredential.current = provisioned;
      return provisioned.user;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workforceKeys.all });
      if (!oneTimeCredential.current) return;
      try {
        onProvisioned(oneTimeCredential.current);
      } catch {
        // A local view callback must not turn a successful server create into a failed mutation
        // that invites an unsafe duplicate retry. The password reference is still cleared below.
      } finally {
        oneTimeCredential.current = null;
      }
    },
    onError: () => {
      // Do not retain a response if the request failed before the success callback.
      oneTimeCredential.current = null;
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