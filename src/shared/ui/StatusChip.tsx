import { Box, Chip, type ChipProps } from '@mui/material';
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
    bg: '#ECFDF3',
    text: '#027A48',
    dot: '#12B76A',
    darkBg: 'rgba(16, 185, 129, 0.16)',
    darkText: '#6EE7B7',
    darkDot: '#34D399',
  },
  warning: {
    variant: 'warning',
    bg: '#FFFAEB',
    text: '#B54708',
    dot: '#F79009',
    darkBg: 'rgba(245, 158, 11, 0.16)',
    darkText: '#FCD34D',
    darkDot: '#FBBF24',
  },
  error: {
    variant: 'error',
    bg: '#FEF3F2',
    text: '#B42318',
    dot: '#F04438',
    darkBg: 'rgba(239, 68, 68, 0.16)',
    darkText: '#FCA5A5',
    darkDot: '#F87171',
  },
  info: {
    variant: 'info',
    bg: '#EFF8FF',
    text: '#175CD3',
    dot: '#2E90FA',
    darkBg: 'rgba(59, 130, 246, 0.16)',
    darkText: '#93C5FD',
    darkDot: '#60A5FA',
  },
  default: {
    variant: 'default',
    bg: '#F2F4F7',
    text: '#344054',
    dot: '#667085',
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
  author_verified: 'warning',
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

  draft: 'default',
  inactive: 'default',
  superseded: 'default',
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

  return (
    <Chip
      size={size}
      color={theme.variant}
      label={t(status)}
      icon={
        <Box
          component="span"
          sx={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            bgcolor: `${isDark ? theme.darkDot : theme.dot} !important`,
            ml: '9px !important',
            mr: '-4px !important',
          }}
        />
      }
      sx={{
        borderRadius: '9999px',
        bgcolor: `${isDark ? theme.darkBg : theme.bg} !important`,
        color: `${isDark ? theme.darkText : theme.text} !important`,
        fontWeight: 600,
        fontSize: size === 'medium' ? '13px' : '12px',
        border: 'none',
        height: size === 'medium' ? '28px' : '24px',
        letterSpacing: '0.01em',
        '& .MuiChip-label': {
          px: 1,
        },
      }}
    />
  );
}
