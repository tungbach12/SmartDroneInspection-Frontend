import { Box, Pagination, Typography } from '@mui/material';
import { useLocale } from '@/shared/i18n/LocaleProvider';

export interface PaginationFooterProps {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (nextPage: number) => void;
  ariaLabel?: string;
}

/**
 * Standard NextAdmin pagination footer with range summary and rounded MUI Pagination controls.
 * Expects a 1-based `page`.
 */
export function PaginationFooter({
  page,
  pageSize,
  totalCount,
  onPageChange,
  ariaLabel,
}: PaginationFooterProps) {
  const { t } = useLocale();
  const totalPages = Math.max(1, Math.ceil(totalCount / Math.max(1, pageSize)));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = totalCount > 0 ? (safePage - 1) * pageSize + 1 : 0;
  const end = Math.min(safePage * pageSize, totalCount);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: { xs: 2, sm: 2.5 },
        py: 1.5,
        borderTop: '1px solid',
        borderColor: 'divider',
        flexWrap: 'wrap',
        gap: 1.5,
      }}
    >
      <Typography
        variant="body2"
        sx={{
          color: 'text.secondary',
          fontSize: '0.875rem',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {totalCount > 0
          ? `${t('Showing')} ${start}–${end} ${t('of')} ${totalCount}`
          : `${t('Showing')} 0 ${t('of')} 0`}
      </Typography>

      <Pagination
        count={totalPages}
        page={safePage}
        onChange={(_, nextPage) => onPageChange(nextPage)}
        shape="rounded"
        size="small"
        aria-label={ariaLabel ?? t('Pagination')}
        sx={{
          '& .MuiPaginationItem-root': {
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.8125rem',
            color: 'text.primary',
          },
          '& .MuiPaginationItem-page.Mui-selected': {
            bgcolor: 'primary.main',
            color: '#FFFFFF',
            '&:hover': { bgcolor: 'primary.dark' },
          },
          '& .MuiPaginationItem-previousNext': {
            border: '1px solid',
            borderColor: 'divider',
          },
        }}
      />
    </Box>
  );
}
