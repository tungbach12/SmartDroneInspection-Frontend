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
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import { useLocale } from '@/shared/i18n/LocaleProvider';
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
  const { t } = useLocale();
  const getBadgeStyle = (status: 'positive' | 'warning' | 'negative' | 'neutral') => {
    switch (status) {
      case 'positive':
        return {
          bg: '#F0FDF4',
          text: '#15803D',
        };
      case 'warning':
        return {
          bg: '#FFFBEB',
          text: '#B45309',
        };
      case 'negative':
        return {
          bg: '#FEF2F2',
          text: '#B91C1C',
        };
      case 'neutral':
      default:
        return {
          bg: '#F4F4F5',
          text: '#374151',
        };
    }
  };

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '12px',
        p: '20px',
        overflow: 'hidden',
        boxShadow: 'none',
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
          mb: 2,
        }}
      >
        <Box>
          <Typography
            component="h2"
            sx={{
              color: 'text.primary',
              fontSize: '1rem',
              fontWeight: 600,
              mb: 0.5,
            }}
          >
            {t(title)}
          </Typography>
          <Typography
            sx={{
              color: '#71717A',
              fontSize: '0.875rem',
            }}
          >
            {t(subtitle)}
          </Typography>
        </Box>
        <Box
          sx={{
            color: '#9CA3AF',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 0.5,
            flexShrink: 0,
          }}
        >
          <svg width="18" height="4" viewBox="0 0 18 4" fill="none">
            <path d="M4 2C4 3.10457 3.10457 4 2 4C0.89543 4 0 3.10457 0 2C0 0.89543 0.89543 0 2 0C3.10457 0 4 0.89543 4 2Z" fill="currentColor" />
            <path d="M11 2C11 3.10457 10.1046 4 9 4C7.89543 4 7 3.10457 7 2C7 0.89543 7.89543 0 9 0C10.1046 0 11 0.89543 11 2Z" fill="currentColor" />
            <path d="M18 2C18 3.10457 17.1046 4 16 4C14.8954 4 14 3.10457 14 2C14 0.89543 14.8954 0 16 0C17.1046 0 18 0.89543 18 2Z" fill="currentColor" />
          </svg>
        </Box>
      </Box>

      {/* Table Container */}
      <Box sx={{ overflowX: 'auto', flexGrow: 1, mx: '-20px' }}>
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
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: '#71717A',
                    textTransform: 'uppercase',
                    letterSpacing: '0.02em',
                    borderBottom: 1,
                    borderColor: 'divider',
                    bgcolor: 'rgba(244, 244, 245, 0.5)',
                  }}
                >
                  {t(h)}
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
                    height: 54,
                    borderBottom: 1,
                    borderColor: 'divider',
                    '&:last-child td': { borderBottom: 0 },
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <TableCell sx={{ px: 2.5, py: 1.5, fontSize: '0.875rem', fontWeight: 500, color: 'text.primary', borderBottom: 1, borderColor: 'divider' }}>
                    {t(row.col1)}
                  </TableCell>
                  <TableCell sx={{ px: 2.5, py: 1.5, fontSize: '0.875rem', color: '#71717A', borderBottom: 1, borderColor: 'divider' }}>
                    {t(row.col2)}
                  </TableCell>
                  <TableCell sx={{ px: 2.5, py: 1.5, fontSize: '0.875rem', color: '#71717A', borderBottom: 1, borderColor: 'divider' }}>
                    {t(row.col3)}
                  </TableCell>
                  <TableCell sx={{ px: 2.5, py: 1.5, fontSize: '0.875rem', color: '#71717A', borderBottom: 1, borderColor: 'divider' }}>
                    {t(row.col4)}
                  </TableCell>
                  <TableCell align="right" sx={{ px: 2.5, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        component="span"
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.75,
                          borderRadius: '6px',
                          fontWeight: 500,
                          py: '2px',
                          px: '8px',
                          fontSize: '0.75rem',
                          bgcolor: badge.bg,
                          color: badge.text,
                        }}
                      >
                        {row.col5}
                      </Box>
                      {row.link && (
                        <IconButton
                          component={RouterLink}
                          to={row.link}
                          size="small"
                          aria-label={`Open ${row.col1}`}
                          sx={{
                            color: '#71717A',
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
        <Box sx={{ pt: 2, mt: 1, borderTop: 1, borderColor: 'divider', bgcolor: 'transparent' }}>
          <Button
            component={RouterLink}
            to={viewAllLink}
            size="small"
            endIcon={<ArrowForwardRounded sx={{ fontSize: 16 }} />}
            sx={{
              color: '#3758F9',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
              p: 0,
              '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
            }}
          >
            {t(viewAllText || 'View all')}
          </Button>
        </Box>
      )}
    </Box>
  );
};
