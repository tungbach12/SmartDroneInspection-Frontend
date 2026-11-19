import type { ReactNode } from 'react';
import {
  Box,
  Button,
  Chip,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SearchRounded from '@mui/icons-material/SearchRounded';
import { useLocale } from '@/shared/i18n/LocaleProvider';

export interface AdminToolbarFilterOption {
  value: string;
  label: string;
}

export interface AdminToolbarFilter {
  key: string;
  label: string;
  value: string;
  options: readonly AdminToolbarFilterOption[];
  onChange: (value: string) => void;
  /** Value that represents "no filter". Defaults to `ALL`. */
  allValue?: string;
  width?: number;
}

interface AdminTableToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  searchLabel?: string;
  filters?: readonly AdminToolbarFilter[];
  visibleCount?: number;
  totalCount?: number;
  onClearAll?: () => void;
  actions?: ReactNode;
}

/**
 * Shared two-tier filter bar for the Admin listing workspaces.
 *
 * Row one holds the search field, up to three context-specific selects, and an optional
 * "Showing X of Y" summary. Row two appears only while a filter is active and exposes one
 * removable chip per filter plus a single "Clear all" action, so the active scope of a table
 * is always readable at a glance.
 */
export function AdminTableToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  searchLabel,
  filters = [],
  visibleCount,
  totalCount,
  onClearAll,
  actions,
}: AdminTableToolbarProps) {
  const { t } = useLocale();
  const hasSearch = searchValue.trim().length > 0;
  const activeFilters = filters.filter(
    (filter) => filter.value !== (filter.allValue ?? 'ALL'),
  );
  const hasActiveFilters = hasSearch || activeFilters.length > 0;
  const showSummary =
    typeof visibleCount === 'number' && typeof totalCount === 'number';

  const clearAll = () => {
    onSearchChange('');
    filters.forEach((filter) => filter.onChange(filter.allValue ?? 'ALL'));
    onClearAll?.();
  };

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '10px',
        bgcolor: 'background.paper',
        mb: 2,
      }}
    >
      <Stack
        direction={{ xs: 'column', lg: 'row' }}
        spacing={1.25}
        sx={{
          px: { xs: 1.5, sm: 2 },
          py: 1.5,
          alignItems: { xs: 'stretch', lg: 'center' },
          flexWrap: 'wrap',
          gap: 1.25,
        }}
      >
        <TextField
          size="small"
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          slotProps={{
            htmlInput: { 'aria-label': searchLabel ?? searchPlaceholder },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRounded fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
              endAdornment: hasSearch ? (
                <InputAdornment position="end">
                  <Button
                    size="small"
                    color="inherit"
                    aria-label={t('Clear search')}
                    onClick={() => onSearchChange('')}
                    sx={{ minWidth: 0, p: 0.25, fontSize: '1rem', lineHeight: 1, color: 'text.secondary' }}
                  >
                    ×
                  </Button>
                </InputAdornment>
              ) : undefined,
            },
          }}
          sx={{
            flex: { xs: '1 1 auto', lg: '0 1 360px' },
            minWidth: { xs: 0, sm: 240 },
            '& .MuiOutlinedInput-root': {
              height: 38,
              bgcolor: 'background.paper',
              fontSize: '0.875rem',
            },
          }}
        />

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ flexWrap: 'wrap', gap: 1, minWidth: 0 }}
        >
          {filters.map((filter) => (
            <TextField
              key={filter.key}
              select
              size="small"
              label={filter.label}
              value={filter.value}
              onChange={(event) => filter.onChange(event.target.value)}
              slotProps={{ select: { displayEmpty: true } }}
              sx={{
                minWidth: filter.width ?? 150,
                '& .MuiOutlinedInput-root': {
                  height: 38,
                  bgcolor: 'background.paper',
                  fontSize: '0.875rem',
                },
                '& .MuiInputLabel-root': { fontSize: '0.8125rem' },
              }}
            >
              {filter.options.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {t(option.label)}
                </MenuItem>
              ))}
            </TextField>
          ))}
        </Stack>

        <Box sx={{ flex: 1 }} />

        {showSummary && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontSize: '0.8125rem', whiteSpace: 'nowrap' }}
          >
            {t('Showing')} {visibleCount} {t('of')} {totalCount}
          </Typography>
        )}

        {actions}
      </Stack>

      {hasActiveFilters && (
        <Stack
          direction="row"
          spacing={0.75}
          sx={{
            px: { xs: 1.5, sm: 2 },
            pb: 1.5,
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 0.75,
          }}
        >
          {hasSearch && (
            <Chip
              size="small"
              label={`${t('Search')}: "${searchValue.trim()}"`}
              onDelete={() => onSearchChange('')}
              sx={{ fontWeight: 600, maxWidth: '100%' }}
            />
          )}
          {activeFilters.map((filter) => {
            const selected = filter.options.find(
              (option) => option.value === filter.value,
            );
            return (
              <Chip
                key={filter.key}
                size="small"
                label={`${filter.label}: ${t(selected?.label ?? filter.value)}`}
                onDelete={() => filter.onChange(filter.allValue ?? 'ALL')}
                sx={{ fontWeight: 600, maxWidth: '100%' }}
              />
            );
          })}
          <Button
            size="small"
            color="inherit"
            onClick={clearAll}
            sx={{ ml: 0.25, fontSize: '0.8125rem', fontWeight: 600 }}
          >
            {t('Clear all')}
          </Button>
        </Stack>
      )}
    </Box>
  );
}
