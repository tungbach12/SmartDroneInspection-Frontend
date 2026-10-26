import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/features/auth/store/authStore';
import {
  useCreateDrone,
  useDrone,
  useDrones,
  useUpdateDroneServiceability,
} from '../hooks/useDrones';
import { DroneInventoryPanel } from './DroneInventoryPanel';

vi.mock('@/features/auth/store/authStore', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('../hooks/useDrones', () => ({
  useCreateDrone: vi.fn(),
  useDrone: vi.fn(),
  useDrones: vi.fn(),
  useUpdateDroneServiceability: vi.fn(),
}));

const DRONE = {
  id: 'drone-1',
  serialNumber: 'SDI-01',
  model: 'Surveyor',
  manufacturer: 'AeroCo',
  registrationNumber: 'VN-UAV-001',
  registrationExpiresAt: '2027-10-01T12:00:00Z',
  payloadMetadata: '{"camera":"thermal"}',
  serviceability: 'ACTIVE' as const,
  lastMaintenanceAt: null,
  nextMaintenanceAt: null,
  notes: null,
  createdAt: '2026-10-01T12:00:00Z',
};

const createDroneMutate = vi.fn();
const serviceabilityMutate = vi.fn();

function setDefaultHooks() {
  vi.mocked(useAuthStore).mockImplementation(((
    selector: (state: { roles: string[] }) => unknown,
  ) => selector({ roles: ['ORG_MANAGER'] })) as never);
  vi.mocked(useDrones).mockReturnValue({
    data: [DRONE],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  } as never);
  vi.mocked(useDrone).mockReturnValue({
    data: DRONE,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  } as never);
  vi.mocked(useCreateDrone).mockReturnValue({
    mutate: createDroneMutate,
    isPending: false,
    isError: false,
    error: null,
  } as never);
  vi.mocked(useUpdateDroneServiceability).mockReturnValue({
    mutate: serviceabilityMutate,
    isPending: false,
    isError: false,
    error: null,
  } as never);
}

describe('DroneInventoryPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDefaultHooks();
  });
  afterEach(() => cleanup());

  it('only enables drone detail query while the drawer is open', () => {
    render(<DroneInventoryPanel />);

    expect(useDrone).toHaveBeenLastCalledWith('', false);

    fireEvent.click(screen.getByRole('button', { name: /open drone/i }));

    expect(useDrone).toHaveBeenLastCalledWith('drone-1', true);
  });

  it('shows organization drones and does not present ACTIVE as flight clearance', () => {
    render(<DroneInventoryPanel />);

    expect(screen.getByText('SDI-01')).toBeTruthy();
    expect(screen.getByText('ACTIVE')).toBeTruthy();
    expect(
      screen.getByText(/does not confirm permission to fly/i),
    ).toBeTruthy();
    expect(
      screen.queryByText(/flight cleared|approved to fly|legal clearance/i),
    ).toBeNull();
  });

  it('provides create controls only to ORG_MANAGER', () => {
    render(<DroneInventoryPanel />);
    expect(
      screen.getByRole('button', { name: /register drone/i }),
    ).toBeTruthy();

    cleanup();
    vi.mocked(useAuthStore).mockImplementation(((
      selector: (state: { roles: string[] }) => unknown,
    ) => selector({ roles: ['ADMIN'] })) as never);
    render(<DroneInventoryPanel />);
    expect(
      screen.queryByRole('button', { name: /register drone/i }),
    ).toBeNull();
  });

  it('displays LEASED ownership badge and expiration date on leased drones', () => {
    vi.mocked(useDrones).mockReturnValue({
      data: [
        {
          ...DRONE,
          id: 'drone-leased',
          serialNumber: 'SDI-LEASE-99',
          ownershipType: 'LEASED',
          leaseId: 'lease-1',
          leaseExpiresAt: '2027-06-15T00:00:00Z',
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    render(<DroneInventoryPanel />);

    expect(screen.getByText('SDI-LEASE-99')).toBeTruthy();
    expect(screen.getByText('LEASED')).toBeTruthy();
    expect(screen.getByText(/Expires/i)).toBeTruthy();
  });

  it('submits registration fields and JSON payload metadata', () => {
    render(<DroneInventoryPanel />);
    fireEvent.click(screen.getByRole('button', { name: /register drone/i }));
    const dialog = screen.getByRole('dialog', { name: /register drone/i });
    fireEvent.change(dialog.querySelector('input[required]')!, {
      target: { value: 'SDI-02' },
    });
    fireEvent.change(within(dialog).getByLabelText(/Registration number/i), {
      target: { value: 'VN-UAV-999' },
    });
    fireEvent.change(within(dialog).getByLabelText(/Camera \/ Sensor model/i), {
      target: { value: 'Zenmuse H20T' },
    });
    fireEvent.change(within(dialog).getByLabelText(/Sensor resolution/i), {
      target: { value: '20 MP' },
    });
    fireEvent.submit(dialog.querySelector('form')!);

    expect(createDroneMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        serialNumber: 'SDI-02',
        registrationNumber: 'VN-UAV-999',
        payloadMetadata: JSON.stringify({
          cameraModel: 'Zenmuse H20T',
          sensorResolution: '20 MP',
          thermalSupport: false,
        }),
      }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('displays registration details in drawer', () => {
    render(<DroneInventoryPanel />);
    fireEvent.click(screen.getByRole('button', { name: /open drone/i }));
    const drawer = screen.getByRole('dialog');
    expect(within(drawer).getByText('VN-UAV-001')).toBeTruthy();
    expect(within(drawer).getByText(/Registration Information/i)).toBeTruthy();
  });

  it('updates serviceability only for ORG_MANAGER', () => {
    render(<DroneInventoryPanel />);
    fireEvent.click(screen.getByRole('button', { name: /open drone/i }));
    const drawer = screen.getByRole('dialog');
    fireEvent.mouseDown(within(drawer).getByLabelText(/serviceability/i));
    fireEvent.click(screen.getByRole('option', { name: 'MAINTENANCE' }));
    expect(serviceabilityMutate).toHaveBeenCalledWith({
      id: 'drone-1',
      serviceability: 'MAINTENANCE',
    });

    cleanup();
    vi.mocked(useAuthStore).mockImplementation(((
      selector: (state: { roles: string[] }) => unknown,
    ) => selector({ roles: ['INSPECTOR'] })) as never);
    render(<DroneInventoryPanel />);
    fireEvent.click(screen.getByRole('button', { name: /open drone/i }));
    const drawerInspect = screen.getByRole('dialog');
    expect(within(drawerInspect).queryByLabelText(/serviceability/i)).toBeNull();
  });

  it('displays loading, error retry and empty states', () => {
    vi.mocked(useDrones).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    } as never);
    const { rerender } = render(<DroneInventoryPanel />);
    expect(screen.getByRole('status').textContent).toMatch(/loading drones/i);

    const retry = vi.fn();
    vi.mocked(useDrones).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('offline'),
      refetch: retry,
    } as never);
    rerender(<DroneInventoryPanel />);
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(retry).toHaveBeenCalledOnce();

    vi.mocked(useDrones).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as never);
    rerender(<DroneInventoryPanel />);
    expect(screen.getByText(/no drones registered/i)).toBeTruthy();
  });
});
