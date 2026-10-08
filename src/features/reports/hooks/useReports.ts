import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reportApi } from '../api/reportApi';

export const reportKeys = {
  all: ['reports'] as const,
  list: () => [...reportKeys.all, 'list'] as const,
  detail: (reportId: string) => [...reportKeys.all, 'detail', reportId] as const,
};

export function useReports() {
  return useQuery({ queryKey: reportKeys.list(), queryFn: reportApi.list });
}

function useReportMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<unknown>,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => client.invalidateQueries({ queryKey: reportKeys.all }),
  });
}

export function useCreateReportDraft() {
  return useReportMutation(reportApi.createDraft);
}

export function useCreateReportRevision() {
  return useReportMutation(reportApi.createRevision);
}

export function useSubmitReportForReview() {
  return useReportMutation(
    ({ reportId, versionId }: { reportId: string; versionId: string }) =>
      reportApi.submitForReview(reportId, versionId),
  );
}

export function useReleaseReport() {
  return useReportMutation(
    ({ reportId, versionId }: { reportId: string; versionId: string }) =>
      reportApi.release(reportId, versionId),
  );
}

export function useClientReportDecision() {
  return useReportMutation(
    ({
      reportId,
      versionId,
      decision,
      reason,
    }: {
      reportId: string;
      versionId: string;
      decision: 'ACCEPT' | 'REQUEST_REVISION';
      reason?: string;
    }) => reportApi.decide(reportId, versionId, decision, reason),
  );
}
