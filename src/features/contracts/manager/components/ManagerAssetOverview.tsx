import type { ServiceRequest } from '../../api/contractApi';
import { RequestOverviewCard } from '../../shared/RequestOverviewCard';

interface ManagerAssetOverviewProps {
  request: ServiceRequest;
  effectiveStatus?: ServiceRequest['status'];
}

/**
 * Persistent asset/request context for the Manager detail screen, delegating to the shared
 * role-aware overview card.
 */
export function ManagerAssetOverview({ request, effectiveStatus }: ManagerAssetOverviewProps) {
  return (
    <RequestOverviewCard
      request={request}
      role="MANAGER"
      {...(effectiveStatus !== undefined ? { effectiveStatus } : {})}
    />
  );
}
