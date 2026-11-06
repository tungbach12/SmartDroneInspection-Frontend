import { useState, type FormEvent } from 'react';
import {
  Add,
  CheckRounded,
  CloseRounded,
  DeleteOutlineRounded,
  EditOutlined,
  FlightLandRounded,
  FlightTakeoffRounded,
  PlaylistAddCheckRounded,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryState } from '@/shared/ui/QueryState';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import type { ChecklistTemplate, ChecklistTemplateType } from '../api/catalogApi';
import {
  useCategories,
  useChecklistTemplates,
  useCreateCategory,
  useCreateChecklistTemplate,
  useDeleteChecklistTemplate,
  useUpdateCategory,
  useUpdateChecklistTemplate,
} from '../hooks/useCatalog';

interface ChecklistManagerSectionProps {
  title: string;
  subtitle: string;
  templateType: ChecklistTemplateType;
  categoryId?: string | null;
  placeholder: string;
}

function ChecklistTemplateCrudList({
  title,
  subtitle,
  templateType,
  categoryId = null,
  placeholder,
}: ChecklistManagerSectionProps) {
  const { t } = useLocale();
  const templatesQuery = useChecklistTemplates(
    { type: templateType, categoryId },
    templateType !== 'CATEGORY_INSPECTION_ITEM' || Boolean(categoryId),
  );
  const createTemplate = useCreateChecklistTemplate();
  const updateTemplate = useUpdateChecklistTemplate();
  const deleteTemplate = useDeleteChecklistTemplate();

  const [newLabel, setNewLabel] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');

  const items = templatesQuery.data ?? [];

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = newLabel.trim();
    if (!trimmed) return;
    createTemplate.mutate(
      {
        templateType,
        categoryId: templateType === 'CATEGORY_INSPECTION_ITEM' ? categoryId : null,
        label: trimmed,
        sortOrder: items.length + 1,
      },
      {
        onSuccess: () => setNewLabel(''),
      },
    );
  };

  const startEdit = (item: ChecklistTemplate) => {
    setEditingId(item.id);
    setEditingLabel(item.label);
  };

  const saveEdit = (item: ChecklistTemplate) => {
    const trimmed = editingLabel.trim();
    if (!trimmed) return;
    updateTemplate.mutate(
      {
        id: item.id,
        input: {
          label: trimmed,
          sortOrder: item.sortOrder,
          active: item.active,
        },
      },
      {
        onSuccess: () => {
          setEditingId(null);
          setEditingLabel('');
        },
      },
    );
  };

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <Chip size="small" color="primary" variant="outlined" label={`${items.length} items`} />
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        {subtitle}
      </Typography>

      <QueryState
        isLoading={templatesQuery.isLoading}
        error={templatesQuery.error}
        onRetry={() => void templatesQuery.refetch()}
        isEmpty={false}
      >
        <Stack spacing={1} sx={{ mb: 2 }}>
          {items.length === 0 ? (
            <Alert severity="info" sx={{ py: 0.5 }}>
              {t('No checklist items defined yet. Add the first item below.')}
            </Alert>
          ) : (
            items.map((item, idx) => {
              const isEditing = editingId === item.id;
              return (
                <Paper
                  key={item.id}
                  variant="outlined"
                  sx={{
                    px: 1.5,
                    py: 1,
                    borderRadius: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                  }}
                >
                  {isEditing ? (
                    <Stack direction="row" spacing={1} sx={{ flex: 1, alignItems: 'center' }}>
                      <TextField
                        size="small"
                        fullWidth
                        value={editingLabel}
                        onChange={(e) => setEditingLabel(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            saveEdit(item);
                          } else if (e.key === 'Escape') {
                            setEditingId(null);
                          }
                        }}
                      />
                      <Tooltip title={t('Save')}>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => saveEdit(item)}
                          disabled={updateTemplate.isPending || !editingLabel.trim()}
                          aria-label="Save item"
                        >
                          <CheckRounded fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('Cancel')}>
                        <IconButton
                          size="small"
                          onClick={() => setEditingId(null)}
                          aria-label="Cancel edit"
                        >
                          <CloseRounded fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  ) : (
                    <>
                      <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>
                        <Box component="span" sx={{ color: 'text.secondary', mr: 1, fontFamily: 'monospace' }}>
                          {idx + 1}.
                        </Box>
                        {item.label}
                      </Typography>
                      <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                        <Tooltip title={t('Edit item')}>
                          <IconButton
                            size="small"
                            onClick={() => startEdit(item)}
                            aria-label={`Edit ${item.label}`}
                          >
                            <EditOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('Delete item')}>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => deleteTemplate.mutate(item.id)}
                            disabled={deleteTemplate.isPending}
                            aria-label={`Delete ${item.label}`}
                          >
                            <DeleteOutlineRounded fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </>
                  )}
                </Paper>
              );
            })
          )}
        </Stack>
      </QueryState>

      <Box component="form" onSubmit={handleCreate}>
        <Stack direction="row" spacing={1}>
          <TextField
            size="small"
            fullWidth
            placeholder={placeholder}
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
          />
          <Button
            type="submit"
            variant="contained"
            startIcon={<Add />}
            disabled={createTemplate.isPending || !newLabel.trim()}
            sx={{ flexShrink: 0, textTransform: 'none', fontWeight: 600 }}
          >
            {t('Add item')}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}

