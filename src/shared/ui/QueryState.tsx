import { Alert, Box, CircularProgress, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface QueryStateProps {
  isLoading: boolean;
  error?: unknown;
  empty?: ReactNode;
  isEmpty?: boolean;
  children: ReactNode;
}

export function QueryState({ isLoading, error, isEmpty, empty, children }: QueryStateProps) {
  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    const message = error instanceof Error ? error.message : 'Something went wrong';
    return <Alert severity="error">{message}</Alert>;
  }

  if (isEmpty) {
    return (
      empty ?? (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
          No data
        </Typography>
      )
    );
  }

  return <>{children}</>;
}
