import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { theme } from '@/app/theme/theme';
import AssetCatalogPage from './AssetCatalogPage';

const mocks = vi.hoisted(() => ({
  useCategories: vi.fn(),
  useCreateCategory: vi.fn(),
  useUpdateCategory: vi.fn(),
  useChecklistTemplates: vi.fn(),
  useCreateChecklistTemplate: vi.fn(),
  useUpdateChecklistTemplate: vi.fn(),
  useDeleteChecklistTemplate: vi.fn(),
}));

vi.mock('../hooks/useCatalog', () => ({
  useCategories: () => mocks.useCategories(),
  useCreateCategory: () => mocks.useCreateCategory(),
  useUpdateCategory: () => mocks.useUpdateCategory(),
  useChecklistTemplates: (...args: unknown[]) => mocks.useChecklistTemplates(...args),
  useCreateChecklistTemplate: () => mocks.useCreateChecklistTemplate(),
  useUpdateChecklistTemplate: () => mocks.useUpdateChecklistTemplate(),
  useDeleteChecklistTemplate: () => mocks.useDeleteChecklistTemplate(),
}));

const categories = [
  {
    id: 'cat-1',
    code: 'HIGH_RISE_OFFICE',
    name: 'High-rise office',
    description: 'Office towers',
    active: true,
  },
  {
    id: 'cat-2',
    code: 'WAREHOUSE',
    name: 'Warehouse',
    description: null,
    active: true,
  },
];

const checklistItems = [
  {
    id: 'item-1',
    templateType: 'CATEGORY_INSPECTION_ITEM',
    categoryId: 'cat-1',
    label: 'Check roof membrane',
    sortOrder: 1,
    active: true,
    required: false,
  },
  {
    id: 'item-2',
    templateType: 'CATEGORY_INSPECTION_ITEM',
    categoryId: 'cat-1',
    label: 'Inspect HVAC units',
    sortOrder: 2,
    active: true,
    required: false,
  },
];

