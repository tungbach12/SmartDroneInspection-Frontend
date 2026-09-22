import { Alert, Button, CircularProgress, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { EmptyState } from './EmptyState';

interface QueryStateProps {
  isLoading: boolean;
  error?: unknown;
  empty?: ReactNode;
  isEmpty?: boolean;
  onRetry?: () => void;
  loadingLabel?: string;
  children: ReactNode;
}

export function QueryState({ isLoading, error, isEmpty, empty, onRetry, loadingLabel = 'Loading records…', children }: QueryStateProps) {
  if (isLoading) {
    return (
      <Stack spacing={1.5} sx={{ alignItems: 'center', py: 8 }}>
        <CircularProgress size={28} aria-label={loadingLabel} />
        <Typography variant="body2" color="text.secondary">{loadingLabel}</Typography>
      </Stack>
    );
  }

  if (error) {
    return (
      <Alert
        severity="error"
        action={onRetry ? <Button color="inherit" size="small" onClick={onRetry}>Try again</Button> : undefined}
      >
        We could not load this information. Please try again.
      </Alert>
    );
  }

  if (isEmpty) {
    return (
      empty ?? (
        <EmptyState />
      )
    );
  }

  return <>{children}</>;
}
