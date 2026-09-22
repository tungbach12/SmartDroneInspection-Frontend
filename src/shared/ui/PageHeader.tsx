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
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, gap: 2, mb: layoutTokens.sectionGap }}>
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="h4">{title}</Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && <Box sx={{ display: 'flex', gap: 1, justifyContent: { xs: 'stretch', sm: 'flex-end' }, '& > *': { flex: { xs: 1, sm: 'initial' } } }}>{actions}</Box>}
    </Box>
  );
}
