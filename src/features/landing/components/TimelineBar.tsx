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
        bgcolor: 'rgba(255, 255, 255, 0.06)',
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
          bgcolor: active ? '#52a8ff' : 'rgba(255, 255, 255, 0.18)',
          borderRadius: '2px',
          boxShadow: active ? '0 0 10px rgba(82, 168, 255, 0.5)' : 'none',
          transition: 'all 0.3s ease',
        }}
      />
    </Box>
  );
}
