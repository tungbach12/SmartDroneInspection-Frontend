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
        <Box
          aria-hidden="true"
          sx={{
            display: 'grid',
            placeItems: 'center',
            width: 42,
            height: 42,
            borderRadius: 1.25,
            bgcolor: 'action.hover',
            color: 'text.secondary',
          }}
        >
          <InboxOutlined fontSize="small" />
        </Box>
        <Typography variant="h6">{title}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 440 }}>
          {description}
        </Typography>
        {action && <Box sx={{ mt: 0.75 }}>{action}</Box>}
      </Stack>
    </Paper>
  );
}
