import { useNavigate } from 'react-router-dom';
import {
  useClaimServiceRequest,
  useAdminReassignServiceRequest,
  useAdminUnassignServiceRequest,
  useServiceManagers,
} from '../hooks/useContracts';
import { useToastStore } from '@/shared/ui/Toast';
import { extractContractErrorText } from '../shared/contractStage';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { type ServiceRequest } from '../api/contractApi';
import { ServiceRequestListView } from '../shared/ServiceRequestListView';
import { ManagerRequestDetail } from './ManagerRequestDetail';

interface ManagerContractsViewProps {
  readonly isAdmin?: boolean;
  readonly requests: ServiceRequest[];
  readonly selectedRequestId: string;
  readonly currentRequest: ServiceRequest | undefined;
  readonly isSyncingSelected: boolean;
  readonly onSelectRequest: (requestId: string) => void;
  readonly onRefresh: () => void;
  readonly onError: (message: string) => void;
}

export function ManagerContractsView({
  isAdmin = false,
  requests,
  selectedRequestId,
  currentRequest,
  isSyncingSelected,
  onSelectRequest,
  onRefresh,
  onError,
}: ManagerContractsViewProps) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const claimRequest = useClaimServiceRequest();
  const reassignRequest = useAdminReassignServiceRequest();
  const unassignRequest = useAdminUnassignServiceRequest();
  const managers = useServiceManagers(isAdmin);
  const showToast = useToastStore((state) => state.showToast);

  const assign = async (requestId: string, managerId: string) => {
    try {
      await reassignRequest.mutateAsync({ requestId, managerId });
      onRefresh();
    } catch (error) {
      showToast(extractContractErrorText(error), 'error');
    }
  };

  const unassign = async (requestId: string) => {
    try {
      await unassignRequest.mutateAsync(requestId);
      onRefresh();
    } catch (error) {
      showToast(extractContractErrorText(error), 'error');
    }
  };

  const claim = async (requestId: string) => {
    try {
      await claimRequest.mutateAsync(requestId);
      onRefresh();
    } catch (error) {
      showToast(extractContractErrorText(error), 'error');
    }
  };

  if (!isAdmin && selectedRequestId && currentRequest?.assignedManagerId) {
    return (
      <ManagerRequestDetail
        request={currentRequest}
        isSyncing={isSyncingSelected}
        onBackToList={() => onSelectRequest('')}
        onChanged={onRefresh}
        onError={onError}
        onOpenInbox={(requestId) => navigate(`/manager/messages?requestId=${requestId}`)}
      />
    );
  }

  return (
    <ServiceRequestListView
      requests={requests}
      role="MANAGER"
      homePath="/manager/dashboard"
      emptyQueueMessage={t('No customer service requests are waiting in the queue.')}
      onSelectRequest={onSelectRequest}
      onClaimRequest={claim}
      claimPending={claimRequest.isPending}
      isAdmin={isAdmin}
      adminAssignees={managers.data ?? []}
      onAdminAssign={assign}
      onAdminReassign={assign}
      onAdminUnassign={unassign}
      canOpenDetails={(request) => !isAdmin && Boolean(request.assignedManagerId)}
      adminAssignmentPending={reassignRequest.isPending || unassignRequest.isPending}
    />
  );
}
