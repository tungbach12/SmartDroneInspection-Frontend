import { type KeyboardEvent, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import { useAsset } from '@/features/assets/hooks/useAssets';
import { useChecklistTemplates } from '@/features/assets/hooks/useCatalog';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import type { ServiceRequest } from '../../api/contractApi';
import { useUpdateServiceRequestInspectionItems } from '../../hooks/useContracts';
import { extractContractErrorText } from '../../shared/contractStage';

interface RequestCheckpointsEditorProps {
  request: ServiceRequest;
  readOnly?: boolean;
  onChanged?: () => void;
  onError: (message: string) => void;
}

function normalizeItems(items: string[] | undefined): string[] {
  if (!items || items.length === 0) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of items) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

function RequestCheckpointsForm({
  request,
  readOnly = false,
  onChanged,
  onError,
}: RequestCheckpointsEditorProps) {
  const { t } = useLocale();
  const savedItems = normalizeItems(request.inspectionItems);
  const [open, setOpen] = useState(false);
  const [draftItems, setDraftItems] = useState<string[]>(savedItems);
  const [customInput, setCustomInput] = useState('');

  const assetQuery = useAsset(request.assetId);
  const assetSuggestions = normalizeItems(assetQuery.data?.inspectionItems);
  const categoryId = assetQuery.data?.categoryId ?? null;

  const templatesQuery = useChecklistTemplates(
    { type: 'CATEGORY_INSPECTION_ITEM', categoryId },
    Boolean(categoryId),
  );
  const assetSuggestionKeys = new Set(assetSuggestions.map((item) => item.toLowerCase()));
  const categoryTemplates = normalizeItems(
    (templatesQuery.data ?? [])
      .filter((item) => item.active)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => item.label),
  ).filter((label) => !assetSuggestionKeys.has(label.toLowerCase()));

  const saveMutation = useUpdateServiceRequestInspectionItems(request.id);

  const selectedKeys = new Set(draftItems.map((item) => item.toLowerCase()));
  const isDirty =
    draftItems.length !== savedItems.length ||
    draftItems.some((item, index) => item !== savedItems[index]);

  const addItems = (candidates: string[]) => {
    setDraftItems((prev) => normalizeItems([...prev, ...candidates]));
  };

  const removeItem = (label: string) => {
    setDraftItems((prev) => prev.filter((item) => item !== label));
  };

  const handleOpenDialog = () => {
    setDraftItems(savedItems);
    setCustomInput('');
    setOpen(true);
  };

  const handleCloseDialog = () => {
    if (saveMutation.isPending) return;
    setDraftItems(savedItems);
    setCustomInput('');
    setOpen(false);
  };

  const handleAddCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    addItems([trimmed]);
    setCustomInput('');
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddCustom();
    }
  };

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync(draftItems);
      setOpen(false);
      onChanged?.();
    } catch (error) {
      onError(extractContractErrorText(error, t('Failed to save inspection checkpoints.')));
    }
  };

  const suggestionGroups = [
    {
      title: t('Suggested from asset'),
      items: assetSuggestions.filter((item) => !selectedKeys.has(item.toLowerCase())),
      loading: false,
    },
    {
      title: t('Category templates'),
      items: categoryTemplates.filter((item) => !selectedKeys.has(item.toLowerCase())),
      loading: Boolean(categoryId && templatesQuery.isPending),
    },
  ].filter((group) => group.items.length > 0 || group.loading);

  const summaryItems = savedItems.length > 0 ? savedItems : assetSuggestions;
  const summaryCount = summaryItems.length;

  return (
    <>
      <Box
        sx={{
          px: 1.5,
          py: 1.25,
          borderRadius: '8px',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.default',
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.25}
          sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {t('Inspection Checkpoints')}
            </Typography>
            <Chip
              size="small"
              variant="outlined"
              color={savedItems.length > 0 ? 'primary' : 'default'}
              label={
                savedItems.length > 0
                  ? `${savedItems.length} ${savedItems.length === 1 ? t('checkpoint') : t('checkpoints')}`
                  : summaryCount > 0
                    ? `${summaryCount} · ${t('Asset suggested')}`
                    : '0'
              }
              sx={{ borderRadius: '6px', fontWeight: 600 }}
            />
            {readOnly && (
              <Chip
                size="small"
                variant="outlined"
                icon={<LockOutlinedIcon sx={{ fontSize: 13 }} />}
                label={t('Locked')}
                sx={{ borderRadius: '6px', fontWeight: 600 }}
              />
            )}
          </Stack>

          {!readOnly && (
            <Button
              size="small"
              variant="outlined"
              startIcon={
                savedItems.length > 0 ? (
                  <EditOutlinedIcon fontSize="small" />
                ) : (
                  <TuneOutlinedIcon fontSize="small" />
                )
              }
              onClick={handleOpenDialog}
              sx={{
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 600,
                flexShrink: 0,
                alignSelf: { xs: 'flex-start', sm: 'center' },
              }}
            >
              {savedItems.length > 0 ? t('Edit checkpoints') : t('Configure checkpoints')}
            </Button>
          )}
        </Stack>
      </Box>

      <Dialog
        open={open}
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="md"
        aria-labelledby="request-checkpoints-dialog-title"
        slotProps={{
          paper: {
            sx: {
              borderRadius: '10px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
            },
          },
        }}
      >
        <DialogTitle
          id="request-checkpoints-dialog-title"
          sx={{
            px: { xs: 2, sm: 3 },
            py: 1.75,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {t('Inspection Checkpoints')}
                </Typography>
                <Chip
                  size="small"
                  variant="outlined"
                  label={draftItems.length}
                  sx={{ borderRadius: '6px', fontWeight: 700 }}
                />
                {isDirty && (
                  <Chip
                    size="small"
                    color="warning"
                    variant="outlined"
                    label={t('Unsaved changes')}
                    sx={{ borderRadius: '6px', fontWeight: 600 }}
                  />
                )}
              </Stack>
            </Box>
            <IconButton
              aria-label={t('Close')}
              disabled={saveMutation.isPending}
              onClick={handleCloseDialog}
              size="small"
            >
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent dividers sx={{ px: { xs: 2, sm: 3 }, py: 2, bgcolor: 'background.paper' }}>
          <Stack spacing={2}>
            <Box>
              <Stack
                direction="row"
                sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  {t('Configured for this request')}
                </Typography>
                {draftItems.length > 0 && (
                  <Button
                    size="small"
                    variant="text"
                    color="inherit"
                    onClick={() => setDraftItems([])}
                    sx={{ textTransform: 'none', fontWeight: 600, py: 0, color: 'text.secondary' }}
                  >
                    {t('Clear all')}
                  </Button>
                )}
              </Stack>

              {draftItems.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {t(
                    'No request checkpoints selected yet. Add custom items or pick from suggestions below.',
                  )}
                </Typography>
              ) : (
                <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                  {draftItems.map((item) => (
                    <Chip
                      key={item}
                      size="small"
                      color="primary"
                      variant="outlined"
                      label={item}
                      onDelete={() => removeItem(item)}
                      sx={{
                        borderRadius: '6px',
                        fontWeight: 600,
                        maxWidth: '100%',
                        height: 'auto',
                        minHeight: 24,
                        '& .MuiChip-label': { whiteSpace: 'normal', overflowWrap: 'anywhere', py: 0.25 },
                      }}
                    />
                  ))}
                </Stack>
              )}
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField
                fullWidth
                size="small"
                label={t('Add custom checkpoint')}
                placeholder={t('Add custom checkpoint...')}
                value={customInput}
                onChange={(event) => setCustomInput(event.target.value)}
                onKeyDown={handleInputKeyDown}
              />
              <Button
                variant="outlined"
                startIcon={<AddRoundedIcon fontSize="small" />}
                disabled={!customInput.trim()}
                onClick={handleAddCustom}
                sx={{
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {t('Add')}
              </Button>
            </Stack>

            {suggestionGroups.map(({ title, items, loading }) => (
              <Box key={title} sx={{ pt: 1.25, borderTop: '1px solid', borderColor: 'divider' }}>
                <Stack
                  direction="row"
                  sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 0.5 }}
                >
                  <Typography variant="subtitle2" component="h3">
                    {title}
                  </Typography>
                  {items.length > 0 && (
                    <Button
                      size="small"
                      onClick={() => addItems(items)}
                      sx={{ textTransform: 'none', fontWeight: 600, flexShrink: 0 }}
                    >
                      {t('Add all')}
                    </Button>
                  )}
                </Stack>
                {loading ? (
                  <Typography variant="caption" color="text.secondary">
                    {t('Loading templates…')}
                  </Typography>
                ) : (
                  <List disablePadding aria-label={title}>
                    {items.map((item) => (
                      <ListItem key={item} disablePadding divider>
                        <ListItemButton
                          component="button"
                          onClick={() => addItems([item])}
                          sx={{ width: '100%', gap: 1, px: 1, py: 0.75, alignItems: 'center' }}
                        >
                          <AddRoundedIcon fontSize="small" color="primary" />
                          <Typography
                            variant="body2"
                            sx={{ textAlign: 'left', overflowWrap: 'anywhere' }}
                          >
                            {item}
                          </Typography>
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
            ))}
          </Stack>
        </DialogContent>

        <DialogActions
          sx={{
            px: { xs: 2, sm: 3 },
            py: 1.5,
            borderTop: '1px solid',
            borderColor: 'divider',
            justifyContent: 'space-between',
          }}
        >
          <Box>
            {isDirty && (
              <Button
                size="small"
                variant="text"
                disabled={saveMutation.isPending}
                onClick={() => setDraftItems(savedItems)}
                sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
              >
                {t('Reset')}
              </Button>
            )}
          </Box>
          <Stack direction="row" spacing={1}>
            <LoadingButton
              loading={saveMutation.isPending}
              disabled={!isDirty}
              variant="contained"
              size="small"
              onClick={() => void handleSave()}
              sx={{
                borderRadius: '8px',
                fontWeight: 700,
                textTransform: 'none',
                boxShadow: 'none',
              }}
            >
              {t('Save checkpoints')}
            </LoadingButton>
          </Stack>
        </DialogActions>
      </Dialog>
    </>
  );
}

export function RequestCheckpointsEditor(props: RequestCheckpointsEditorProps) {
  const serverKey = normalizeItems(props.request.inspectionItems).join('\u0001');
  return <RequestCheckpointsForm key={`${props.request.id}:${serverKey}`} {...props} />;
}
