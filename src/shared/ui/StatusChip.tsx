import { Chip } from '@mui/material';
import type { ChipProps } from '@mui/material';

type StatusVariant = 'success' | 'warning' | 'error' | 'info' | 'default';

const STATUS_COLORS: Record<string, StatusVariant> = {
  active: 'success',
  approved: 'success',
  completed: 'success',
  closed: 'success',
  pending: 'warning',
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
    />
  );
}
