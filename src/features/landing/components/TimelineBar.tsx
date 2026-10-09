import { Box } from '@mui/material';

interface TimelineBarProps {
  leftPercent: number;
  widthPercent: number;
  active?: boolean;
}

export function TimelineBar({ leftPercent, widthPercent, active }: TimelineBarProps) {
  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '6px',
        bgcolor: 'rgba(23, 54, 74, 0.08)',
        borderRadius: '2px',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: `${leftPercent}%`,
          width: `${widthPercent}%`,
          bgcolor: active ? '#087E8B' : 'rgba(23, 54, 74, 0.14)',
          borderRadius: '2px',
          boxShadow: active ? '0 0 10px rgba(8, 126, 139, 0.25)' : 'none',
          transition: 'all 0.3s ease',
        }}
      />
    </Box>
  );
}
