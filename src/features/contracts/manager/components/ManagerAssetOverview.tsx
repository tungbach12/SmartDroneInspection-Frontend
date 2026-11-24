import type { ServiceRequest } from '../../api/contractApi';
import { usePartnerDrones } from '../../hooks/useContracts';
import { RequestOverviewCard } from '../../shared/RequestOverviewCard';

interface ManagerAssetOverviewProps {
  request: ServiceRequest;
  effectiveStatus?: ServiceRequest['status'];
}

/**
 * Persistent asset/request context for the Manager detail screen. It delegates to the shared
 * role-aware overview card while resolving partner drone labels when needed.
 */
export function ManagerAssetOverview({ request, effectiveStatus }: ManagerAssetOverviewProps) {
  const missingDroneLabelId =
    request.occurrences.find((occurrence) => occurrence.droneId && !occurrence.droneLabel)?.droneId ??
    null;
  const dronesQuery = usePartnerDrones(Boolean(missingDroneLabelId));

  return (
    <RequestOverviewCard
      request={request}
      role="MANAGER"
      {...(effectiveStatus !== undefined ? { effectiveStatus } : {})}
      fallbackDrones={dronesQuery.data}
    />
  );
}
