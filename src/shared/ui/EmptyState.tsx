import { InboxOutlined } from '@mui/icons-material';
import { Box, Paper, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';

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
    <Paper variant="outlined" sx={{ p: { xs: 3, sm: 5 }, textAlign: 'center', borderStyle: 'dashed' }}>
      <Stack spacing={1.25} sx={{ alignItems: 'center' }}>
        <Box sx={{ display: 'grid', placeItems: 'center', width: 48, height: 48, borderRadius: '50%', bgcolor: 'action.hover', color: 'text.secondary' }}>
          <InboxOutlined />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>{title}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 440 }}>{description}</Typography>
        {action && <Box sx={{ mt: 1 }}>{action}</Box>}
      </Stack>
    </Paper>
  );
}
