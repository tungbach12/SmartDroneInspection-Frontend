import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/shared/api/client';
import { usePartnerCapabilities } from '../hooks/useContracts';
import { PartnerCandidateResults, candidateMatchesFilters, DEFAULT_FILTERS } from './PartnerCandidateResults';
import type { PartnerCandidate } from '../api/contractApi';

vi.mock('@/shared/api/client', () => ({
  api: {
    defaults: { baseURL: '/api/v1' },
    get: vi.fn(),
  },
}));
vi.mock('../hooks/useContracts', () => ({ usePartnerCapabilities: vi.fn() }));

function renderWithQuery(ui: React.ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}



const passingCandidate: PartnerCandidate = {
  inspectorId: 'insp-pass',
  droneId: 'drone-pass',
  inspectorName: 'Tran Minh Quan',
  inspectorAvatarUrl: 'https://cdn.example.test/avatars/quan.png',
  droneSerialNumber: 'SDI-700',
  droneModel: 'Matrice 350 RTK',
  droneHasImage: true,
  droneFeatureCodes: ['THERMAL_CAMERA', 'RTK_POSITIONING'],
  eligibility: 'PASS',
  capabilityFit: 'MATCH',
  droneMaxAltitudeMeters: 120,
  structureHeightMeters: 80,
  footprintAreaSquareMeters: 1500,
  hardGates: [
    {
      code: 'INSPECTOR_ACTIVE_PARTNER',
      status: 'PASS',
      explanation: 'Active partner.',
    },
    {
      code: 'PILOT_LICENSE_VALID',
      status: 'PASS',
      explanation: 'License valid for planned start.',
    },
  ],
  capabilityChecks: [
    {
      code: 'THERMAL_CAMERA',
      status: 'MATCH',
      explanation: 'Drone registration declares this capability.',
    },
  ],
  disclaimer: 'Evaluation is advisory. It does not confirm a flight permit or clearance.',
};

const blockedCandidate: PartnerCandidate = {
  inspectorId: 'insp-fail',
  droneId: 'drone-fail',
  inspectorName: 'Le Van Nam',
  inspectorAvatarUrl: null,
  droneSerialNumber: 'SDI-800',
  droneModel: 'Mavic 3E',
  droneHasImage: false,
  droneFeatureCodes: ['VISUAL_RGB'],
  eligibility: 'FAIL',
  capabilityFit: 'MISMATCH',
  droneMaxAltitudeMeters: null,
  structureHeightMeters: null,
  footprintAreaSquareMeters: null,
  hardGates: [
    {
      code: 'PILOT_LICENSE_VALID',
      status: 'FAIL',
      explanation: 'License expires before planned start.',
    },
  ],
  capabilityChecks: [
    {
      code: 'THERMAL_CAMERA',
      status: 'MISMATCH',
      explanation: 'Drone registration does not declare this capability.',
    },
  ],
  disclaimer: 'Evaluation is advisory. It does not confirm a flight permit or clearance.',
};

const unknownCandidate: PartnerCandidate = {
  inspectorId: 'insp-unknown',
  droneId: 'drone-unknown',
  inspectorName: 'Pham Thi Hoa',
  inspectorAvatarUrl: null,
  droneSerialNumber: 'SDI-900',
  droneModel: 'Custom UAV',
  droneHasImage: false,
  droneFeatureCodes: [],
  eligibility: 'UNKNOWN',
  capabilityFit: 'UNKNOWN',
  droneMaxAltitudeMeters: null,
  structureHeightMeters: null,
  footprintAreaSquareMeters: null,
  hardGates: [
    {
      code: 'DRONE_MTOW_UNKNOWN',
      status: 'UNKNOWN',
      explanation: 'Drone MTOW is unknown.',
    },
  ],
  capabilityChecks: [
    {
      code: 'LIDAR_3D',
      status: 'UNKNOWN',
      explanation: 'Capability declaration is not available.',
    },
  ],
  disclaimer: 'Evaluation is advisory. It does not confirm a flight permit or clearance.',
};

