import type {
  FlightPermitVerificationStatus,
  InspectionDetail,
  InspectionListItem,
  InspectionStatus,
  InspectionWorkflowState,
} from '../api/inspectionApi';

export type InspectionRoleView = 'inspector' | 'manager' | 'customer';

const FLIGHT_STARTED_STATUSES: readonly string[] = [
  'IN_PROGRESS',
  'FIELD_COMPLETED',
  'UNDER_REVIEW',
  'COMPLETED',
];

export function resolveFlightPermitVerificationStatus(
  inspection?: Pick<
    InspectionDetail,
    'flightPermitFileName' | 'flightPermitVerificationStatus'
  > | null,
  workflowState?: Pick<InspectionWorkflowState, 'flightPermitVerificationStatus'> | null,
): FlightPermitVerificationStatus {
  const explicit =
    inspection?.flightPermitVerificationStatus ??
    workflowState?.flightPermitVerificationStatus;
  if (explicit) {
    return explicit;
  }
  return inspection?.flightPermitFileName ? 'APPROVED' : 'NOT_UPLOADED';
}

export function isFlightPermitVerified(
  inspection?: Pick<
    InspectionDetail,
    'status' | 'flightPermitFileName' | 'flightPermitVerificationStatus'
  > | null,
  workflowState?: Pick<
    InspectionWorkflowState,
    'status' | 'flightPermitVerificationStatus'
  > | null,
): boolean {
  const status = workflowState?.status ?? inspection?.status ?? '';
  if (FLIGHT_STARTED_STATUSES.includes(status)) {
    return true;
  }
  return resolveFlightPermitVerificationStatus(inspection, workflowState) === 'APPROVED';
}

export interface OverviewStageGuidance {
  tip: string;
  actionLabel: string;
  subpath: string;
}

/**
 * Resolves the target step route (`permit`, `pre-flight`, `field-session`, `post-flight`,
 * `evidence`, `findings`, `report`, `audit`, `review`, `settlement`, `tracking`)
 * for an inspection list item based on the active portal role.
 */
export function resolveInitialStepForRow(
  row: Partial<InspectionListItem> | undefined | null,
  roleView: InspectionRoleView,
  options?: {
    isReportsQueue?: boolean;
    resolvedReportAccepted?: boolean;
    resolvedPaymentStatus?: string;
  },
): string {
  const isReportsQueue = Boolean(options?.isReportsQueue);

  if (roleView === 'manager') {
    if (row?.reportStatus === 'PUBLISHED' || row?.status === 'COMPLETED') {
      return 'settlement';
    }
    if (
      !isReportsQueue &&
      (row?.status === 'SCHEDULED' || row?.status === 'IN_PROGRESS')
    ) {
      return 'audit';
    }
    return 'review';
  }

  if (roleView === 'customer') {
    if (isReportsQueue) {
      if (row?.reportStatus === 'PUBLISHED') {
        return 'report';
      }
      return 'review';
    }

    if (row?.reportStatus !== 'PUBLISHED') {
      return 'tracking';
    }
    const accepted = options?.resolvedReportAccepted ?? Boolean(row?.reportAccepted);
    if (!accepted) {
      return 'report';
    }
    const paymentStatus = options?.resolvedPaymentStatus ?? row?.paymentStatus;
    if (paymentStatus !== 'PAID') {
      return 'settlement';
    }
    return 'settlement';
  }

  // Inspector ('operations' portal)
  if (
    row?.reportStatus === 'PUBLISHED' ||
    row?.reportStatus === 'SUBMITTED' ||
    row?.reportStatus === 'RETURNED' ||
    row?.status === 'UNDER_REVIEW' ||
    row?.status === 'COMPLETED'
  ) {
    return 'report';
  }
  if (row?.status === 'FIELD_COMPLETED') {
    if (row?.reportId) {
      return 'report';
    }
    return 'evidence';
  }
  if (row?.status === 'IN_PROGRESS') {
    return 'field-session';
  }
  return 'permit';
}

/**
 * Resolves the compact `Step X/Y · Label` subtitle for table rows across all 3 roles.
 */
export function resolveRowStageSubtitle(
  row: Partial<InspectionListItem>,
  roleView: InspectionRoleView,
  options?: {
    resolvedReportAccepted?: boolean;
    resolvedPaymentStatus?: string;
  },
): string {
  if (roleView === 'manager') {
    if (row.reportStatus === 'PUBLISHED' || row.status === 'COMPLETED') {
      return row.paymentStatus === 'PAID'
        ? 'Step 3/3 · Settled'
        : 'Step 3/3 · Commission & Settlement';
    }
    if (row.status === 'UNDER_REVIEW' || row.reportStatus === 'SUBMITTED') {
      return `Step 2/3 · Report Decision${row.reportVersionNo ? ` · v${row.reportVersionNo}` : ''}`;
    }
    if (row.reportStatus === 'RETURNED') {
      return 'Step 2/3 · Returned for Revision';
    }
    if (row.pendingAction === 'PERMIT_REVIEW') {
      return 'Step 1/3 · Permit Review Due';
    }
    return 'Step 1/3 · Field & Evidence Audit';
  }

  if (roleView === 'customer') {
    const total = 3;
    const isPublished = row.reportStatus === 'PUBLISHED';
    if (!isPublished) {
      return `Step 1/${total} · In progress`;
    }
    const accepted = options?.resolvedReportAccepted ?? Boolean(row.reportAccepted);
    if (!accepted) {
      return `Step 2/${total} · Report ready · v${row.reportVersionNo ?? 1}`;
    }
    return `Step 3/${total} · Settled`;
  }

  // Inspector
  const total = 7;
  if (row.reportStatus === 'PUBLISHED' || row.status === 'COMPLETED') {
    return `Step ${total}/${total} · Published`;
  }
  if (row.status === 'UNDER_REVIEW' || row.reportStatus === 'SUBMITTED') {
    return `Step ${total}/${total} · Under Review`;
  }
  if (row.reportStatus === 'RETURNED') {
    return `Step ${total}/${total} · Revision`;
  }
  if (row.status === 'FIELD_COMPLETED') {
    if (row.reportId) {
      return `Step ${total}/${total} · Draft Report`;
    }
    return `Step 5/${total} · Evidence & AI`;
  }
  if (row.status === 'IN_PROGRESS') {
    return `Step 3/${total} · Flight Operation`;
  }
  return `Step 1/${total} · Permit & Pre-flight`;
}

