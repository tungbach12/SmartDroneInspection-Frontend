import { useMemo, useState, type ReactNode } from 'react';
import {
  Box,
  Button,
  InputAdornment,
  Pagination,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useLocale } from '@/shared/i18n/LocaleProvider';

export interface DataTableColumn<T> {
  id: string;
  label: string;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number | null | undefined;
  width?: string | number;
  align?: 'left' | 'right' | 'center';
  noWrap?: boolean;
}

interface DataTableProps<T> {
  title?: string;
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchPredicate?: (row: T, query: string) => boolean;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  emptyContent?: ReactNode;
  actions?: ReactNode;
  dense?: boolean;
  maxHeight?: number | string;
  stickyHeader?: boolean;
}

export function DataTable<T>({
  title,
  columns,
  rows,
  rowKey,
  searchable = false,
  searchPlaceholder = 'Search…',
  searchPredicate,
  onRowClick,
  emptyMessage = 'No records found',
  emptyContent,
  actions,
  dense = false,
  maxHeight,
  stickyHeader = false,
}: DataTableProps<T>) {
  const { t } = useLocale();
  const [page, setPage] = useState(0);
  const rowsPerPage = 10;
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const normalizedQuery = query.trim().toLowerCase();

  const filtered = searchable && normalizedQuery && searchPredicate
    ? rows.filter((row) => searchPredicate(row, normalizedQuery))
    : rows;

  const sorted = useMemo(() => {
    if (!sortBy) return filtered;
    const col = columns.find((c) => c.id === sortBy);
    if (!col?.sortValue) return filtered;
    const extract = col.sortValue;
    return [...filtered].sort((a, b) => {
      const av = extract(a) ?? '';
      const bv = extract(b) ?? '';
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv), undefined, { sensitivity: 'base' });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [columns, filtered, sortBy, sortDir]);

  const maxPage = Math.max(0, Math.ceil(sorted.length / rowsPerPage) - 1);
  const safePage = Math.min(page, maxPage);
  const paged = sorted.slice(safePage * rowsPerPage, safePage * rowsPerPage + rowsPerPage);

  const toggleSort = (columnId: string) => {
    if (sortBy === columnId) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(columnId);
      setSortDir('asc');
    }
    setPage(0);
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        overflow: 'hidden',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '10px',
        boxShadow: 'none',
      }}
    >
      {(title || searchable || actions) && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: { xs: 2, sm: 2.5 },
            py: 2,
            flexWrap: 'wrap',
            gap: 1.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          {searchable ? (
            <TextField
              size="small"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(0);
              }}
              slotProps={{
                htmlInput: { 'aria-label': searchPlaceholder },
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                  endAdornment: normalizedQuery ? (
                    <InputAdornment position="end">
                      <Button
                        size="small"
                        color="inherit"
                        aria-label={t('Clear search')}
                        onClick={() => {
                          setQuery('');
                          setPage(0);
                        }}
                        sx={{ minWidth: 0, p: 0.25, fontSize: '1rem', lineHeight: 1, color: 'text.secondary' }}
                      >
                        ×
                      </Button>
                    </InputAdornment>
                  ) : undefined,
                },
              }}
              sx={{
                width: { xs: '100%', sm: 280, md: 320 },
                '& .MuiOutlinedInput-root': {
                  height: 40,
                  borderRadius: '8px',
                  bgcolor: 'background.paper',
                  fontSize: '0.875rem',
                },
              }}
            />
          ) : title ? (
            <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: 'text.primary' }}>
              {title}
            </Typography>
          ) : (
            <Box />
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
            {actions}
          </Box>
        </Box>
      )}

      <TableContainer
        sx={{
          overflowX: 'auto',
          maxHeight: maxHeight,
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': { height: 6, width: 6 },
          '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 3 },
        }}
      >
        <Table aria-label={title ?? 'Data table'} stickyHeader={stickyHeader || Boolean(maxHeight)} size={dense ? 'small' : 'medium'}>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  width={column.width}
                  align={column.align}
                  sortDirection={sortBy === column.id ? sortDir : false}
                  sx={{
                    bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#F9FAFB'),
                    color: 'text.secondary',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                    py: dense ? 1 : 1.25,
                    px: dense ? 1.5 : 2,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    whiteSpace: column.noWrap ? 'nowrap' : 'normal',
                  }}
                >
                  {column.sortValue ? (
                    <TableSortLabel
                      active={sortBy === column.id}
                      direction={sortBy === column.id ? sortDir : 'asc'}
                      onClick={() => toggleSort(column.id)}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  {emptyContent ? (
                    <Box sx={{ py: 2 }}>{emptyContent}</Box>
                  ) : (
                    <Typography color="text.secondary" sx={{ py: 6, textAlign: 'center', fontSize: '0.875rem' }}>
                      {emptyMessage}
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              paged.map((row) => (
                <TableRow
                  key={rowKey(row)}
                  hover={Boolean(onRowClick)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (event) => {
                          if (
                            event.target === event.currentTarget &&
                            (event.key === 'Enter' || event.key === ' ')
                          ) {
                            event.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                  tabIndex={onRowClick ? 0 : undefined}
                  sx={{
                    cursor: onRowClick ? 'pointer' : 'default',
                    transition: 'background-color 0.12s ease',
                    '&:hover': {
                      bgcolor: 'action.hover !important',
                    },
                  }}
                >
                  {columns.map((column) => (
                    <TableCell
                      key={column.id}
                      align={column.align}
                      sx={{
                        py: dense ? 1 : 1.25,
                        px: dense ? 1.5 : 2,
                        fontSize: '0.875rem',
                        color: 'text.primary',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        whiteSpace: column.noWrap ? 'nowrap' : 'normal',
                      }}
                    >
                      {column.render(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

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
        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem', fontVariantNumeric: 'tabular-nums' }}>
          {filtered.length > 0
            ? `${t('Showing')} ${safePage * rowsPerPage + 1}–${Math.min((safePage + 1) * rowsPerPage, filtered.length)} ${t('of')} ${filtered.length}`
            : `${t('Showing')} 0 ${t('of')} 0`}
        </Typography>

        <Pagination
          count={Math.max(1, Math.ceil(filtered.length / rowsPerPage))}
          page={safePage + 1}
          onChange={(_, nextPage) => setPage(nextPage - 1)}
          shape="rounded"
          size="small"
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
    </Paper>
  );
}
