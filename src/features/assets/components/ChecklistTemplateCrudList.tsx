import { useMemo, useState, type FormEvent } from 'react';
import {
  Add,
  ArrowDownwardRounded,
  ArrowUpwardRounded,
  CheckRounded,
  CloseRounded,
  DeleteOutlineRounded,
  EditOutlined,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  List,
  ListItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { QueryState } from '@/shared/ui/QueryState';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import type { ChecklistTemplate, ChecklistTemplateType } from '../api/catalogApi';
import {
  useChecklistTemplates,
  useCreateChecklistTemplate,
  useDeleteChecklistTemplate,
  useUpdateChecklistTemplate,
} from '../hooks/useCatalog';

interface ChecklistTemplateCrudListProps {
  title: string;
  subtitle: string;
  templateType: ChecklistTemplateType;
  categoryId?: string | null;
  placeholder: string;
  /** Hide the add form behind a `+ Add checkpoint` button until the user opens it. */
  collapsibleAdd?: boolean;
  addButtonLabel?: string;
}

/**
 * Shared checklist editor for category inspection items and the global pre-/post-flight
 * checklists. Renders the add form above the list so long checklists stay easy to extend,
 * numbered rows for scanability, and inline reorder/edit/delete controls.
 */
export function ChecklistTemplateCrudList({
  title,
  subtitle,
  templateType,
  categoryId = null,
  placeholder,
  collapsibleAdd = false,
  addButtonLabel,
}: ChecklistTemplateCrudListProps) {
  const { t } = useLocale();
  const templatesQuery = useChecklistTemplates(
    { type: templateType, categoryId },
    templateType !== 'CATEGORY_INSPECTION_ITEM' || Boolean(categoryId),
  );
  const createTemplate = useCreateChecklistTemplate();
  const updateTemplate = useUpdateChecklistTemplate();
  const deleteTemplate = useDeleteChecklistTemplate();

  const showRequiredToggle = templateType !== 'CATEGORY_INSPECTION_ITEM';
  const [addOpen, setAddOpen] = useState(!collapsibleAdd);
  const [newLabel, setNewLabel] = useState('');
  const [newRequired, setNewRequired] = useState(templateType !== 'POST_FLIGHT');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [deletingItem, setDeletingItem] = useState<ChecklistTemplate | null>(null);

  const items = useMemo(
    () =>
      [...(templatesQuery.data ?? [])].sort(
        (left, right) =>
          left.sortOrder - right.sortOrder || left.label.localeCompare(right.label),
      ),
    [templatesQuery.data],
  );

  const buildInput = (item: ChecklistTemplate) => ({
    label: item.label,
    sortOrder: item.sortOrder,
    active: item.active,
    ...(showRequiredToggle ? { required: item.required } : {}),
  });

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = newLabel.trim();
    if (!trimmed) return;
    const nextSortOrder = items.reduce(
      (highest, item) => Math.max(highest, item.sortOrder),
      0,
    ) + 1;
    createTemplate.mutate(
      {
        templateType,
        categoryId: templateType === 'CATEGORY_INSPECTION_ITEM' ? categoryId : null,
        label: trimmed,
        sortOrder: nextSortOrder,
        ...(showRequiredToggle ? { required: newRequired } : {}),
      },
      {
        onSuccess: () => setNewLabel(''),
      },
    );
  };

  const toggleRequired = (item: ChecklistTemplate) => {
    updateTemplate.mutate({
      id: item.id,
      input: { ...buildInput(item), required: !item.required },
    });
  };

  const moveItem = (item: ChecklistTemplate, direction: -1 | 1) => {
    const index = items.findIndex((candidate) => candidate.id === item.id);
    const target = items[index + direction];
    if (!target) return;

    const itemOrder = item.sortOrder;
    const targetOrder = target.sortOrder;
    const nextItemOrder =
      itemOrder === targetOrder ? targetOrder + direction : targetOrder;

    const persistMove = async () => {
      try {
        await updateTemplate.mutateAsync({
          id: item.id,
          input: { ...buildInput(item), label: item.label, sortOrder: nextItemOrder },
        });
        await updateTemplate.mutateAsync({
          id: target.id,
          input: { ...buildInput(target), label: target.label, sortOrder: itemOrder },
        });
      } catch {
        // The mutation hook surfaces the failure through the inline alert below.
      }
    };
    void persistMove();
  };

  const startEdit = (item: ChecklistTemplate) => {
    setEditingId(item.id);
    setEditingLabel(item.label);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingLabel('');
  };

  const saveEdit = (item: ChecklistTemplate) => {
    const trimmed = editingLabel.trim();
    if (!trimmed) return;
    updateTemplate.mutate(
      {
        id: item.id,
        input: { ...buildInput(item), label: trimmed },
      },
      {
        onSuccess: cancelEdit,
      },
    );
  };

  const mutationError = createTemplate.error ?? updateTemplate.error ?? deleteTemplate.error;
  const mutationIsError =
    createTemplate.isError || updateTemplate.isError || deleteTemplate.isError;

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ alignItems: { sm: 'flex-start' }, justifyContent: 'space-between', mb: 1.5 }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" component="h3" sx={{ fontWeight: 700, fontSize: '1rem' }}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {subtitle}
          </Typography>
        </Box>
        <Stack
          direction="row"
          spacing={0.75}
          sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, alignItems: 'center', flexShrink: 0 }}
        >
          {collapsibleAdd && !addOpen && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<Add />}
              onClick={() => setAddOpen(true)}
              sx={{ fontWeight: 600 }}
            >
              {addButtonLabel ?? t('Add item')}
            </Button>
          )}
          <Chip
            size="small"
            label={`${items.length} ${t('items')}`}
            sx={{
              borderRadius: '6px',
              bgcolor: 'background.default',
              color: 'text.secondary',
              border: '1px solid',
              borderColor: 'divider',
              fontWeight: 600,
            }}
          />
        </Stack>
      </Stack>

      {addOpen && (
      <Box
        component="form"
        onSubmit={handleCreate}
        sx={{
          p: 1.5,
          mb: 2,
          border: '1px dashed',
          borderColor: 'divider',
          borderRadius: '10px',
          bgcolor: 'background.default',
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ alignItems: { sm: 'center' } }}
        >
          <TextField
            size="small"
            fullWidth
            placeholder={placeholder}
            value={newLabel}
            onChange={(event) => setNewLabel(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': placeholder } }}
            sx={{
              '& .MuiOutlinedInput-root': {
                height: 38,
                bgcolor: 'background.paper',
              },
            }}
          />
          {showRequiredToggle && (
            <Button
              type="button"
              size="small"
              variant={newRequired ? 'contained' : 'outlined'}
              color={newRequired ? 'primary' : 'inherit'}
              onClick={() => setNewRequired((previous) => !previous)}
              aria-pressed={newRequired}
              sx={{ flexShrink: 0, fontWeight: 600, minWidth: 96, height: 38 }}
            >
              {newRequired ? t('Required') : t('Optional')}
            </Button>
          )}
          <Button
            type="submit"
            size="small"
            variant="contained"
            startIcon={<Add />}
            disabled={createTemplate.isPending || !newLabel.trim()}
            sx={{ flexShrink: 0, fontWeight: 600, height: 38, px: 2 }}
          >
            {t('Add item')}
          </Button>
        </Stack>
      </Box>
      )}

      {mutationIsError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {getErrorMessage(mutationError, t('Could not save the checklist change.'))}
        </Alert>
      )}

      <QueryState
        isLoading={templatesQuery.isLoading}
        error={templatesQuery.error}
        onRetry={() => void templatesQuery.refetch()}
        isEmpty={false}
      >
        {items.length === 0 ? (
          <Alert severity="info" sx={{ py: 0.75 }}>
            {t('No checklist items defined yet. Add the first item above.')}
          </Alert>
        ) : (
          <Box
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: '10px',
              overflow: 'hidden',
            }}
          >
            <List disablePadding>
              {items.map((item, index) => {
                const isEditing = editingId === item.id;
                const isLast = index === items.length - 1;
                const itemNumber = String(index + 1).padStart(2, '0');
                return (
                  <ListItem
                    key={item.id}
                    disablePadding
                    sx={{
                      px: 1.5,
                      py: 1,
                      borderBottom: isLast ? 'none' : '1px solid',
                      borderColor: 'divider',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1.5,
                      transition: 'background-color 140ms ease',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <Box
                      component="span"
                      aria-hidden="true"
                      sx={{
                        width: 30,
                        height: 26,
                        flexShrink: 0,
                        borderRadius: '6px',
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.default',
                        color: 'text.secondary',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'monospace',
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {itemNumber}
                    </Box>

                    {isEditing ? (
                      <Stack direction="row" spacing={1} sx={{ flex: 1, alignItems: 'center' }}>
                        <TextField
                          size="small"
                          fullWidth
                          autoFocus
                          value={editingLabel}
                          onChange={(event) => setEditingLabel(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              saveEdit(item);
                            } else if (event.key === 'Escape') {
                              cancelEdit();
                            }
                          }}
                          slotProps={{ htmlInput: { 'aria-label': t('Edit item') } }}
                          sx={{ '& .MuiOutlinedInput-root': { height: 36 } }}
                        />
                        <Tooltip title={t('Save item')}>
                          <span>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => saveEdit(item)}
                              disabled={updateTemplate.isPending || !editingLabel.trim()}
                              aria-label={t('Save item')}
                            >
                              <CheckRounded fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title={t('Cancel edit')}>
                          <IconButton size="small" onClick={cancelEdit} aria-label={t('Cancel edit')}>
                            <CloseRounded fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    ) : (
                      <>
                        <Typography
                          variant="body2"
                          sx={{
                            flex: 1,
                            fontWeight: 500,
                            minWidth: 0,
                            overflowWrap: 'anywhere',
                          }}
                        >
                          {item.label}
                        </Typography>
                        <Stack
                          direction="row"
                          spacing={0.5}
                          sx={{
                            flexShrink: 0,
                            alignItems: 'center',
                            opacity: { xs: 1, sm: 0.35 },
                            transition: 'opacity 140ms ease',
                            '.MuiListItem-root:hover &, .MuiListItem-root:focus-within &': {
                              opacity: 1,
                            },
                          }}
                        >
                          {showRequiredToggle && (
                            <Tooltip title={t('Click to toggle Required / Optional')}>
                              <Chip
                                size="small"
                                label={item.required ? t('Required') : t('Optional')}
                                onClick={() => toggleRequired(item)}
                                disabled={updateTemplate.isPending}
                                sx={{
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                  borderRadius: '6px',
                                  bgcolor: item.required
                                    ? 'rgba(55, 88, 249, 0.10)'
                                    : 'background.default',
                                  color: item.required ? 'primary.dark' : 'text.secondary',
                                  border: '1px solid',
                                  borderColor: item.required
                                    ? 'rgba(55, 88, 249, 0.25)'
                                    : 'divider',
                                }}
                              />
                            </Tooltip>
                          )}
                          <Tooltip title={t('Move up')}>
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => moveItem(item, -1)}
                                disabled={index === 0 || updateTemplate.isPending}
                                aria-label={`${t('Move up')} ${item.label}`}
                              >
                                <ArrowUpwardRounded fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title={t('Move down')}>
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => moveItem(item, 1)}
                                disabled={isLast || updateTemplate.isPending}
                                aria-label={`${t('Move down')} ${item.label}`}
                              >
                                <ArrowDownwardRounded fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title={t('Edit item')}>
                            <IconButton
                              size="small"
                              onClick={() => startEdit(item)}
                              aria-label={`${t('Edit item')} ${item.label}`}
                            >
                              <EditOutlined fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t('Delete item')}>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => setDeletingItem(item)}
                              disabled={deleteTemplate.isPending}
                              aria-label={`${t('Delete item')} ${item.label}`}
                            >
                              <DeleteOutlineRounded fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </>
                    )}
                  </ListItem>
                );
              })}
            </List>
          </Box>
        )}
      </QueryState>

      <ConfirmDialog
        open={Boolean(deletingItem)}
        title={t('Delete checklist item')}
        message={
          deletingItem ? `${t('Are you sure you want to delete')} "${deletingItem.label}"?` : ''
        }
        confirmLabel={t('Delete')}
        cancelLabel={t('Cancel')}
        severity="danger"
        loading={deleteTemplate.isPending}
        onCancel={() => setDeletingItem(null)}
        onConfirm={() => {
          if (!deletingItem) return;
          deleteTemplate.mutate(deletingItem.id, {
            onSuccess: () => setDeletingItem(null),
          });
        }}
      />
    </Box>
  );
}
