import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Paper, Stack } from '@mui/material';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import { useLocale } from '@/shared/i18n/LocaleProvider';

export interface StepActionBarProps {
  /** Relative route for the previous step link. */
  backTo?: string | undefined;
  /** Label shown on the back link (defaults to localized "Back"). */
  backLabel?: string | undefined;
  /** Optional status summary or acknowledgement control rendered on the left side. */
  leftSlot?: ReactNode;
  /** Optional secondary actions rendered before the primary action on the right. */
  secondaryActions?: ReactNode;
  /** Primary step-progression or submit action rendered on the right. */
  primaryAction?: ReactNode;
  /** Optional border highlight color (e.g. 'warning.main' when attention is required). */
  borderColor?: string;
}

/**
 * Consistent bottom/sticky action bar for multi-step inspection workspace pages (Steps 1-7).
 */
export function StepActionBar({
  backTo,
  backLabel,
  leftSlot,
  secondaryActions,
  primaryAction,
  borderColor = 'divider',
}: StepActionBarProps) {
  const { t } = useLocale();

  if (!backTo && !leftSlot && !secondaryActions && !primaryAction) {
    return null;
  }

  return (
    <Paper
      variant="outlined"
      className="trace-step-action-bar"
      sx={{
        p: { xs: 1.5, sm: 2 },
        borderRadius: '12px',
        borderColor,
        bgcolor: 'background.paper',
        boxShadow: 'none',
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{
          alignItems: { xs: 'stretch', sm: 'center' },
          justifyContent: 'space-between',
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.25}
          sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, minWidth: 0, flex: 1 }}
        >
          {backTo && (
            <Button
              component={RouterLink}
              to={backTo}
              variant="outlined"
              color="inherit"
              size="medium"
              startIcon={<ArrowBackRounded fontSize="small" />}
              sx={{
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 600,
                flexShrink: 0,
                borderColor: 'divider',
                color: 'text.secondary',
                '&:hover': {
                  color: 'text.primary',
                  borderColor: 'text.secondary',
                  bgcolor: 'action.hover',
                },
              }}
            >
              {backLabel ?? t('Back')}
            </Button>
          )}
          {leftSlot && <Box sx={{ minWidth: 0, flex: 1 }}>{leftSlot}</Box>}
        </Stack>

        {(secondaryActions || primaryAction) && (
          <Stack
            direction="row"
            spacing={1.25}
            sx={{
              alignItems: 'center',
              justifyContent: { xs: 'flex-end', sm: 'flex-end' },
              flexWrap: 'wrap',
              flexShrink: 0,
            }}
          >
            {secondaryActions}
            {primaryAction}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
