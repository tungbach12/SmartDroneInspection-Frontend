import type { InspectionDetail, InspectionListItem, InspectionStatus } from '../api/inspectionApi';

export type InspectionRoleView = 'inspector' | 'manager' | 'customer';

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
  inspection: Pick<InspectionDetail, 'status' | 'flightPermitFileName'>,
  roleView: InspectionRoleView,
  t: (key: string) => string,
): OverviewStageGuidance {
  const status: InspectionStatus = inspection.status;

  if (roleView === 'manager') {
    switch (status) {
      case 'SCHEDULED':
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
      if (inspection.flightPermitFileName) {
        return {
          tip: t('Flight permit uploaded. Complete the pre-flight safety checklist to start flight operation.'),
          actionLabel: t('Open pre-flight check'),
          subpath: 'pre-flight',
        };
      }
      return {
        tip: t('This inspection is scheduled. Upload the regulatory flight permit to unlock pre-flight readiness.'),
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
