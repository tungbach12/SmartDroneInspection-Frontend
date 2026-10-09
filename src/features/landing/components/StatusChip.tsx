import { Box, Typography } from '@mui/material';

export type StatusType = 'pass' | 'warn' | 'fail' | 'active';

interface StatusChipProps {
  status: StatusType;
  label: string;
}

const statusColors: Record<StatusType, string> = {
  pass: '#176B52',
  warn: '#8C520B',
  fail: '#A8323B',
  active: '#087E8B',
};

export function StatusChip({ status, label }: StatusChipProps) {
  const dotColor = statusColors[status] || '#999999';

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        bgcolor: '#FFFFFF',
        borderRadius: '100px',
        px: '10px',
        py: '4px',
        gap: '6px',
        border: '1px solid rgba(23, 54, 74, 0.08)',
      }}
    >
      <Box
        sx={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          bgcolor: dotColor,
          flexShrink: 0,
        }}
      />
      <Typography
        component="span"
        sx={{
          fontFamily: '"Geist Mono", monospace',
          fontSize: '12px',
          lineHeight: 1,
          color: '#5D707B',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          fontWeight: 500,
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}
