import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { theme } from '@/app/theme/theme';
import { mf1DroneApi } from '../api/mf1DroneApi';
import { extractImageText } from '../utils/imageOcr';
import InspectorDroneRegistrationPage from './InspectorDroneRegistrationPage';

vi.mock('../utils/imageOcr', () => ({
  extractImageText: vi.fn().mockResolvedValue(''),
}));

vi.mock('@/shared/i18n/LocaleProvider', () => ({
  useLocale: () => ({ locale: 'en', setLocale: vi.fn(), t: (s: string) => s }),
}));

vi.mock('@/features/auth/store/authStore', () => ({
  useAuthStore: (selector: (state: { roles: string[] }) => unknown) =>
    selector({ roles: ['INSPECTOR'] }),
}));

vi.mock('../api/droneDocumentConfigApi', () => ({
  droneDocumentConfigApi: {
    list: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../api/droneFeatureConfigApi', () => ({
  droneFeatureConfigApi: {
    list: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../api/mf1DroneApi', () => ({
  mf1DroneApi: {
    mine: vi.fn().mockResolvedValue([]),
    drones: vi.fn().mockResolvedValue([]),
    submit: vi.fn(),
    resubmit: vi.fn(),
    updateMyDroneServiceability: vi.fn(),
    deleteMyDrone: vi.fn(),
    evidence: vi.fn().mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' })),
    presets: vi.fn().mockResolvedValue([
      {
        id: 'dji-m350-rtk',
        model: 'DJI Matrice 350 RTK',
        manufacturer: 'DJI',
        mtowKg: 9.2,
        maxFlightTimeMinutes: 55,
        maxWindResistanceMps: 12,
        maxAltitudeMeters: 7000,
        opticalZoomLevel: '23',
        cameraSensor: 'Zenmuse H20T / H30T (48 MP)',
        features: ['RTK_POSITIONING', 'THERMAL_CAMERA'],
      },
    ]),
    extractSpecs: vi.fn(),
  },
  uploadDroneEvidence: vi.fn(),
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <InspectorDroneRegistrationPage />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('InspectorDroneRegistrationPage auto-fill & presets', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('auto-fills fields when scanning a registration photo/PDF and lets Inspector verify edits', async () => {
    vi.mocked(mf1DroneApi.extractSpecs).mockResolvedValue({
      model: 'DJI Matrice 300 RTK',
      manufacturer: 'DJI',
      serialNumber: '1581F4B0C2301001',
      registrationNumber: 'DK-2026-00892',
      registrationExpiresAt: '2027-12-31',
      mtowKg: 6.3,
      maxFlightTimeMinutes: 55,
      maxWindResistanceMps: 15,
      maxAltitudeMeters: 7000,
      opticalZoomLevel: '23',
      cameraSensor: 'Zenmuse H20T (20 MP)',
      features: ['RTK_POSITIONING'],
      visionEnabled: true,
      extractionSource: 'VISION_AND_PRESET',
      matchedPresetModel: 'DJI Matrice 300 RTK',
      suggestedFields: ['droneName', 'serialNumber', 'registrationNumber', 'registrationExpiresAt'],
      notices: [],
    });

    renderPage();
    fireEvent.click(screen.getAllByRole('button', { name: /Register New Drone/i })[0]!);
    const dialog = await screen.findByRole('dialog');

    const scanButton = within(dialog).getByRole('button', { name: /Scan Photo \/ PDF/i });
    const fileInput = scanButton.querySelector('input[type="file"]') as HTMLInputElement;
    const sampleFile = new File(['%PDF-1.4'], 'uav-reg.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [sampleFile] } });

    await waitFor(() => {
      expect(mf1DroneApi.extractSpecs).toHaveBeenCalledWith(sampleFile, '');
    });

    expect((within(dialog).getByLabelText(/Drone Model/i) as HTMLInputElement).value).toBe(
      'DJI Matrice 300 RTK',
    );
    expect((within(dialog).getByLabelText(/Airframe Serial Number/i) as HTMLInputElement).value).toBe(
      '1581F4B0C2301001',
    );
    expect((within(dialog).getByLabelText(/UAV Registration Number/i) as HTMLInputElement).value).toBe(
      'DK-2026-00892',
    );
    expect(within(dialog).queryByText(/Auto-filled 4 field/i)).toBeNull();

    fireEvent.change(within(dialog).getByLabelText(/Airframe Serial Number/i), {
      target: { value: '1581F4B0C2301009' },
    });
    expect(within(dialog).queryByText(/verify 0\/O, 1\/I characters/i)).toBeNull();
  });

  it('runs browser OCR for uploaded photos and forwards recognized text to backend without preset dropdown', async () => {
    vi.mocked(extractImageText).mockResolvedValueOnce(
      'Drone Model: DJI Matrice 350 RTK\nSerial Number: 1581F4B0C2301099',
    );
    vi.mocked(mf1DroneApi.extractSpecs).mockResolvedValue({
      model: 'DJI Matrice 350 RTK',
      manufacturer: 'DJI',
      serialNumber: '1581F4B0C2301099',
      registrationNumber: null,
      registrationExpiresAt: null,
      mtowKg: 9.2,
      maxFlightTimeMinutes: 55,
      maxWindResistanceMps: 12,
      maxAltitudeMeters: 7000,
      opticalZoomLevel: '23',
      cameraSensor: 'Zenmuse H20T / H30T (48 MP)',
      features: ['RTK_POSITIONING', 'THERMAL_CAMERA'],
      visionEnabled: false,
      extractionSource: 'OCR_TEXT_AND_PRESET',
      matchedPresetModel: 'DJI Matrice 350 RTK',
      suggestedFields: ['droneName', 'manufacturer', 'serialNumber', 'mtowKg'],
      notices: [],
    });

    renderPage();
    fireEvent.click(screen.getAllByRole('button', { name: /Register New Drone/i })[0]!);
    const dialog = await screen.findByRole('dialog');

    expect(within(dialog).queryByLabelText(/Pick a known airframe preset/i)).toBeNull();

    const scanButton = within(dialog).getByRole('button', { name: /Scan Photo \/ PDF/i });
    const fileInput = scanButton.querySelector('input[type="file"]') as HTMLInputElement;
    const photo = new File(['png-bytes'], 'photo.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [photo] } });

    await waitFor(() => {
      expect(extractImageText).toHaveBeenCalledWith(photo);
      expect(mf1DroneApi.extractSpecs).toHaveBeenCalledWith(
        photo,
        'Drone Model: DJI Matrice 350 RTK\nSerial Number: 1581F4B0C2301099',
      );
    });

    expect((within(dialog).getByLabelText(/Drone Model/i) as HTMLInputElement).value).toBe(
      'DJI Matrice 350 RTK',
    );
    expect((within(dialog).getByLabelText(/Airframe Serial Number/i) as HTMLInputElement).value).toBe(
      '1581F4B0C2301099',
    );
    expect((within(dialog).getByLabelText(/Max Takeoff Weight/i) as HTMLInputElement).value).toBe(
      '9.2',
    );
  });
});
