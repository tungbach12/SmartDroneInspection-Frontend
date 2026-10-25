import { AxiosError } from 'axios';
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
  useDroneDocuments,
  useDrones,
  useUpdateDroneDocumentStatus,
  useUpdateDroneServiceability,
  useUploadDroneDocument,
} from '../hooks/useDrones';
import { DroneInventoryPanel } from './DroneInventoryPanel';

vi.mock('@/features/auth/store/authStore', () => ({
  useAuthStore: vi.fn(),
}));
function problemError(
  status: number,
  detail: string,
  code: string,
): AxiosError {
  return new AxiosError(
    `Request failed with status code ${status}`,
    'ERR_BAD_RESPONSE',
    undefined,
    undefined,
    {
      data: { type: 'about:blank', title: 'Error', status, detail, code },
      status,
      statusText: 'Error',
      headers: {},
      config: { headers: {} } as never,
    },
  );
}

vi.mock('../hooks/useDrones', () => ({
  useCreateDrone: vi.fn(),
  useDrone: vi.fn(),
  useDroneDocuments: vi.fn(),
  useDrones: vi.fn(),
  useUpdateDroneDocumentStatus: vi.fn(),
  useUpdateDroneServiceability: vi.fn(),
  useUploadDroneDocument: vi.fn(),
}));

const DRONE = {
  id: 'drone-1',
  serialNumber: 'SDI-01',
  model: 'Surveyor',
  manufacturer: 'AeroCo',
  payloadMetadata: '{"camera":"thermal"}',
  serviceability: 'ACTIVE' as const,
  lastMaintenanceAt: null,
  nextMaintenanceAt: null,
  notes: null,
  createdAt: '2026-10-01T12:00:00Z',
};

const createDroneMutate = vi.fn();
const serviceabilityMutate = vi.fn();
const uploadDocumentMutate = vi.fn();
const updateDocumentStatusMutate = vi.fn();

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
  vi.mocked(useDroneDocuments).mockReturnValue({
    data: [],
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
  vi.mocked(useUploadDroneDocument).mockReturnValue({
    mutate: uploadDocumentMutate,
    isPending: false,
    isError: false,
    error: null,
  } as never);
  vi.mocked(useUpdateDroneDocumentStatus).mockReturnValue({
    mutate: updateDocumentStatusMutate,
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

  it('only enables drone detail queries while the drawer is open', () => {
    render(<DroneInventoryPanel />);

    expect(useDrone).toHaveBeenLastCalledWith('', false);
    expect(useDroneDocuments).toHaveBeenLastCalledWith('', false);

    fireEvent.click(screen.getByRole('button', { name: /open drone/i }));

    expect(useDrone).toHaveBeenLastCalledWith('drone-1', true);
    expect(useDroneDocuments).toHaveBeenLastCalledWith('drone-1', true);
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

  it('submits JSON payload metadata without sending organization scope', () => {
    render(<DroneInventoryPanel />);
    fireEvent.click(screen.getByRole('button', { name: /register drone/i }));
    const dialog = screen.getByRole('dialog', { name: /register drone/i });
    fireEvent.change(dialog.querySelector('input[required]')!, {
      target: { value: 'SDI-02' },
    });
    fireEvent.change(within(dialog).getByLabelText(/Camera \/ Sensor model/i), {
      target: { value: 'Zenmuse H20T' },
    });
    fireEvent.change(within(dialog).getByLabelText(/Sensor resolution/i), {
      target: { value: '20 MP' },
    });
    fireEvent.submit(dialog.querySelector('form')!);

    expect(createDroneMutate).toHaveBeenCalledWith(
      {
        serialNumber: 'SDI-02',
        payloadMetadata: JSON.stringify({
          cameraModel: 'Zenmuse H20T',
          sensorResolution: '20 MP',
          thermalSupport: false,
        }),
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('offers only supported document files and displays expired status distinctly', async () => {
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
    vi.mocked(useDroneDocuments).mockReturnValue({
      data: [
        {
          id: 'doc-expired',
          droneId: 'drone-1',
          documentType: 'AIRWORTHINESS',
          issuer: 'Authority',
          documentReference: 'CERT-1',
          validFrom: null,
          validUntil: '2026-01-01T00:00:00Z',
          status: 'EXPIRED',
          checksumSha256: 'server-checksum',
          uploadedByUserId: 'u1',
          reviewedByUserId: null,
          reviewedAt: null,
          createdAt: '2025-01-01T00:00:00Z',
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as never);
    render(<DroneInventoryPanel />);
    fireEvent.click(screen.getByRole('button', { name: /open drone/i }));

    expect((await screen.findAllByText('EXPIRED')).length).toBeGreaterThan(0);
    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    expect(fileInput.accept).toBe(
      'image/png,image/jpeg,image/webp,application/pdf',
    );
    expect(screen.queryByLabelText(/checksum/i)).toBeNull();
  });

  it('clears selected file bytes after successful upload', async () => {
    vi.mocked(useDroneDocuments).mockReturnValue({ data: [], isLoading: false, error: null, refetch: vi.fn() } as never);
    render(<DroneInventoryPanel />);
    fireEvent.click(screen.getByRole('button', { name: /open drone/i }));
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['synthetic document'], 'inspection.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /upload document/i }));

    const options = uploadDocumentMutate.mock.calls[0]![1] as { onSuccess: () => void };
    options.onSuccess();

    expect(fileInput.value).toBe('');
    expect(await screen.findByRole('button', { name: /choose document file/i })).toBeTruthy();
  });

  it('shows the server size limit after a 413 upload response', () => {
    vi.mocked(useUploadDroneDocument).mockReturnValue({
      mutate: uploadDocumentMutate,
      isPending: false,
      isError: true,
      error: problemError(
        413,
        'Maximum document size is 10 MB',
        'PAYLOAD_TOO_LARGE',
      ),
    } as never);
    render(<DroneInventoryPanel />);
    fireEvent.click(screen.getByRole('button', { name: /open drone/i }));
    expect(screen.getByText(/maximum document size is 10 MB/i)).toBeTruthy();
  });

  it('shows the allowed document media types after a 415 response', () => {
    vi.mocked(useUploadDroneDocument).mockReturnValue({
      mutate: uploadDocumentMutate,
      isPending: false,
      isError: true,
      error: problemError(
        415,
        'Allowed types: png, jpeg, webp, pdf',
        'UNSUPPORTED_MEDIA_TYPE',
      ),
    } as never);
    render(<DroneInventoryPanel />);
    fireEvent.click(screen.getByRole('button', { name: /open drone/i }));
    expect(
      screen.getByText(/allowed types: png, jpeg, webp, pdf/i),
    ).toBeTruthy();
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
    expect(
      screen.queryByRole('button', { name: /upload document/i }),
    ).toBeNull();
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
