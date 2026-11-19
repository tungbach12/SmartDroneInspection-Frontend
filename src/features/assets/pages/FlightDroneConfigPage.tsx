import { useMemo, useState, type FormEvent, type ReactElement } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import AddRounded from '@mui/icons-material/AddRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import FlightLandRounded from '@mui/icons-material/FlightLandRounded';
import FlightTakeoffRounded from '@mui/icons-material/FlightTakeoffRounded';
import TuneRounded from '@mui/icons-material/TuneRounded';
import BadgeOutlined from '@mui/icons-material/BadgeOutlined';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryState } from '@/shared/ui/QueryState';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { AdminTableToolbar } from '@/features/admin/components/AdminTableToolbar';
import {
  useChecklistTemplates,
  useCreateChecklistTemplate,
  useDeleteChecklistTemplate,
  useUpdateChecklistTemplate,
} from '../hooks/useCatalog';
import type { ChecklistTemplate } from '../api/catalogApi';
import { DroneDocumentConfigTab } from '../components/DroneDocumentConfigTab';
import { DroneFeatureConfigTab } from '../components/DroneFeatureConfigTab';
import PilotLicenseClassesPage from '@/features/admin/pages/PilotLicenseClassesPage';

type FlightConfigTab = 'checklists' | 'documents' | 'features' | 'license-classes';
type ChecklistKind = 'PRE_FLIGHT' | 'POST_FLIGHT';
type PolicyFilter = 'ALL' | 'REQUIRED' | 'OPTIONAL';

const FLIGHT_CONFIG_TABS: ReadonlyArray<{
  value: FlightConfigTab;
  label: string;
  icon: ReactElement;
}> = [
  {
    value: 'checklists',
    label: 'Flight Checklists',
    icon: <FlightTakeoffRounded fontSize="small" />,
  },
  {
    value: 'documents',
    label: 'Drone Documents',
    icon: <DescriptionOutlined fontSize="small" />,
  },
  {
    value: 'features',
    label: 'Drone Features & Safety',
    icon: <TuneRounded fontSize="small" />,
  },
  {
    value: 'license-classes',
    label: 'UAV License Classes',
    icon: <BadgeOutlined fontSize="small" />,
  },
];

function resolveTab(value: string | null): FlightConfigTab {
  const match = FLIGHT_CONFIG_TABS.find((tab) => tab.value === value);
  return match?.value ?? 'checklists';
}

export default function FlightDroneConfigPage() {
  const { t } = useLocale();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = resolveTab(searchParams.get('tab'));

  const changeTab = (value: FlightConfigTab) => {
    setSearchParams(value === 'checklists' ? {} : { tab: value });
  };

  return (
    <Box className="workspace-page workspace-page--flight-config">
      <PageHeader
        title={t('Drone & Flight config')}
        subtitle={t(
          'Configure pre-flight and post-flight checklists, drone document requirements, safety features, and UAV license classes used across inspections.',
        )}
        breadcrumbs={[
          { label: t('Governance'), to: '/admin/dashboard' },
          { label: t('Drone & Flight config') },
        ]}
      />

      <Tabs
        value={activeTab}
        onChange={(_event: unknown, value: FlightConfigTab) => changeTab(value)}
        variant="scrollable"
        scrollButtons="auto"
        aria-label={t('Drone & Flight config')}
        sx={{
          mb: 2.5,
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTab-root': { px: 1.5 },
        }}
      >
        {FLIGHT_CONFIG_TABS.map((tab) => (
          <Tab
            key={tab.value}
            value={tab.value}
            icon={tab.icon}
            iconPosition="start"
            label={t(tab.label)}
          />
        ))}
      </Tabs>

      {activeTab === 'checklists' && <FlightChecklistsTab />}
      {activeTab === 'documents' && <DroneDocumentConfigTab />}
      {activeTab === 'features' && <DroneFeatureConfigTab />}
      {activeTab === 'license-classes' && <PilotLicenseClassesPage embedded />}
    </Box>
  );
}

