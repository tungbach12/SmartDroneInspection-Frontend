import { Alert, Button, CircularProgress, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { EmptyState } from './EmptyState';
import { useLocale } from '@/shared/i18n/LocaleProvider';

interface QueryStateProps {
  isLoading: boolean;
  error?: unknown;
  empty?: ReactNode;
  isEmpty?: boolean;
  onRetry?: () => void;
  loadingLabel?: string;
  children: ReactNode;
}

export function QueryState({
  isLoading,
  error,
  isEmpty,
  empty,
  onRetry,
  loadingLabel = 'Loading records…',
  children,
}: QueryStateProps) {
  const { t } = useLocale();
  if (isLoading) {
    return (
      <Stack
        role="status"
        aria-live="polite"
        spacing={1.5}
        sx={{ alignItems: 'center', py: { xs: 6, md: 8 } }}
      >
        <CircularProgress size={26} aria-label={loadingLabel} />
        <Typography variant="body2" color="text.secondary">
          {loadingLabel}
        </Typography>
      </Stack>
    );
  }

  if (error) {
    return (
      <Alert
        severity="error"
        action={
          onRetry ? (
            <Button color="inherit" size="small" onClick={onRetry}>
              {t('Try again')}
            </Button>
          ) : undefined
        }
        sx={{ alignItems: 'center', borderRadius: 1.25 }}
      >
        {t('We could not load this information. Please try again.')}
      </Alert>
    );
  }

  if (isEmpty) {
    return empty ?? <EmptyState />;
  }

  return <>{children}</>;
}