function createMutation(overrides: Record<string, unknown> = {}) {
  return {
    mutate: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    reset: vi.fn(),
    isPending: false,
    isError: false,
    isSuccess: false,
    error: null,
    ...overrides,
  };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={['/admin/asset-catalog']}>
          <AssetCatalogPage />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('AssetCatalogPage', () => {
  let updateChecklistMutation: ReturnType<typeof createMutation>;
  let createChecklistMutation: ReturnType<typeof createMutation>;

  beforeEach(() => {
    vi.clearAllMocks();
    updateChecklistMutation = createMutation();
    createChecklistMutation = createMutation();
    mocks.useCategories.mockReturnValue({
      data: categories,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mocks.useCreateCategory.mockReturnValue(createMutation());
    mocks.useUpdateCategory.mockReturnValue(createMutation());
    mocks.useChecklistTemplates.mockReturnValue({
      data: checklistItems,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mocks.useCreateChecklistTemplate.mockReturnValue(createChecklistMutation);
    mocks.useUpdateChecklistTemplate.mockReturnValue(updateChecklistMutation);
    mocks.useDeleteChecklistTemplate.mockReturnValue(createMutation());
  });

  afterEach(cleanup);

  it('renders a clean catalog table without flight configuration tabs', () => {
    renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Asset catalog' })).toBeTruthy();
    expect(screen.getByText('High-rise office')).toBeTruthy();
    expect(screen.getByText('HIGH_RISE_OFFICE')).toBeTruthy();
    expect(screen.getByText('2 items')).toBeTruthy();
    expect(screen.getByText('0 items')).toBeTruthy();
    expect(screen.queryByRole('tab')).toBeNull();
    expect(screen.queryByText('Flight Checklists')).toBeNull();
    expect(screen.queryByText('Drone Documents')).toBeNull();
  });

  it('filters categories by name, code, or description', () => {
    renderPage();
    const search = screen.getByLabelText('Search categories');

    fireEvent.change(search, { target: { value: 'warehouse' } });
    expect(screen.getByText('Warehouse')).toBeTruthy();
    expect(screen.queryByText('High-rise office')).toBeNull();

    fireEvent.change(search, { target: { value: 'office towers' } });
    expect(screen.getByText('High-rise office')).toBeTruthy();
    expect(screen.queryByText('Warehouse')).toBeNull();
  });

  it('filters empty categories and sorts by most checkpoints', async () => {
    renderPage();

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Checkpoints' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Empty' }));

    expect(screen.getByText('Warehouse')).toBeTruthy();
    expect(screen.queryByText('High-rise office')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Sort' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Most items' }));

    const categoryCells = screen.getAllByRole('row').slice(1);
    expect(categoryCells[0]?.textContent).toContain('High-rise office');
  });

  it('opens the centered category dialog on row click and edits details without a code field', async () => {
    renderPage();

    fireEvent.click(screen.getByText('High-rise office'));

    expect(await screen.findByRole('heading', { name: 'Category details' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Standard Inspection Items' })).toBeTruthy();
    expect(within(screen.getByRole('dialog')).getByText('Office towers')).toBeTruthy();
    expect(screen.queryByDisplayValue('HIGH_RISE_OFFICE')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Edit details' }));
    expect(screen.getByDisplayValue('High-rise office')).toBeTruthy();
    expect(screen.queryByDisplayValue('HIGH_RISE_OFFICE')).toBeNull();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeTruthy();
  });

  it('loads the selected category checkpoints', () => {
    renderPage();
    fireEvent.click(screen.getByText('Warehouse'));

    expect(mocks.useChecklistTemplates).toHaveBeenLastCalledWith(
      { type: 'CATEGORY_INSPECTION_ITEM', categoryId: 'cat-2' },
      true,
    );
  });

  it('adds a checkpoint from the toggleable add bar', async () => {
    renderPage();
    fireEvent.click(screen.getByText('High-rise office'));

    fireEvent.click(await screen.findByRole('button', { name: '+ Add checkpoint' }));
    fireEvent.change(screen.getByPlaceholderText('Add standard inspection checkpoint...'), {
      target: { value: 'Check elevators' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add item' }));

    await waitFor(() => {
      expect(createChecklistMutation.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          templateType: 'CATEGORY_INSPECTION_ITEM',
          categoryId: 'cat-1',
          label: 'Check elevators',
          sortOrder: 3,
        }),
        expect.any(Object),
      );
    });
  });

  it('reorders checkpoints by swapping sort order values', async () => {
    renderPage();
    fireEvent.click(screen.getByText('High-rise office'));

    fireEvent.click(
      await screen.findByRole('button', { name: 'Move down Check roof membrane' }),
    );

    await waitFor(() => {
      expect(updateChecklistMutation.mutateAsync).toHaveBeenCalledTimes(2);
    });
    expect(updateChecklistMutation.mutateAsync).toHaveBeenNthCalledWith(1, {
      id: 'item-1',
      input: { label: 'Check roof membrane', sortOrder: 2, active: true },
    });
  });

  it('paginates categories across pages when more than ten exist', () => {
    const manyCategories = Array.from({ length: 12 }, (_, index) => ({
      id: `cat-${index + 1}`,
      code: `CAT_${String(index + 1).padStart(2, '0')}`,
      name: `Category ${String(index + 1).padStart(2, '0')}`,
      description: `Description ${index + 1}`,
      active: true,
    }));
    mocks.useCategories.mockReturnValue({
      data: manyCategories,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderPage();

    expect(screen.getByText('Showing 1–10 of 12')).toBeTruthy();
    expect(screen.getByText('Category 01')).toBeTruthy();
    expect(screen.queryByText('Category 11')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Go to page 2' }));

    expect(screen.getByText('Showing 11–12 of 12')).toBeTruthy();
    expect(screen.getByText('Category 11')).toBeTruthy();
    expect(screen.queryByText('Category 01')).toBeNull();
  });
});
