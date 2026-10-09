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
  const getBadgeStyle = (status: 'positive' | 'warning' | 'negative' | 'neutral') => {
    switch (status) {
      case 'positive':
        return {
          bg: 'var(--lytic-success-bg, #dcfce7)',
          text: 'var(--lytic-success-text, #16a34a)',
        };
      case 'warning':
        return {
          bg: 'var(--lytic-warning-bg, #ffedd5)',
          text: 'var(--lytic-warning-text, #ea580c)',
        };
      case 'negative':
        return {
          bg: 'var(--lytic-error-bg, #fee2e2)',
          text: 'var(--lytic-error-text, #dc2626)',
        };
      case 'neutral':
      default:
        return {
          bg: 'var(--lytic-border-light, #f3f4f6)',
          text: 'var(--lytic-text, #6b7280)',
        };
    }
  };

  return (
    <Box
      sx={{
        backgroundColor: 'var(--lytic-bg-card, #ffffff)',
        border: '1px solid var(--lytic-border, #e5e7eb)',
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
              color: 'var(--lytic-title, #1f2937)',
              fontSize: '16px',
              fontWeight: 600,
              mb: 0.5,
            }}
          >
            {title}
          </Typography>
          <Typography
            sx={{
              color: 'var(--lytic-text, #6b7280)',
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
            color: 'var(--lytic-text, #6b7280)',
            p: 0.75,
            '&:hover': { bgcolor: 'var(--lytic-border-light, #f3f4f6)' },
          }}
        >
          <MoreHorizRounded fontSize="small" />
        </IconButton>
      </Box>

      {/* Table Container */}
      <Box sx={{ overflowX: 'auto', flexGrow: 1 }}>
        <Table sx={{ minWidth: 500, borderTop: '1px solid var(--lytic-border, #e5e7eb)' }}>
          <TableHead>
            <TableRow sx={{ borderBottom: '1px solid var(--lytic-border, #e5e7eb)' }}>
              {headers.map((h, i) => (
                <TableCell
                  key={h}
                  align={i === headers.length - 1 ? 'right' : 'left'}
                  sx={{
                    px: 2.5,
                    py: 1.5,
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--lytic-title, #1f2937)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderBottom: '1px solid var(--lytic-border, #e5e7eb)',
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
                    borderBottom: '1px solid var(--lytic-border-light, #f3f4f6)',
                    '&:last-child td': { borderBottom: 0 },
                    '&:hover': { bgcolor: 'var(--lytic-border-light, #f3f4f6)' },
                  }}
                >
                  <TableCell sx={{ px: 2.5, py: 1.75, fontSize: '13px', fontWeight: 500, color: 'var(--lytic-title, #1f2937)', borderBottom: '1px solid var(--lytic-border-light, #f3f4f6)' }}>
                    {row.col1}
                  </TableCell>
                  <TableCell sx={{ px: 2.5, py: 1.75, fontSize: '13px', color: 'var(--lytic-text, #6b7280)', borderBottom: '1px solid var(--lytic-border-light, #f3f4f6)' }}>
                    {row.col2}
                  </TableCell>
                  <TableCell sx={{ px: 2.5, py: 1.75, fontSize: '13px', color: 'var(--lytic-text, #6b7280)', borderBottom: '1px solid var(--lytic-border-light, #f3f4f6)' }}>
                    {row.col3}
                  </TableCell>
                  <TableCell sx={{ px: 2.5, py: 1.75, fontSize: '13px', color: 'var(--lytic-text, #6b7280)', borderBottom: '1px solid var(--lytic-border-light, #f3f4f6)' }}>
                    {row.col4}
                  </TableCell>
                  <TableCell align="right" sx={{ px: 2.5, py: 1.75, borderBottom: '1px solid var(--lytic-border-light, #f3f4f6)' }}>
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
                            color: 'var(--lytic-text, #6b7280)',
                            p: 0.5,
                            '&:hover': { color: 'var(--lytic-primary, #3758F9)' },
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
        <Box sx={{ p: 1.5, px: 2.5, borderTop: '1px solid var(--lytic-border-light, #f3f4f6)', bgcolor: 'transparent' }}>
          <Button
            component={RouterLink}
            to={viewAllLink}
            size="small"
            endIcon={<ArrowForwardRounded sx={{ fontSize: 16 }} />}
            sx={{
              color: 'var(--lytic-primary, #3758F9)',
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
