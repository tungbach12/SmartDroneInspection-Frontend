import { Chip, type ChipProps } from '@mui/material';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { useIsDarkMode } from '@/app/layouts/ColorModeContext';

type StatusVariant = 'success' | 'warning' | 'error' | 'info' | 'default';

interface ThemeInfo {
  variant: StatusVariant;
  bg: string;
  text: string;
  dot: string;
  darkBg: string;
  darkText: string;
  darkDot: string;
}

const THEMES: Record<StatusVariant, ThemeInfo> = {
  success: {
    variant: 'success',
    bg: '#F0FDF4',
    text: '#15803D',
    dot: '#16A34A',
    darkBg: 'rgba(16, 185, 129, 0.16)',
    darkText: '#6EE7B7',
    darkDot: '#34D399',
  },
  warning: {
    variant: 'warning',
    bg: '#FFFBEB',
    text: '#B45309',
    dot: '#F59E0B',
    darkBg: 'rgba(245, 158, 11, 0.16)',
    darkText: '#FCD34D',
    darkDot: '#FBBF24',
  },
  error: {
    variant: 'error',
    bg: '#FEF2F2',
    text: '#B91C1C',
    dot: '#EF4444',
    darkBg: 'rgba(239, 68, 68, 0.16)',
    darkText: '#FCA5A5',
    darkDot: '#F87171',
  },
  info: {
    variant: 'info',
    bg: '#EFF3FF',
    text: '#3758F9',
    dot: '#3758F9',
    darkBg: 'rgba(59, 130, 246, 0.16)',
    darkText: '#93C5FD',
    darkDot: '#60A5FA',
  },
  default: {
    variant: 'default',
    bg: '#F4F4F5',
    text: '#374151',
    dot: '#71717A',
    darkBg: 'rgba(148, 163, 184, 0.16)',
    darkText: '#CBD5E1',
    darkDot: '#94A3B8',
  },
};

const STATUS_MAP: Record<string, StatusVariant> = {
  active: 'success',
  approved: 'success',
  accepted: 'success',
  cost_reconciled: 'success',
  verified: 'success',
  completed: 'success',
  closed: 'success',
  ready: 'success',
  published: 'success',

  pending: 'warning',
  pending_review: 'warning',
  awaiting_approval: 'warning',
  submitted_for_acceptance: 'warning',
  reinspection_required: 'warning',
  paused_for_change: 'warning',
  proposed: 'warning',
  repair_pending: 'warning',
  submitted: 'warning',
  inprogress: 'warning',
  in_progress: 'warning',
  preparing: 'warning',
  field_completed: 'warning',
  report_draft: 'warning',
  under_review: 'info',
  reschedule_required: 'warning',

  returned: 'error',
  rework_required: 'error',
  cancelled: 'error',
  aborted: 'error',
  rejected: 'error',
  suspended: 'error',
  failed: 'error',

  scheduled: 'info',
  assigned: 'info',
  ready_for_flight: 'info',
  planned: 'info',
  work_completed: 'info',

  inactive: 'default',
  superseded: 'default',
};

const STATUS_LABELS: Record<string, string> = {
  in_progress: 'In Progress',
  field_completed: 'Field Completed',
  under_review: 'Under Review',
  pending_review: 'Pending Review',
  ready_for_flight: 'Ready for Flight',
  report_draft: 'Report Draft',
  reschedule_required: 'Reschedule Required',
  cost_reconciled: 'Cost Reconciled',
  submitted_for_acceptance: 'Submitted for Acceptance',
  reinspection_required: 'Re-inspection Required',
  paused_for_change: 'Paused for Change',
  repair_pending: 'Repair Pending',
  rework_required: 'Rework Required',
  work_completed: 'Work Completed',
  scheduled: 'Scheduled',
  completed: 'Completed',
  published: 'Published',
  submitted: 'Submitted',
  returned: 'Returned',
  aborted: 'Aborted',
  cancelled: 'Cancelled',
  draft: 'Draft',
  closed: 'Closed',
};

export interface StatusChipProps {
  status: string;
  size?: ChipProps['size'];
}

/**
 * Modern status pill with a colored dot indicator, matching the Lytic dashboard design reference.
 * Wraps MUI Chip to preserve class names and accessibility in tests.
 */
export function StatusChip({ status, size = 'small' }: StatusChipProps) {
  const { t } = useLocale();
  const isDark = useIsDarkMode();
  const normalized = status.toLowerCase().replace(/[\s-]/g, '_');
  const variant = STATUS_MAP[normalized] ?? 'default';
  const theme = THEMES[variant];
  const displayLabel = STATUS_LABELS[normalized] ?? status;

  return (
    <Chip
      size={size}
      color={theme.variant}
      label={t(displayLabel)}
      data-status={status}
      sx={{
        borderRadius: '6px',
        bgcolor: `${isDark ? theme.darkBg : theme.bg} !important`,
        color: `${isDark ? theme.darkText : theme.text} !important`,
        fontWeight: 500,
        fontSize: size === 'medium' ? '13px' : '12px',
        border: 'none',
        height: size === 'medium' ? '28px' : '24px',
        letterSpacing: '0.01em',
        '& .MuiChip-label': {
          px: 1.25,
        },
      }}
    />
  );
}
