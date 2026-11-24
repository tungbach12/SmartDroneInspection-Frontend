import { Box, Paper, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { GlassIconBadge, GlassInboxIcon } from './GradientGlassIcons';

interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({
  title = 'Nothing here yet',
  description = 'There are no records to show right now.',
  action,
}: EmptyStateProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        px: { xs: 2.5, sm: 4 },
        py: { xs: 4, sm: 5 },
        textAlign: 'center',
        borderStyle: 'dashed',
        bgcolor: 'transparent',
      }}
    >
      <Stack spacing={1.25} sx={{ alignItems: 'center' }}>
        <GlassIconBadge size={44} borderRadius="12px" tone="blue">
          <GlassInboxIcon size={21} />
        </GlassIconBadge>
        <Typography variant="h6">{title}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 440 }}>
          {description}
        </Typography>
        {action && <Box sx={{ mt: 0.75 }}>{action}</Box>}
      </Stack>
    </Paper>
  );
}