/**
 * Resolves role-specific workflow guidance and CTA destination for the Overview dialog.
 */
export function resolveOverviewGuidance(
  inspection: Pick<
    InspectionDetail,
    'status' | 'flightPermitFileName' | 'flightPermitVerificationStatus'
  >,
  roleView: InspectionRoleView,
  t: (key: string) => string,
): OverviewStageGuidance {
  const status: InspectionStatus = inspection.status;
  const permitStatus = resolveFlightPermitVerificationStatus(inspection);

  if (roleView === 'manager') {
    switch (status) {
      case 'SCHEDULED':
        if (permitStatus === 'PENDING_REVIEW') {
          return {
            tip: t('Flight permit submitted and awaiting your verification before flight takeoff.'),
            actionLabel: t('Verify flight permit'),
            subpath: 'audit',
          };
        }
        return {
          tip: t('Field mission and evidence capture phase. Audit flight permit, telemetry, and captured evidence.'),
          actionLabel: t('Open field & evidence audit'),
          subpath: 'audit',
        };
      case 'IN_PROGRESS':
      case 'FIELD_COMPLETED':
        return {
          tip: t('Field mission and evidence capture phase. Audit flight permit, telemetry, and captured evidence.'),
          actionLabel: t('Open field & evidence audit'),
          subpath: 'audit',
        };
      case 'UNDER_REVIEW':
        return {
          tip: t('Report submitted. Review the submitted report, record a decision, and publish approved versions.'),
          actionLabel: t('Review submitted report'),
          subpath: 'review',
        };
      case 'COMPLETED':
        return {
          tip: t('Inspection report is officially published. Review platform commission and partner payout settlement.'),
          actionLabel: t('Open commission & settlement'),
          subpath: 'settlement',
        };
      default:
        return {
          tip: `${t('Inspection is in status')}: ${status}`,
          actionLabel: t('Open inspection workspace'),
          subpath: 'audit',
        };
    }
  }

  if (roleView === 'customer') {
    switch (status) {
      case 'COMPLETED':
        return {
          tip: t('Inspection report is officially published. Review deliverable, accept findings, or settle payment.'),
          actionLabel: t('View published report'),
          subpath: 'report',
        };
      default:
        return {
          tip: t('Drone inspection is actively progressing. Track flight schedule, field execution, and report preparation.'),
          actionLabel: t('Track inspection progress'),
          subpath: 'tracking',
        };
    }
  }

  // Inspector
  switch (status) {
    case 'SCHEDULED':
      if (permitStatus === 'APPROVED') {
        return {
          tip: t('Flight permit verified by Platform Manager. Complete the pre-flight safety checklist to start flight operation.'),
          actionLabel: t('Open pre-flight check'),
          subpath: 'pre-flight',
        };
      }
      if (permitStatus === 'PENDING_REVIEW') {
        return {
          tip: t('Flight permit uploaded and awaiting Platform Manager verification before pre-flight checks can begin.'),
          actionLabel: t('Review permit status'),
          subpath: 'permit',
        };
      }
      if (permitStatus === 'REJECTED') {
        return {
          tip: t('Flight permit was rejected by the Platform Manager. Upload a corrected permit to unlock pre-flight checks.'),
          actionLabel: t('Upload replacement permit'),
          subpath: 'permit',
        };
      }
      return {
        tip: t('This inspection is scheduled. Upload the regulatory flight permit and submit it for manager verification.'),
        actionLabel: t('Upload flight permit'),
        subpath: 'permit',
      };
    case 'IN_PROGRESS':
      return {
        tip: t('Flight operation is actively in progress. Monitor MAVLink telemetry or complete post-flight items.'),
        actionLabel: t('Open flight operation'),
        subpath: 'field-session',
      };
    case 'FIELD_COMPLETED':
      return {
        tip: t('Field flight completed. Upload captured drone evidence, review AI detections, confirm findings, and draft report.'),
        actionLabel: t('Review evidence & findings'),
        subpath: 'evidence',
      };
    case 'UNDER_REVIEW':
      return {
        tip: t('Report submitted. Awaiting Platform Manager review and publication.'),
        actionLabel: t('View submitted report'),
        subpath: 'report',
      };
    case 'COMPLETED':
      return {
        tip: t('Inspection report is officially published.'),
        actionLabel: t('View published report'),
        subpath: 'report',
      };
    default:
      return {
        tip: `${t('Inspection is in status')}: ${status}`,
        actionLabel: t('Open inspection workspace'),
        subpath: 'permit',
      };
  }
}
