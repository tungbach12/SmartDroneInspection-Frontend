import { useState, type ReactNode } from 'react';
import {
  Box,
  InputAdornment,
  Pagination,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import UnfoldMoreRounded from '@mui/icons-material/UnfoldMoreRounded';

export interface DataTableColumn<T> {
  id: string;
  label: string;
  render: (row: T) => ReactNode;
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
  actions,
  dense = false,
  maxHeight,
  stickyHeader = false,
}: DataTableProps<T>) {
  const [page, setPage] = useState(0);
  const rowsPerPage = 10;
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();

  const filtered = searchable && normalizedQuery && searchPredicate
    ? rows.filter((row) => searchPredicate(row, normalizedQuery))
    : rows;

  const paged = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Paper
      variant="outlined"
      sx={{
        overflow: 'hidden',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '12px',
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
                      <SearchIcon fontSize="small" sx={{ color: '#71717A' }} />
                    </InputAdornment>
                  ),
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
                  sx={{
                    bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#F9FAFB'),
                    color: '#71717A',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    letterSpacing: '0.01em',
                    py: dense ? 1.25 : 1.5,
                    px: dense ? 1.5 : 2.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    whiteSpace: column.noWrap ? 'nowrap' : 'normal',
                  }}
                >
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                    {column.label}
                    {column.id !== 'actions' && column.id !== 'action' && column.label !== '' && (
                      <UnfoldMoreRounded sx={{ fontSize: 16, color: '#A1A1AA' }} />
                    )}
                  </Box>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <Typography color="text.secondary" sx={{ py: 6, textAlign: 'center', fontSize: '0.875rem' }}>
                    {emptyMessage}
                  </Typography>
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
                        py: dense ? 1.25 : 1.75,
                        px: dense ? 1.5 : 2.5,
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
        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
          {filtered.length > 0
            ? `Showing ${page * rowsPerPage + 1}–${Math.min((page + 1) * rowsPerPage, filtered.length)} From ${filtered.length}`
            : 'Showing 0 From 0'}
        </Typography>

        <Pagination
          count={Math.max(1, Math.ceil(filtered.length / rowsPerPage))}
          page={page + 1}
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
