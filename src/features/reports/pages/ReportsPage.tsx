import { Navigate, useLocation } from 'react-router-dom';
import { getSectionPath, PORTAL_IDS, type PortalId } from '@/app/permissions/accessPolicy';

/**
 * The report queue is the `?view=reports` filtered view of the inspections list, so saved
 * `/reports` links redirect there instead of rendering a second list.
 */
export default function ReportsPage() {
  const location = useLocation();
  const portal = (location.pathname.split('/').filter(Boolean)[0] ??
    PORTAL_IDS[0]) as PortalId;

  return <Navigate to={`${getSectionPath(portal, 'inspections')}?view=reports`} replace />;
}
