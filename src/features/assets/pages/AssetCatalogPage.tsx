import { useMemo, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Add, EditOutlined } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { PageHeader } from '@/shared/ui/PageHeader';
import { PaginationFooter } from '@/shared/ui/PaginationFooter';
import { paginateItems } from '@/shared/ui/pagination';
import { QueryState } from '@/shared/ui/QueryState';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { AdminTableToolbar } from '@/features/admin/components/AdminTableToolbar';
import { ChecklistTemplateCrudList } from '../components/ChecklistTemplateCrudList';
import {
  useCategories,
  useChecklistTemplates,
  useCreateCategory,
  useUpdateCategory,
} from '../hooks/useCatalog';
import type { Category } from '../api/catalogApi';

type CheckpointFilter = 'ALL' | 'HAS_ITEMS' | 'EMPTY';
type SortOption = 'NAME_ASC' | 'MOST_ITEMS' | 'CODE_ASC';

export default function AssetCatalogPage() {
  const { t } = useLocale();
  const categoriesQuery = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  // One request powers the per-category checkpoint counts in the table.
  const checklistQuery = useChecklistTemplates({ type: 'CATEGORY_INSPECTION_ITEM' }, true);

  const [search, setSearch] = useState('');
  const [checkpointFilter, setCheckpointFilter] = useState<CheckpointFilter>('ALL');
  const [sort, setSort] = useState<SortOption>('NAME_ASC');
  const [page, setPage] = useState(1);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // New category form
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Edit category form
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const categoryList = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);

  const checkpointCounts = useMemo(() => {
    const counts = new Map<string, number>();
    (checklistQuery.data ?? []).forEach((item) => {
      if (!item.categoryId) return;
      counts.set(item.categoryId, (counts.get(item.categoryId) ?? 0) + 1);
    });
    return counts;
  }, [checklistQuery.data]);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const withCounts = categoryList.map((category) => ({
      category,
      count: checkpointCounts.get(category.id) ?? 0,
    }));

    const filtered = withCounts.filter(({ category, count }) => {
      if (query) {
        const matches =
          category.name.toLowerCase().includes(query) ||
          category.code.toLowerCase().includes(query) ||
          (category.description ?? '').toLowerCase().includes(query);
        if (!matches) return false;
      }
      if (checkpointFilter === 'HAS_ITEMS') return count > 0;
      if (checkpointFilter === 'EMPTY') return count === 0;
      return true;
    });

    return [...filtered].sort((left, right) => {
      if (sort === 'MOST_ITEMS') {
        return right.count - left.count || left.category.name.localeCompare(right.category.name);
      }
      if (sort === 'CODE_ASC') {
        return left.category.code.localeCompare(right.category.code);
      }
      return left.category.name.localeCompare(right.category.name);
    });
  }, [categoryList, checkpointCounts, checkpointFilter, search, sort]);

  const paginatedRows = useMemo(() => paginateItems(rows, page, 10), [rows, page]);

  const selectedCategory = categoryList.find((category) => category.id === selectedCategoryId) ?? null;

  const openCategory = (category: Category) => {
    setSelectedCategoryId(category.id);
    setEditing(false);
    setEditName(category.name);
    setEditDescription(category.description ?? '');
    updateCategory.reset();
  };

  const closeCategory = () => {
    setSelectedCategoryId(null);
    setEditing(false);
  };

  const submitCategory = (event: FormEvent) => {
    event.preventDefault();
    createCategory.mutate(
      { code: code.trim(), name: name.trim(), description: description.trim() || null },
      {
        onSuccess: (category) => {
          setCode('');
          setName('');
          setDescription('');
          setCreateDialogOpen(false);
          openCategory(category);
        },
      },
    );
  };

  const submitEditCategory = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedCategory) return;
    updateCategory.mutate(
      {
        id: selectedCategory.id,
        input: {
          code: selectedCategory.code,
          name: editName.trim(),
          description: editDescription.trim() || null,
        },
      },
      {
        onSuccess: (category) => {
          setEditName(category.name);
          setEditDescription(category.description ?? '');
          setEditing(false);
        },
      },
    );
  };

  const handleRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, category: Category) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openCategory(category);
    }
  };

  return (
    <Box className="workspace-page workspace-page--catalog">
      <PageHeader
        title={t('Asset catalog')}
        subtitle={t(
          'Manage asset categories and the standard inspection checkpoints inspectors apply to each asset type.',
        )}
        breadcrumbs={[
          { label: t('Governance'), to: '/admin/dashboard' },
          { label: t('Asset catalog') },
        ]}
        actions={
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              createCategory.reset();
              setCreateDialogOpen(true);
            }}
          >
            {t('New category')}
          </Button>
        }
      />

      <AdminTableToolbar
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        searchPlaceholder={t('Search name, code, or description')}
        searchLabel={t('Search categories')}
        visibleCount={rows.length}
        totalCount={categoryList.length}
        filters={[
          {
            key: 'checkpoints',
            label: t('Checkpoints'),
            value: checkpointFilter,
            options: [
              { value: 'ALL', label: t('All checkpoints') },
              { value: 'HAS_ITEMS', label: t('Has items') },
              { value: 'EMPTY', label: t('Empty') },
            ],
            onChange: (value) => {
              setCheckpointFilter(value as CheckpointFilter);
              setPage(1);
            },
          },
          {
            key: 'sort',
            label: t('Sort'),
            value: sort,
            options: [
              { value: 'NAME_ASC', label: t('Name A–Z') },
              { value: 'MOST_ITEMS', label: t('Most items') },
              { value: 'CODE_ASC', label: t('Code A–Z') },
            ],
            onChange: (value) => {
              setSort(value as SortOption);
              setPage(1);
            },
          },
        ]}
      />

      <QueryState
        isLoading={categoriesQuery.isLoading}
        error={categoriesQuery.error}
        onRetry={() => void categoriesQuery.refetch()}
        isEmpty={categoryList.length === 0}
        empty={
          <Alert severity="info">
            {t('No categories yet. Use "New category" to create the first one.')}
          </Alert>
        }
      >
        <Paper
          variant="outlined"
          sx={{ borderRadius: '10px', overflow: 'hidden', borderColor: 'divider' }}
        >
          <TableContainer>
            <Table aria-label={t('Asset catalog')} sx={{ tableLayout: { md: 'fixed' } }}>
              <TableHead>
                <TableRow>
                  {[t('Category'), t('Code'), t('Checkpoints'), ''].map((label, index) => (
                    <TableCell
                      key={label || 'manage'}
                      align={index === 3 ? 'right' : 'left'}
                      sx={{
                        width: index === 1 ? 190 : index === 2 ? 120 : index === 3 ? 120 : undefined,
                        bgcolor: (muiTheme) =>
                          muiTheme.palette.mode === 'dark'
                            ? 'rgba(255, 255, 255, 0.03)'
                            : '#F9FAFB',
                        color: 'text.secondary',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        letterSpacing: '0.02em',
                        py: 1.25,
                        px: 2,
                      }}
                    >
                      {label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Typography color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
                        {t('No categories match the current filters.')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRows.items.map(({ category, count }) => (
                    <TableRow
                      key={category.id}
                      hover
                      tabIndex={0}
                      onClick={() => openCategory(category)}
                      onKeyDown={(event) => handleRowKeyDown(event, category)}
                      sx={{
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' },
                        '&:focus-visible': {
                          outline: '2px solid',
                          outlineColor: 'primary.main',
                          outlineOffset: -2,
                        },
                      }}
                    >
                      <TableCell sx={{ py: 1.5, px: 2, minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 650, fontSize: '0.875rem' }}>
                          {category.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            display: 'block',
                            mt: 0.25,
                            maxWidth: '100%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {category.description || t('No description yet.')}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.5, px: 2 }}>
                        <Box
                          component="span"
                          sx={{
                            px: 0.75,
                            py: 0.125,
                            borderRadius: '6px',
                            border: '1px solid',
                            borderColor: 'divider',
                            bgcolor: 'background.default',
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: 'text.primary',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {category.code}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: 1.5, px: 2 }}>
                        <Typography variant="body2" color={count > 0 ? 'text.primary' : 'text.secondary'}>
                          {count} {t('items')}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ py: 1.5, px: 2 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<EditOutlined sx={{ fontSize: 16 }} />}
                          aria-label={`${t('Manage')} ${category.name}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            openCategory(category);
                          }}
                          sx={{ borderColor: 'divider', whiteSpace: 'nowrap' }}
                        >
                          {t('Manage')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <PaginationFooter
            page={paginatedRows.page}
            pageSize={paginatedRows.pageSize}
            totalCount={paginatedRows.totalCount}
            onPageChange={setPage}
            ariaLabel={t('Asset catalog pagination')}
          />
        </Paper>
      </QueryState>

      <Dialog open={Boolean(selectedCategory)} onClose={closeCategory} fullWidth maxWidth="md">
        {selectedCategory && (
          <>
            <DialogTitle sx={{ fontWeight: 700, pr: 6 }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography component="span" sx={{ fontWeight: 700, fontSize: '1.0625rem' }}>
                    {t('Category profile')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {t('Category identity used across inspections and reports.')}
                  </Typography>
                </Box>
                <Box
                  component="span"
                  sx={{
                    alignSelf: { xs: 'flex-start', sm: 'center' },
                    px: 1,
                    py: 0.375,
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.default',
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'text.primary',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {selectedCategory.code}
                </Box>
              </Stack>
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Stack spacing={2.5}>
                {updateCategory.isError && (
                  <Alert severity="error">
                    {getErrorMessage(
                      updateCategory.error,
                      t('Could not update the category.'),
                    )}
                  </Alert>
                )}
                {updateCategory.isSuccess && !editing && (
                  <Alert severity="success">{t('Category updated successfully.')}</Alert>
                )}

                <Box>
                  <Stack
                    direction="row"
                    sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1 }}
                  >
                    <Typography variant="h6" component="h2" sx={{ fontWeight: 700, fontSize: '1rem' }}>
                      {t('Category details')}
                    </Typography>
                    {!editing && (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<EditOutlined sx={{ fontSize: 16 }} />}
                        onClick={() => setEditing(true)}
                        sx={{ borderColor: 'divider' }}
                      >
                        {t('Edit details')}
                      </Button>
                    )}
                  </Stack>

                  {editing ? (
                    <Box component="form" onSubmit={submitEditCategory}>
                      <Stack spacing={2}>
                        <TextField
                          required
                          autoFocus
                          size="small"
                          label={t('Name')}
                          value={editName}
                          onChange={(event) => setEditName(event.target.value)}
                        />
                        <TextField
                          size="small"
                          fullWidth
                          multiline
                          minRows={3}
                          label={t('Description')}
                          value={editDescription}
                          onChange={(event) => setEditDescription(event.target.value)}
                        />
                        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                          <Button
                            type="button"
                            size="small"
                            color="inherit"
                            onClick={() => {
                              setEditing(false);
                              setEditName(selectedCategory.name);
                              setEditDescription(selectedCategory.description ?? '');
                            }}
                          >
                            {t('Cancel')}
                          </Button>
                          <Button
                            type="submit"
                            size="small"
                            variant="contained"
                            disabled={
                              updateCategory.isPending ||
                              !editName.trim() ||
                              (editName.trim() === selectedCategory.name &&
                                editDescription.trim() === (selectedCategory.description ?? '').trim())
                            }
                          >
                            {updateCategory.isPending ? t('Saving…') : t('Save changes')}
                          </Button>
                        </Stack>
                      </Stack>
                    </Box>
                  ) : (
                    <Stack spacing={1.25}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          {t('Name')}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {selectedCategory.name}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          {t('Description')}
                        </Typography>
                        <Typography variant="body2" color={selectedCategory.description ? 'text.primary' : 'text.secondary'}>
                          {selectedCategory.description || t('No description yet.')}
                        </Typography>
                      </Box>
                    </Stack>
                  )}
                </Box>

                <Divider />

                <ChecklistTemplateCrudList
                  title={t('Standard Inspection Items')}
                  subtitle={t('Default checkpoints for this category.')}
                  templateType="CATEGORY_INSPECTION_ITEM"
                  categoryId={selectedCategory.id}
                  placeholder={t('Add standard inspection checkpoint...')}
                  collapsibleAdd
                  addButtonLabel={t('+ Add checkpoint')}
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={closeCategory}>{t('Close')}</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <form onSubmit={submitCategory}>
          <DialogTitle>{t('New category')}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {createCategory.isError && (
                <Alert severity="error">
                  {getErrorMessage(createCategory.error, t('Could not save the category.'))}
                </Alert>
              )}
              <TextField
                required
                autoFocus
                size="small"
                label={t('Code')}
                placeholder="HIGH_RISE_OFFICE"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
              <TextField
                required
                size="small"
                label={t('Name')}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <TextField
                size="small"
                multiline
                minRows={2}
                label={t('Description')}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>{t('Cancel')}</Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={<Add />}
              disabled={createCategory.isPending || !code.trim() || !name.trim()}
            >
              {createCategory.isPending ? t('Saving…') : t('Save category')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
