import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Button,
} from '@mui/material';
import MoreHorizRounded from '@mui/icons-material/MoreHorizRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import { Link as RouterLink } from 'react-router-dom';
import { alpha, useTheme } from '@mui/material/styles';

export interface LyticQueueTableProps {
  title: string;
  subtitle: string;
  headers: string[];
  rows: Array<{
    col1: string;
    col2: string;
    col3: string;
    col4: string;
    col5: string;
    status: 'positive' | 'warning' | 'negative' | 'neutral';
    link?: string;
  }>;
  viewAllLink?: string | undefined;
  viewAllText?: string | undefined;
}

export const LyticQueueTable: React.FC<LyticQueueTableProps> = ({
  title,
  subtitle,
  headers,
  rows,
  viewAllLink,
  viewAllText,
}) => {
  const theme = useTheme();
  const getBadgeStyle = (status: 'positive' | 'warning' | 'negative' | 'neutral') => {
    switch (status) {
      case 'positive':
        return {
          bg: alpha(theme.palette.success.main, 0.12),
          text: 'success.main',
        };
      case 'warning':
        return {
          bg: alpha(theme.palette.warning.main, 0.14),
          text: 'warning.main',
        };
      case 'negative':
        return {
          bg: alpha(theme.palette.error.main, 0.12),
          text: 'error.main',
        };
      case 'neutral':
      default:
        return {
          bg: 'action.hover',
          text: 'text.secondary',
        };
    }
  };

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          px: 2.5,
          py: 2,
        }}
      >
        <Box>
          <Typography
            component="h2"
            sx={{
              color: 'text.primary',
              fontSize: '16px',
              fontWeight: 600,
              mb: 0.5,
            }}
          >
            {title}
          </Typography>
          <Typography
            sx={{
              color: 'text.secondary',
              fontSize: '14px',
            }}
          >
            {subtitle}
          </Typography>
        </Box>

        <IconButton
          size="small"
          aria-label="Table options"
          sx={{
            color: 'text.secondary',
            p: 0.75,
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <MoreHorizRounded fontSize="small" />
        </IconButton>
      </Box>

      {/* Table Container */}
      <Box sx={{ overflowX: 'auto', flexGrow: 1 }}>
        <Table sx={{ minWidth: 500, borderTop: 1, borderColor: 'divider' }}>
          <TableHead>
            <TableRow sx={{ borderBottom: 1, borderColor: 'divider' }}>
              {headers.map((h, i) => (
                <TableCell
                  key={h}
                  align={i === headers.length - 1 ? 'right' : 'left'}
                  sx={{
                    px: 2.5,
                    py: 1.5,
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'text.primary',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderBottom: 1,
                    borderColor: 'divider',
                    bgcolor: 'transparent',
                  }}
                >
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, idx) => {
              const badge = getBadgeStyle(row.status);
              return (
                <TableRow
                  key={idx}
                  hover
                  sx={{
                    height: 56,
                    borderBottom: 1,
                    borderColor: 'divider',
                    '&:last-child td': { borderBottom: 0 },
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <TableCell sx={{ px: 2.5, py: 1.75, fontSize: '13px', fontWeight: 500, color: 'text.primary', borderBottom: 1, borderColor: 'divider' }}>
                    {row.col1}
                  </TableCell>
                  <TableCell sx={{ px: 2.5, py: 1.75, fontSize: '13px', color: 'text.secondary', borderBottom: 1, borderColor: 'divider' }}>
                    {row.col2}
                  </TableCell>
                  <TableCell sx={{ px: 2.5, py: 1.75, fontSize: '13px', color: 'text.secondary', borderBottom: 1, borderColor: 'divider' }}>
                    {row.col3}
                  </TableCell>
                  <TableCell sx={{ px: 2.5, py: 1.75, fontSize: '13px', color: 'text.secondary', borderBottom: 1, borderColor: 'divider' }}>
                    {row.col4}
                  </TableCell>
                  <TableCell align="right" sx={{ px: 2.5, py: 1.75, borderBottom: 1, borderColor: 'divider' }}>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        component="span"
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.75,
                          borderRadius: '9999px',
                          fontWeight: 500,
                          py: '2px',
                          px: '8px',
                          fontSize: '11px',
                          bgcolor: badge.bg,
                          color: badge.text,
                        }}
                      >
                        <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: 'currentColor' }} />
                        {row.col5}
                      </Box>
                      {row.link && (
                        <IconButton
                          component={RouterLink}
                          to={row.link}
                          size="small"
                          aria-label={`Open ${row.col1}`}
                          sx={{
                            color: 'text.secondary',
                            p: 0.5,
                            '&:hover': { color: 'primary.main' },
                          }}
                        >
                          <ArrowForwardRounded sx={{ fontSize: 16 }} />
                        </IconButton>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>

      {/* Optional Footer Link */}
      {viewAllLink && (
        <Box sx={{ p: 1.5, px: 2.5, borderTop: 1, borderColor: 'divider', bgcolor: 'transparent' }}>
          <Button
            component={RouterLink}
            to={viewAllLink}
            size="small"
            endIcon={<ArrowForwardRounded sx={{ fontSize: 16 }} />}
            sx={{
              color: 'primary.main',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '13px',
              p: 0,
              '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
            }}
          >
            {viewAllText || 'View all'}
          </Button>
        </Box>
      )}
    </Box>
  );
};