function FlightChecklistsTab() {
  const { t } = useLocale();
  const [kind, setKind] = useState<ChecklistKind>('PRE_FLIGHT');
  const [search, setSearch] = useState('');
  const [policy, setPolicy] = useState<PolicyFilter>('ALL');

  const templatesQuery = useChecklistTemplates({ type: kind }, true);
  const createTemplate = useCreateChecklistTemplate();
  const updateTemplate = useUpdateChecklistTemplate();
  const deleteTemplate = useDeleteChecklistTemplate();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ChecklistTemplate | null>(null);
  const [label, setLabel] = useState('');
  const [required, setRequired] = useState(kind === 'PRE_FLIGHT');
  const [deleting, setDeleting] = useState<ChecklistTemplate | null>(null);

  const items = useMemo(
    () =>
      [...(templatesQuery.data ?? [])].sort(
        (left, right) =>
          left.sortOrder - right.sortOrder || left.label.localeCompare(right.label),
      ),
    [templatesQuery.data],
  );

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (query && !item.label.toLowerCase().includes(query)) return false;
      if (policy === 'REQUIRED' && !item.required) return false;
      if (policy === 'OPTIONAL' && item.required) return false;
      return true;
    });
  }, [items, policy, search]);

  const openCreate = () => {
    createTemplate.reset();
    updateTemplate.reset();
    setEditing(null);
    setLabel('');
    setRequired(kind === 'PRE_FLIGHT');
    setDialogOpen(true);
  };

  const openEdit = (item: ChecklistTemplate) => {
    createTemplate.reset();
    updateTemplate.reset();
    setEditing(item);
    setLabel(item.label);
    setRequired(item.required);
    setDialogOpen(true);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = label.trim();
    if (!trimmed) return;
    if (editing) {
      updateTemplate.mutate(
        {
          id: editing.id,
          input: { label: trimmed, sortOrder: editing.sortOrder, active: editing.active, required },
        },
        { onSuccess: () => setDialogOpen(false) },
      );
      return;
    }
    const nextSortOrder = items.reduce((highest, item) => Math.max(highest, item.sortOrder), 0) + 1;
    createTemplate.mutate(
      { templateType: kind, categoryId: null, label: trimmed, sortOrder: nextSortOrder, required },
      { onSuccess: () => setDialogOpen(false) },
    );
  };

  const mutationError = createTemplate.error ?? updateTemplate.error ?? deleteTemplate.error;
  const mutationIsError =
    createTemplate.isError || updateTemplate.isError || deleteTemplate.isError;

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', mb: 2 }}
      >
        <ToggleButtonGroup
          exclusive
          size="small"
          value={kind}
          onChange={(_, value: ChecklistKind | null) => {
            if (value) setKind(value);
          }}
          aria-label={t('Checklist phase')}
        >
          <ToggleButton value="PRE_FLIGHT" sx={{ px: 2, fontWeight: 600, gap: 0.75 }}>
            <FlightTakeoffRounded fontSize="small" />
            {t('Pre-flight')}
          </ToggleButton>
          <ToggleButton value="POST_FLIGHT" sx={{ px: 2, fontWeight: 600, gap: 0.75 }}>
            <FlightLandRounded fontSize="small" />
            {t('Post-flight')}
          </ToggleButton>
        </ToggleButtonGroup>

        <Button
          variant="contained"
          startIcon={<AddRounded />}
          onClick={openCreate}
          sx={{ whiteSpace: 'nowrap' }}
        >
          {t('Add checkpoint')}
        </Button>
      </Stack>

      <AdminTableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={t('Search checklist items')}
        visibleCount={rows.length}
        totalCount={items.length}
        onClearAll={() => setPolicy('ALL')}
        filters={[
          {
            key: 'policy',
            label: t('Policy'),
            value: policy,
            options: [
              { value: 'ALL', label: t('All policies') },
              { value: 'REQUIRED', label: t('Required') },
              { value: 'OPTIONAL', label: t('Optional') },
            ],
            onChange: (value) => setPolicy(value as PolicyFilter),
          },
        ]}
      />

      {mutationIsError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {t('Could not save the checklist change.')}
          {mutationError instanceof Error ? ` ${mutationError.message}` : ''}
        </Alert>
      )}

      <QueryState
        isLoading={templatesQuery.isLoading}
        error={templatesQuery.error}
        onRetry={() => void templatesQuery.refetch()}
      >
        <Paper variant="outlined" sx={{ borderRadius: '10px', overflow: 'hidden', borderColor: 'divider' }}>
          <TableContainer>
            <Table size="small" aria-label={kind === 'PRE_FLIGHT' ? t('Pre-flight Check Items') : t('Post-flight Verification Checks')}>
              <TableHead>
                <TableRow>
                  {['#', t('Checkpoint'), t('Policy'), ''].map((header, index) => (
                    <TableCell
                      key={header || 'actions'}
                      align={index === 3 ? 'right' : 'left'}
                      sx={{
                        width: index === 0 ? 60 : index === 2 ? 130 : index === 3 ? 110 : undefined,
                        bgcolor: (muiTheme) =>
                          muiTheme.palette.mode === 'dark'
                            ? 'rgba(255, 255, 255, 0.03)'
                            : '#F9FAFB',
                        color: 'text.secondary',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}
                    >
                      {header}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Typography color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
                        {items.length === 0
                          ? t('No checklist items defined yet. Add the first item above.')
                          : t('No checklist items match the current filters.')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((item, index) => (
                    <TableRow
                      key={item.id}
                      hover
                      tabIndex={0}
                      onClick={() => openEdit(item)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          openEdit(item);
                        }
                      }}
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
                      <TableCell sx={{ width: 60 }}>
                        <Box
                          component="span"
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 28,
                            height: 24,
                            borderRadius: '6px',
                            border: '1px solid',
                            borderColor: 'divider',
                            bgcolor: 'background.default',
                            fontFamily: 'monospace',
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            color: 'text.secondary',
                          }}
                        >
                          {String(index + 1).padStart(2, '0')}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: 1.25 }}>
                        <Typography sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
                          {item.label}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={item.required ? t('Required') : t('Optional')}
                          sx={{
                            fontWeight: 600,
                            bgcolor: item.required ? 'rgba(55, 88, 249, 0.10)' : 'background.default',
                            color: item.required ? 'primary.dark' : 'text.secondary',
                            border: '1px solid',
                            borderColor: item.required ? 'rgba(55, 88, 249, 0.25)' : 'divider',
                          }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ pr: 1.5 }}>
                        <Stack direction="row" spacing={0.25} sx={{ justifyContent: 'flex-end' }}>
                          <IconButton
                            size="small"
                            aria-label={`${t('Edit checkpoint')} ${item.label}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              openEdit(item);
                            }}
                          >
                            <EditOutlined fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            aria-label={`${t('Delete checkpoint')} ${item.label}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              setDeleting(item);
                            }}
                          >
                            <DeleteOutlineRounded fontSize="small" />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </QueryState>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <form onSubmit={submit}>
          <DialogTitle>
            {editing ? t('Edit checkpoint') : t('Add checkpoint')}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                required
                autoFocus
                size="small"
                label={t('Checkpoint')}
                value={label}
                onChange={(event) => setLabel(event.target.value)}
              />
              <TextField
                select
                size="small"
                label={t('Policy')}
                value={required ? 'REQUIRED' : 'OPTIONAL'}
                onChange={(event) => setRequired(event.target.value === 'REQUIRED')}
              >
                <MenuItem value="REQUIRED">{t('Required')}</MenuItem>
                <MenuItem value="OPTIONAL">{t('Optional')}</MenuItem>
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>{t('Cancel')}</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createTemplate.isPending || updateTemplate.isPending || !label.trim()}
            >
              {createTemplate.isPending || updateTemplate.isPending ? t('Saving…') : t('Save')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        title={t('Delete checklist item')}
        message={deleting ? `${t('Are you sure you want to delete')} "${deleting.label}"?` : ''}
        confirmLabel={t('Delete')}
        cancelLabel={t('Cancel')}
        severity="danger"
        loading={deleteTemplate.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          deleteTemplate.mutate(deleting.id, { onSuccess: () => setDeleting(null) });
        }}
      />
    </Box>
  );
}
