import { Box, Chip, type ChipProps } from '@mui/material';

type StatusVariant = 'success' | 'warning' | 'error' | 'info' | 'default';

interface ThemeInfo {
  variant: StatusVariant;
  bg: string;
  text: string;
  dot: string;
}

const THEMES: Record<StatusVariant, ThemeInfo> = {
  success: {
    variant: 'success',
    bg: '#ECFDF3',
    text: '#027A48',
    dot: '#12B76A',
  },
  warning: {
    variant: 'warning',
    bg: '#FFFAEB',
    text: '#B54708',
    dot: '#F79009',
  },
  error: {
    variant: 'error',
    bg: '#FEF3F2',
    text: '#B42318',
    dot: '#F04438',
  },
  info: {
    variant: 'info',
    bg: '#EFF8FF',
    text: '#175CD3',
    dot: '#2E90FA',
  },
  default: {
    variant: 'default',
    bg: '#F2F4F7',
    text: '#344054',
    dot: '#667085',
  },
};

const STATUS_MAP: Record<string, StatusVariant> = {
  active: 'success',
  approved: 'success',
  completed: 'success',
  closed: 'success',
  ready: 'success',
  published: 'success',

  pending: 'warning',
  pending_review: 'warning',
  repair_pending: 'warning',
  submitted: 'warning',
  author_verified: 'warning',
  inprogress: 'warning',
  in_progress: 'warning',
  preparing: 'warning',
  field_completed: 'warning',
  report_draft: 'warning',

  returned: 'error',
  cancelled: 'error',
  rejected: 'error',
  suspended: 'error',
  failed: 'error',

  scheduled: 'info',
  assigned: 'info',

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
  const normalized = status.toLowerCase().replace(/[\s-]/g, '_');
  const variant = STATUS_MAP[normalized] ?? 'default';
  const theme = THEMES[variant];

  return (
    <Chip
      size={size}
      color={theme.variant}
      label={status}
      icon={
        <Box
          component="span"
          sx={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            bgcolor: `${theme.dot} !important`,
            ml: '9px !important',
            mr: '-4px !important',
          }}
        />
      }
      sx={{
        borderRadius: '9999px',
        bgcolor: `${theme.bg} !important`,
        color: `${theme.text} !important`,
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