export default function AssetCatalogPage() {
  const { t } = useLocale();
  const categories = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const [activeTab, setActiveTab] = useState<'categories' | 'flight-checklists'>('categories');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  // New category form
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Edit category form
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const selectedCategory = categories.data?.find((c) => c.id === selectedCategoryId);

  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    const cat = categories.data?.find((c) => c.id === categoryId);
    if (cat) {
      setEditName(cat.name);
      setEditDescription(cat.description || '');
    }
  };

  const submitCategory = (event: FormEvent) => {
    event.preventDefault();
    createCategory.mutate(
      { code, name, description: description || null },
      {
        onSuccess: (category) => {
          setCode('');
          setName('');
          setDescription('');
          handleSelectCategory(category.id);
        },
      },
    );
  };

  const submitEditCategory = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedCategory) return;
    updateCategory.mutate({
      id: selectedCategory.id,
      input: {
        code: selectedCategory.code,
        name: editName,
        description: editDescription || null,
      },
    });
  };

  return (
    <Box className="workspace-page workspace-page--catalog">
      <PageHeader
        title={t('Asset catalog & Flight checklists')}
        subtitle={t(
          'Admin-managed building categories, standard structural inspection items, and pre-flight / post-flight safety checklists',
        )}
      />

      <Tabs
        value={activeTab}
        onChange={(_, val) => setActiveTab(val)}
        sx={{ mb: 2.5, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab
          value="categories"
          icon={<PlaylistAddCheckRounded fontSize="small" />}
          iconPosition="start"
          label={t('Building Categories & Inspection Items')}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        />
        <Tab
          value="flight-checklists"
          icon={<FlightTakeoffRounded fontSize="small" />}
          iconPosition="start"
          label={t('Pre-flight & Post-flight Checklists')}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        />
      </Tabs>

      {activeTab === 'categories' ? (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ alignItems: 'flex-start' }}>
          <Card variant="outlined" sx={{ flex: 1, width: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('Categories')}
              </Typography>
              <QueryState
                isLoading={categories.isLoading}
                error={categories.error}
                onRetry={() => void categories.refetch()}
                isEmpty={Boolean(categories.data && categories.data.length === 0)}
                empty={<Alert severity="info">{t('No categories yet. Create the first one below.')}</Alert>}
              >
                <Stack spacing={1}>
                  {categories.data?.map((category) => (
                    <Button
                      key={category.id}
                      variant={category.id === selectedCategoryId ? 'contained' : 'outlined'}
                      onClick={() => handleSelectCategory(category.id)}
                      sx={{ justifyContent: 'space-between', textAlign: 'left' }}
                    >
                      <span>{category.name}</span>
                      <Chip
                        size="small"
                        label={category.code}
                        sx={{
                          ml: 1,
                          bgcolor:
                            category.id === selectedCategoryId ? 'rgba(255,255,255,0.2)' : undefined,
                        }}
                      />
                    </Button>
                  ))}
                </Stack>
              </QueryState>

              <Box component="form" onSubmit={submitCategory} sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  {t('New category')}
                </Typography>
                <Stack spacing={2}>
                  {createCategory.isError && (
                    <Alert severity="error">
                      {getErrorMessage(createCategory.error, 'Could not save the category.')}
                    </Alert>
                  )}
                  <TextField
                    required
                    size="small"
                    label={t('Code')}
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
                    label={t('Description')}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<Add />}
                    disabled={createCategory.isPending}
                  >
                    {t('Save category')}
                  </Button>
                </Stack>
              </Box>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ flex: 1.3, width: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('Category details')}
              </Typography>
              {!selectedCategory ? (
                <Alert severity="info">{t('Select a category to view or edit details and its standard inspection items.')}</Alert>
              ) : (
                <Stack spacing={3}>
                  <Box component="form" onSubmit={submitEditCategory} sx={{ mt: 1 }}>
                    <Stack spacing={2}>
                      {updateCategory.isError && (
                        <Alert severity="error">
                          {getErrorMessage(updateCategory.error, 'Could not update the category.')}
                        </Alert>
                      )}
                      {updateCategory.isSuccess && (
                        <Alert severity="success">{t('Category updated successfully.')}</Alert>
                      )}
                      <TextField
                        disabled
                        size="small"
                        label={t('Category Code')}
                        value={selectedCategory.code}
                        helperText={t('Standardized code is immutable once provisioned.')}
                      />
                      <TextField
                        required
                        size="small"
                        label={t('Name')}
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                      />
                      <TextField
                        size="small"
                        multiline
                        rows={2}
                        label={t('Description')}
                        value={editDescription}
                        onChange={(event) => setEditDescription(event.target.value)}
                      />
                      <Button
                        type="submit"
                        variant="contained"
                        startIcon={<EditOutlined />}
                        disabled={updateCategory.isPending}
                        sx={{ alignSelf: 'flex-start' }}
                      >
                        {updateCategory.isPending ? t('Saving…') : t('Update category')}
                      </Button>
                    </Stack>
                  </Box>

                  <Divider />

                  <ChecklistTemplateCrudList
                    title={t('Standard Inspection Items for this Category')}
                    subtitle={t(
                      'Admin-defined default checkpoints for this building category. Customers and Managers can also add custom items on individual assets.',
                    )}
                    templateType="CATEGORY_INSPECTION_ITEM"
                    categoryId={selectedCategory.id}
                    placeholder={t('Add standard inspection checkpoint (e.g. Curtain wall silicone sealant)...')}
                  />
                </Stack>
              )}
            </CardContent>
          </Card>
        </Stack>
      ) : (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ alignItems: 'flex-start' }}>
          <Card variant="outlined" sx={{ flex: 1, width: '100%' }}>
            <CardContent>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                <FlightTakeoffRounded color="primary" fontSize="small" />
                <Typography variant="h6">{t('Pre-flight Safety Checklist')}</Typography>
              </Stack>
              <ChecklistTemplateCrudList
                title={t('Mandatory Pre-flight Checks')}
                subtitle={t(
                  'Shown to Inspectors in the Start Field Session dialog before takeoff.',
                )}
                templateType="PRE_FLIGHT"
                placeholder={t('Add pre-flight safety check item...')}
              />
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ flex: 1, width: '100%' }}>
            <CardContent>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                <FlightLandRounded color="success" fontSize="small" />
                <Typography variant="h6">{t('Post-flight Completion Checklist')}</Typography>
              </Stack>
              <ChecklistTemplateCrudList
                title={t('Post-flight Verification Checks')}
                subtitle={t(
                  'Shown to Inspectors in the Complete Session dialog after landing.',
                )}
                templateType="POST_FLIGHT"
                placeholder={t('Add post-flight completion check item...')}
              />
            </CardContent>
          </Card>
        </Stack>
      )}
    </Box>
  );
}
