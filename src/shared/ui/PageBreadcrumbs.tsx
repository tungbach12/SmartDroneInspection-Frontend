import { Box, Typography, type SxProps, type Theme } from '@mui/material';
import { useInRouterContext, useNavigate } from 'react-router-dom';
import { useLocale } from '@/shared/i18n/LocaleProvider';

export interface BreadcrumbItem {
  label: string;
  to?: string;
  onClick?: () => void;
}

export interface PageBreadcrumbsProps {
  items: readonly BreadcrumbItem[];
  sx?: SxProps<Theme>;
}

function RouterBreadcrumbLink({ item }: { item: BreadcrumbItem }) {
  const navigate = useNavigate();

  return (
    <Box
      component="a"
      href={item.to}
      onClick={(e) => {
        if (item.onClick) {
          item.onClick();
          return;
        }
        if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey && e.button === 0) {
          e.preventDefault();
          navigate(item.to!);
        }
      }}
      sx={{
        fontSize: '0.875rem',
        fontWeight: 500,
        color: 'text.secondary',
        textDecoration: 'none',
        '&:hover': { color: 'primary.main' },
      }}
    >
      {item.label}
    </Box>
  );
}

function FallbackBreadcrumbLink({ item }: { item: BreadcrumbItem }) {
  return (
    <Box
      component="a"
      href={item.to}
      onClick={(e) => {
        if (item.onClick) {
          item.onClick();
          return;
        }
        if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey && e.button === 0) {
          e.preventDefault();
          window.history.pushState({}, '', item.to);
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      }}
      sx={{
        fontSize: '0.875rem',
        fontWeight: 500,
        color: 'text.secondary',
        textDecoration: 'none',
        '&:hover': { color: 'primary.main' },
      }}
    >
      {item.label}
    </Box>
  );
}

function BreadcrumbLink({ item }: { item: BreadcrumbItem }) {
  const inRouter = useInRouterContext();

  if (inRouter) {
    return <RouterBreadcrumbLink item={item} />;
  }
  return <FallbackBreadcrumbLink item={item} />;
}

export function PageBreadcrumbs({ items, sx }: PageBreadcrumbsProps) {
  const { t } = useLocale();

  return (
    <Box
      component="nav"
      aria-label={t('Breadcrumb')}
      sx={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 0.75,
        mb: 1,
        ...sx,
      }}
    >
      <Box
        component="ol"
        sx={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 0.75,
          listStyle: 'none',
          m: 0,
          p: 0,
          fontSize: '0.875rem',
          fontWeight: 500,
        }}
      >
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <Box
              component="li"
              key={`${item.label}-${idx}`}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
                minWidth: 0,
              }}
            >
              {idx > 0 && (
                <Box
                  component="svg"
                  width={16}
                  height={16}
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  sx={{ color: 'text.secondary', flexShrink: 0 }}
                >
                  <path
                    d="M9.62 18.25L15.87 12L9.62 5.75"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Box>
              )}

              {isLast ? (
                <Typography
                  component="span"
                  aria-current="page"
                  noWrap
                  sx={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'text.primary',
                    maxWidth: { xs: 200, sm: 340 },
                  }}
                >
                  {item.label}
                </Typography>
              ) : item.to ? (
                <BreadcrumbLink item={item} />
              ) : item.onClick ? (
                <Box
                  component="button"
                  type="button"
                  onClick={item.onClick}
                  sx={{
                    border: 0,
                    bgcolor: 'transparent',
                    p: 0,
                    font: 'inherit',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: 'text.secondary',
                    cursor: 'pointer',
                    '&:hover': { color: 'primary.main' },
                  }}
                >
                  {item.label}
                </Box>
              ) : (
                <Typography
                  component="span"
                  sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'text.secondary' }}
                >
                  {item.label}
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