describe('PartnerCandidateResults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockRejectedValue(new Error('No blob in unit test'));
    vi.mocked(usePartnerCapabilities).mockReturnValue({
      data: [
        { code: 'THERMAL_CAMERA', nameVi: 'Camera nhiệt', nameEn: 'Thermal Camera', displayOrder: 1 },
        { code: 'RTK_POSITIONING', nameVi: 'Định vị RTK', nameEn: 'RTK Positioning', displayOrder: 2 },
        { code: 'LIDAR_SCANNER', nameVi: 'Máy quét LiDAR', nameEn: 'LiDAR Scanner', displayOrder: 3 },
      ],
      isPending: false,
    } as any);
  });

  afterEach(() => cleanup());

  it('shows only PASS + MATCH candidates by default and hides non-passing pairs behind disclosure', () => {
    const onSelectPair = vi.fn();
    renderWithQuery(
      <PartnerCandidateResults
        candidates={[passingCandidate, blockedCandidate, unknownCandidate]}
        selectedInspectorId=""
        selectedDroneId=""
        onSelectPair={onSelectPair}
      />,
    );

    expect(screen.getByText('Tran Minh Quan')).toBeTruthy();
    expect(
      document.querySelector(
        '[data-src="/drone-registration-applications/drones/drone-pass/image?index=0"]',
      ),
    ).toBeTruthy();
    expect(screen.queryByText(/Le Van Nam/)).toBeNull();
    expect(screen.queryByText(/Pham Thi Hoa/)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /^Filters/ }));
    fireEvent.mouseDown(screen.getAllByLabelText('Eligibility')[0]!);
    fireEvent.click(screen.getByRole('option', { name: 'All evaluated' }));

    expect(screen.getByText(/Le Van Nam/)).toBeTruthy();
    expect(screen.getByText('License expires before planned start.')).toBeTruthy();
    expect(screen.getByText(/Pham Thi Hoa/)).toBeTruthy();
    expect(screen.getByText('Drone MTOW is unknown.')).toBeTruthy();
  });

  it('opens the per-pair detail view on demand and blocks selecting non-passing pairs', () => {
    const onSelectPair = vi.fn();
    renderWithQuery(
      <PartnerCandidateResults
        candidates={[passingCandidate, blockedCandidate]}
        selectedInspectorId=""
        selectedDroneId=""
        onSelectPair={onSelectPair}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /^Filters/ }));
    fireEvent.mouseDown(screen.getAllByLabelText('Eligibility')[0]!);
    fireEvent.click(screen.getByRole('option', { name: 'All evaluated' }));
    const blockedRow = screen.getByText('SDI-800').closest('tr');
    fireEvent.click(blockedRow!.querySelector('button[aria-label="Details"]')!);

    expect(screen.getByText('Eligibility checks (FAIL)')).toBeTruthy();
    expect(screen.getByText('Capability fit (MISMATCH)')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Select pair' }).hasAttribute('disabled')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Back to candidates' }));
    fireEvent.mouseDown(screen.getAllByLabelText('Eligibility')[0]!);
    fireEvent.click(screen.getByRole('option', { name: 'Eligible only' }));
    fireEvent.click(screen.getByRole('button', { name: 'Details' }));

    expect(screen.getByText('Eligibility checks (PASS)')).toBeTruthy();
    expect(screen.getByText('License valid for planned start.')).toBeTruthy();
    const selectButton = screen.getByRole('button', { name: 'Select pair' });
    expect(selectButton.hasAttribute('disabled')).toBe(false);
    fireEvent.click(selectButton);
    expect(onSelectPair).toHaveBeenCalledWith(passingCandidate);
  });

  it('distinguishes empty candidate response from having no eligible matches', () => {
    const { rerender } = renderWithQuery(
      <PartnerCandidateResults
        candidates={[]}
        selectedInspectorId=""
        selectedDroneId=""
        onSelectPair={vi.fn()}
      />,
    );

    expect(screen.getByText('No partner pairs registered.')).toBeTruthy();

    rerender(
      <QueryClientProvider client={new QueryClient()}><PartnerCandidateResults
        candidates={[blockedCandidate]}
        selectedInspectorId=""
        selectedDroneId=""
        onSelectPair={vi.fn()}
      /></QueryClientProvider>,
    );

    expect(
      screen.getByText('No eligible partner pairs.'),
    ).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Show 1 other pairs' }).length).toBeGreaterThan(0);
  });

  it('shows drone ceiling, structure height and footprint in the pair detail when known', () => {
    renderWithQuery(
      <PartnerCandidateResults
        candidates={[passingCandidate]}
        selectedInspectorId=""
        selectedDroneId=""
        onSelectPair={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Details' }));

    expect(
      screen.getByText('Drone max altitude: 120 m · Structure height: 80 m · Footprint area: 1500 m²'),
    ).toBeTruthy();
  });

  it('narrows only the evaluated result with advanced filters and reports the search-empty state', () => {
    const secondPassing: PartnerCandidate = {
      ...passingCandidate,
      inspectorId: 'insp-pass-2',
      droneId: 'drone-pass-2',
      inspectorName: 'Le Van Binh',
      droneModel: 'Mavic 3E',
      droneSerialNumber: 'SDI-710',
      droneFeatureCodes: ['THERMAL_CAMERA'],
      droneMaxAltitudeMeters: null,
      structureHeightMeters: null,
      capabilityChecks: [
        { code: 'THERMAL_CAMERA', status: 'MATCH', explanation: 'Thermal declared.' },
      ],
    };
    renderWithQuery(
      <PartnerCandidateResults
        candidates={[passingCandidate, secondPassing, blockedCandidate]}
        selectedInspectorId=""
        selectedDroneId=""
        onSelectPair={vi.fn()}
        title="Candidates"
      />,
    );

    // Both eligible inspectors render by default.
    expect(screen.getByText('Tran Minh Quan')).toBeTruthy();
    expect(screen.getByText('Le Van Binh')).toBeTruthy();
    expect(screen.getByText('2 / 2 pairs shown')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /^Filters/ }));
    fireEvent.mouseDown(screen.getAllByLabelText('Eligibility')[0]!);
    fireEvent.click(screen.getByRole('option', { name: 'All evaluated' }));
    expect(screen.getByText('Le Van Binh')).toBeTruthy();
    const blockedSelect = screen.getAllByRole('button', { name: 'Select' })[2]!;
    expect(blockedSelect.hasAttribute('disabled')).toBe(true);

    fireEvent.mouseDown(screen.getAllByLabelText('Eligibility')[0]!);
    fireEvent.click(screen.getByRole('option', { name: 'Eligible only' }));
    fireEvent.mouseDown(screen.getByLabelText('Altitude'));
    fireEvent.click(screen.getByRole('option', { name: 'Meets structure height' }));

    // Only the pair with both a declared ceiling and a known structure height survives.
    expect(screen.queryByText('Le Van Binh')).toBeNull();
    expect(screen.getByText('Tran Minh Quan')).toBeTruthy();

    fireEvent.mouseDown(screen.getAllByLabelText('Altitude')[0]!);
    fireEvent.click(screen.getByRole('option', { name: 'Any altitude' }));

    fireEvent.mouseDown(screen.getByLabelText('Capability'));
    fireEvent.click(screen.getByRole('option', { name: 'Thermal Camera' }));
    expect(screen.getByText('Tran Minh Quan')).toBeTruthy();
    expect(screen.getByText('Le Van Binh')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByText('Le Van Binh')).toBeTruthy();
  });

  it('renders eligible pairs as compact rows grouped under each Inspector', () => {
    const onSelectPair = vi.fn();
    const secondDrone: PartnerCandidate = {
      ...passingCandidate,
      droneId: 'drone-pass-2',
      droneSerialNumber: 'SDI-701',
    };

    renderWithQuery(
      <PartnerCandidateResults
        candidates={[passingCandidate, secondDrone, unknownCandidate]}
        selectedInspectorId=""
        selectedDroneId=""
        onSelectPair={onSelectPair}
      />,
    );

    const table = screen.getByRole('table', { name: 'Eligible partner pairs' });
    expect(table.querySelectorAll('tbody')).toHaveLength(1);
    expect(table.querySelectorAll('.group-row')).toHaveLength(1);
    expect(table.querySelectorAll('.pair-row')).toHaveLength(2);
    expect(screen.getByText('Tran Minh Quan')).toBeTruthy();
    expect(screen.getByText('2 drones')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: 'Select' })[0]!);
    expect(onSelectPair).toHaveBeenCalledWith(passingCandidate);
  });

  it('does not fetch drone thumbnails before the lazy container is observed', () => {
    class MockIntersectionObserver {
      constructor(_callback: IntersectionObserverCallback) {
        // No callback captured: the test asserts the observer is never triggered.
      }
      observe() {}
      disconnect() {}
      unobserve() {}
      takeRecords() {
        return [];
      }
      root = null;
      rootMargin = '';
      thresholds = [];
    }
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

    try {
      renderWithQuery(
        <PartnerCandidateResults
          candidates={[passingCandidate]}
          selectedInspectorId=""
          selectedDroneId=""
          onSelectPair={vi.fn()}
        />,
      );

      expect(vi.mocked(api.get)).not.toHaveBeenCalledWith(
        '/drone-registration-applications/drones/drone-pass/image?index=0',
        expect.anything(),
      );
      expect(
        document.querySelector(
          '[data-src="/drone-registration-applications/drones/drone-pass/image?index=0"]',
        ),
      ).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('tries loading an image when a legacy candidate omits the image-presence flag', () => {
    class VisibleIntersectionObserver {
      private callback: IntersectionObserverCallback;
      constructor(callback: IntersectionObserverCallback) { this.callback = callback; }
      observe(target: Element) {
        this.callback(
          [{ isIntersecting: true, target } as IntersectionObserverEntry],
          this as unknown as IntersectionObserver,
        );
      }
      disconnect() {}
      unobserve() {}
      takeRecords() {
        return [];
      }
      root = null;
      rootMargin = '';
      thresholds = [];
    }
    vi.stubGlobal('IntersectionObserver', VisibleIntersectionObserver);
    vi.mocked(api.get).mockResolvedValue({ data: new Blob(['image']) } as never);

    try {
      renderWithQuery(
        <PartnerCandidateResults
          candidates={[(({ droneHasImage: _ignored, ...candidate }) => candidate)(passingCandidate)]}
          selectedInspectorId=""
          selectedDroneId=""
          onSelectPair={vi.fn()}
        />,
      );

      expect(api.get).toHaveBeenCalledWith(
        '/drone-registration-applications/drones/drone-pass/image?index=0',
        { responseType: 'blob' },
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('matches candidates against filter fields without promoting blocked pairs', () => {
    expect(candidateMatchesFilters(passingCandidate, DEFAULT_FILTERS)).toBe(true);
    expect(
      candidateMatchesFilters(passingCandidate, {
        ...DEFAULT_FILTERS,
        altitude: 'COVERS_STRUCTURE',
      }),
    ).toBe(true);
    expect(
      candidateMatchesFilters(passingCandidate, {
        ...DEFAULT_FILTERS,
        altitude: 'MINIMUM_CEILING',
        minimumCeilingMeters: '100',
      }),
    ).toBe(true);
    expect(
      candidateMatchesFilters(passingCandidate, {
        ...DEFAULT_FILTERS,
        altitude: 'MINIMUM_CEILING',
        minimumCeilingMeters: '121',
      }),
    ).toBe(false);
    expect(
      candidateMatchesFilters(passingCandidate, {
        ...DEFAULT_FILTERS,
        capabilityCode: 'THERMAL_CAMERA',
      }),
    ).toBe(true);
    expect(
      candidateMatchesFilters(passingCandidate, {
        ...DEFAULT_FILTERS,
        capabilityCode: 'LIDAR_SCANNER',
      }),
    ).toBe(false);
    expect(candidateMatchesFilters(blockedCandidate, DEFAULT_FILTERS)).toBe(false);
    expect(
      candidateMatchesFilters(blockedCandidate, {
        ...DEFAULT_FILTERS,
        eligibility: 'ALL_EVALUATED',
      }),
    ).toBe(true);
    expect(
      candidateMatchesFilters(passingCandidate, {
        ...DEFAULT_FILTERS,
        query: 'phantom drone',
      }),
    ).toBe(false);
  });
});
