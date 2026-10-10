import { Chip } from '@mui/material';
import type { ChipProps } from '@mui/material';
import { layoutTokens } from '@/app/theme/tokens';

type StatusVariant = 'success' | 'warning' | 'error' | 'info' | 'default';

const STATUS_COLORS: Record<string, StatusVariant> = {
  active: 'success',
  approved: 'success',
  completed: 'success',
  closed: 'success',
  pending: 'warning',
  pending_review: 'warning',
  // MF2 preparation. Submitted work is waiting on a reviewer, returned work needs rework, and a
  // reviewed preparation is the only one of the three that has a decision behind it.
  submitted: 'warning',
  returned: 'error',
  ready: 'success',
  inprogress: 'warning',
  in_progress: 'warning',
  scheduled: 'info',
  assigned: 'info',
  draft: 'default',
  cancelled: 'error',
  rejected: 'error',
  failed: 'error',
};

interface StatusChipProps {
  status: string;
  size?: ChipProps['size'];
}

export function StatusChip({ status, size }: StatusChipProps) {
  const normalized = status.toLowerCase().replace(/[\s-]/g, '_');
  const color = STATUS_COLORS[normalized] ?? 'default';

  return (
    <Chip
      label={status}
      color={color}
      size={size ?? 'small'}
      variant={color === 'default' ? 'outlined' : 'filled'}
      sx={{
        borderRadius: layoutTokens.controlRadius,
        fontWeight: 600,
        textTransform: 'capitalize',
      }}
    />
  );
}
