import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { PageBreadcrumbs, type BreadcrumbItem } from './PageBreadcrumbs';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  breadcrumbs?: readonly BreadcrumbItem[];
}

export function PageHeader({ title, subtitle, actions, breadcrumbs }: PageHeaderProps) {
  return (
    <Box
      component="header"
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column-reverse', sm: 'row' },
        alignItems: { xs: 'flex-start', sm: 'center' },
        justifyContent: 'space-between',
        gap: { xs: 1.5, sm: 2 },
        mb: 3,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography
          component="h1"
          sx={{
            fontSize: '1.625rem',
            fontWeight: 700,
            color: 'text.primary',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            variant="body2"
            sx={{
              color: '#71717A',
              fontSize: '0.875rem',
              fontWeight: 400,
              lineHeight: '1.25rem',
              mt: '4px',
              maxWidth: 680,
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
      {(actions || breadcrumbs) && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 1.5,
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: { xs: 'flex-start', sm: 'flex-end' },
            flexWrap: 'wrap',
            flexShrink: 0,
          }}
        >
          {breadcrumbs && <PageBreadcrumbs items={breadcrumbs} sx={{ mb: 0 }} />}
          {actions && (
            <Box
              sx={{
                display: 'flex',
                gap: 1.5,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              {actions}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
