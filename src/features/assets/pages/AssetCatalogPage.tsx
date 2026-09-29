import { useState, type FormEvent } from 'react';
import { Add, DeleteOutlined } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryState } from '@/shared/ui/QueryState';
import type { FrequencyUnit } from '../api/catalogApi';
import {
  useAddFrequency,
  useCategories,
  useCreateCategory,
  useDeleteFrequency,
  useFrequencies,
} from '../hooks/useCatalog';

const FREQUENCY_UNITS: FrequencyUnit[] = ['DAY', 'WEEK', 'MONTH', 'YEAR'];

export default function AssetCatalogPage() {
  const categories = useCategories();
  const createCategory = useCreateCategory();
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const frequencies = useFrequencies(selectedCategoryId);
  const addFrequency = useAddFrequency(selectedCategoryId);
  const deleteFrequency = useDeleteFrequency(selectedCategoryId);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState<FrequencyUnit>('MONTH');
  const [interval, setIntervalValue] = useState('3');

  const submitCategory = (event: FormEvent) => {
    event.preventDefault();
    createCategory.mutate(
      { code, name, description: description || null },
      {
        onSuccess: (category) => {
          setCode('');
          setName('');
          setDescription('');
          setSelectedCategoryId(category.id);
        },
      },
    );
  };

  const submitFrequency = (event: FormEvent) => {
    event.preventDefault();
    addFrequency.mutate(
      { frequencyUnit: unit, frequencyInterval: Number(interval) },
      { onSuccess: () => setIntervalValue('3') },
    );
  };

  return (
    <Box>
      <PageHeader
        title="Asset catalog"
        subtitle="Maintain inspection categories and the frequencies suggested for each one"
      />
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ alignItems: 'flex-start' }}>
        <Card variant="outlined" sx={{ flex: 1, width: '100%' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Categories
            </Typography>
            <QueryState
              isLoading={categories.isLoading}
              error={categories.error}
              onRetry={() => void categories.refetch()}
              isEmpty={Boolean(categories.data && categories.data.length === 0)}
              empty={<Alert severity="info">No categories yet. Create the first one below.</Alert>}
            >
              <Stack spacing={1}>
                {categories.data?.map((category) => (
                  <Button
                    key={category.id}
                    variant={category.id === selectedCategoryId ? 'contained' : 'outlined'}
                    onClick={() => setSelectedCategoryId(category.id)}
                    sx={{ justifyContent: 'space-between' }}
                  >
                    {category.name} ({category.code})
                  </Button>
                ))}
              </Stack>
            </QueryState>

            <Box component="form" onSubmit={submitCategory} sx={{ mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                New category
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
                  label="Code"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                />
                <TextField
                  required
                  size="small"
                  label="Name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
                <TextField
                  size="small"
                  label="Description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<Add />}
                  disabled={createCategory.isPending}
                >
                  Save category
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ flex: 1, width: '100%' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Suggested frequencies
            </Typography>
            {!selectedCategoryId ? (
              <Alert severity="info">Select a category to manage its suggested frequencies.</Alert>
            ) : (
              <>
                <QueryState
                  isLoading={frequencies.isLoading}
                  error={frequencies.error}
                  onRetry={() => void frequencies.refetch()}
                  isEmpty={Boolean(frequencies.data && frequencies.data.length === 0)}
                  empty={
                    <Alert severity="warning">
                      No suggested frequency yet. An asset review in this category will fail until
                      one exists.
                    </Alert>
                  }
                >
                  <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                    {frequencies.data?.map((frequency) => (
                      <Chip
                        key={frequency.id}
                        label={`Every ${frequency.frequencyInterval} ${frequency.frequencyUnit.toLowerCase()}(s)`}
                        onDelete={
                          deleteFrequency.isPending
                            ? undefined
                            : () => deleteFrequency.mutate(frequency.id)
                        }
                        deleteIcon={<DeleteOutlined />}
                      />
                    ))}
                  </Stack>
                </QueryState>

                <Box component="form" onSubmit={submitFrequency} sx={{ mt: 3 }}>
                  <Stack spacing={2}>
                    {(addFrequency.isError || deleteFrequency.isError) && (
                      <Alert severity="error">
                        {getErrorMessage(
                          addFrequency.error ?? deleteFrequency.error,
                          'Could not update the suggested frequencies.',
                        )}
                      </Alert>
                    )}
                    <TextField
                      select
                      size="small"
                      label="Unit"
                      value={unit}
                      onChange={(event) => setUnit(event.target.value as FrequencyUnit)}
                    >
                      {FREQUENCY_UNITS.map((value) => (
                        <MenuItem key={value} value={value}>
                          {value}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      required
                      size="small"
                      type="number"
                      label="Interval"
                      value={interval}
                      onChange={(event) => setIntervalValue(event.target.value)}
                      slotProps={{ htmlInput: { min: 1 } }}
                    />
                    <Button
                      type="submit"
                      variant="contained"
                      startIcon={<Add />}
                      disabled={addFrequency.isPending}
                    >
                      Add frequency
                    </Button>
                  </Stack>
                </Box>
              </>
            )}
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
