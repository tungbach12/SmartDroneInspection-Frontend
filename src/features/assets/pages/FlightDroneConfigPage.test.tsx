import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { theme } from '@/app/theme/theme';
import FlightDroneConfigPage from './FlightDroneConfigPage';

const mocks = vi.hoisted(() => ({
  useChecklistTemplates: vi.fn(),
  useCreateChecklistTemplate: vi.fn(),
  useUpdateChecklistTemplate: vi.fn(),
  useDeleteChecklistTemplate: vi.fn(),
}));

vi.mock('../hooks/useCatalog', () => ({
  useChecklistTemplates: (...args: unknown[]) => mocks.useChecklistTemplates(...args),
  useCreateChecklistTemplate: () => mocks.useCreateChecklistTemplate(),
  useUpdateChecklistTemplate: () => mocks.useUpdateChecklistTemplate(),
  useDeleteChecklistTemplate: () => mocks.useDeleteChecklistTemplate(),
}));

vi.mock('../components/DroneDocumentConfigTab', () => ({
  DroneDocumentConfigTab: () => <div>Drone document settings</div>,
}));

vi.mock('../components/DroneFeatureConfigTab', () => ({
  DroneFeatureConfigTab: () => <div>Drone feature settings</div>,
}));

vi.mock('@/features/admin/pages/PilotLicenseClassesPage', () => ({
  default: () => <div>UAV license class settings</div>,
}));

function createMutation() {
  return {
    mutate: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    reset: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  };
}

function renderPage(entry = '/admin/flight-config') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={[entry]}>
          <FlightDroneConfigPage />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('FlightDroneConfigPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useChecklistTemplates.mockReturnValue({
      data: [
        {
          id: 'check-1',
          templateType: 'PRE_FLIGHT',
          categoryId: null,
          label: 'Check battery level',
          sortOrder: 1,
          active: true,
          required: true,
        },
        {
          id: 'check-2',
          templateType: 'PRE_FLIGHT',
          categoryId: null,
          label: 'Verify GPS lock',
          sortOrder: 2,
          active: true,
          required: false,
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mocks.useCreateChecklistTemplate.mockReturnValue(createMutation());
    mocks.useUpdateChecklistTemplate.mockReturnValue(createMutation());
    mocks.useDeleteChecklistTemplate.mockReturnValue(createMutation());
  });

  afterEach(cleanup);

  it('renders the four drone and flight configuration workspaces', () => {
    renderPage();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Drone & Flight config' }),
    ).toBeTruthy();
    expect(screen.getByRole('tab', { name: /Flight Checklists/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /Drone Documents/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /Drone Features & Safety/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /UAV License Classes/i })).toBeTruthy();
    expect(screen.getByText('Check battery level')).toBeTruthy();
    expect(screen.getByText('01')).toBeTruthy();
    expect(screen.queryByText('Asset catalog')).toBeNull();
  });

  it('keeps each flight checklist on its own template type', () => {
    renderPage();

    expect(mocks.useChecklistTemplates).toHaveBeenCalledWith({ type: 'PRE_FLIGHT' }, true);

    fireEvent.click(screen.getByRole('button', { name: 'Post-flight' }));
    expect(mocks.useChecklistTemplates).toHaveBeenCalledWith({ type: 'POST_FLIGHT' }, true);
  });

  it('filters checklist rows by search and policy', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText('Search checklist items'), {
      target: { value: 'gps' },
    });
    expect(screen.getByText('Verify GPS lock')).toBeTruthy();
    expect(screen.queryByText('Check battery level')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Policy' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Required' }));

    expect(screen.getByText('Check battery level')).toBeTruthy();
    expect(screen.queryByText('Verify GPS lock')).toBeNull();
  });

  it('opens the centered checkpoint dialog for create and edit', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Add checkpoint' }));
    expect(await screen.findByRole('dialog')).toBeTruthy();
    expect(screen.getByLabelText(/^Checkpoint/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByText('Check battery level'));
    expect(await screen.findByRole('heading', { name: 'Edit checkpoint' })).toBeTruthy();
    expect(screen.getByDisplayValue('Check battery level')).toBeTruthy();
  });

  it('switches to the drone document, feature, and license class configurations', () => {
    renderPage();

    fireEvent.click(screen.getByRole('tab', { name: /Drone Documents/i }));
    expect(screen.getByText('Drone document settings')).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: /Drone Features & Safety/i }));
    expect(screen.getByText('Drone feature settings')).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: /UAV License Classes/i }));
    expect(screen.getByText('UAV license class settings')).toBeTruthy();
  });

  it('opens the license class tab from the legacy deep link', () => {
    renderPage('/admin/flight-config?tab=license-classes');
    expect(screen.getByText('UAV license class settings')).toBeTruthy();
  });

  it('paginates checklist items and preserves continuous row numbering across pages', () => {
    const manyChecklists = Array.from({ length: 12 }, (_, index) => ({
      id: `pre-${index + 1}`,
      templateType: 'PRE_FLIGHT',
      categoryId: null,
      label: `Checkpoint ${String(index + 1).padStart(2, '0')}`,
      labelVi: null,
      referenceThreshold: null,
      sortOrder: index + 1,
      active: true,
      required: true,
    }));
    mocks.useChecklistTemplates.mockReturnValue({
      data: manyChecklists,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderPage('/admin/flight-config');

    expect(screen.getByText('Showing 1–10 of 12')).toBeTruthy();
    expect(screen.getByText('Checkpoint 01')).toBeTruthy();
    expect(screen.queryByText('Checkpoint 11')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Go to page 2' }));

    expect(screen.getByText('Showing 11–12 of 12')).toBeTruthy();
    expect(screen.getByText('Checkpoint 11')).toBeTruthy();
    expect(screen.getByText('11')).toBeTruthy();
    expect(screen.queryByText('Checkpoint 01')).toBeNull();
  });
});
