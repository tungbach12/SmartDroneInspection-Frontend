import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { layoutTokens } from '@/app/theme/tokens';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <Box
      component="header"
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'flex-end' },
        gap: { xs: 1.5, sm: 3 },
        mb: layoutTokens.sectionGap,
        pb: { xs: 2, sm: 2.5 },
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography
          component="h1"
          variant="h3"
          sx={{ color: 'text.primary', mb: subtitle ? 0.5 : 0 }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ maxWidth: 680 }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && (
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            justifyContent: { xs: 'stretch', sm: 'flex-end' },
            '& > *': { flex: { xs: 1, sm: 'initial' } },
          }}
        >
          {actions}
        </Box>
      )}
    </Box>
  );
}
