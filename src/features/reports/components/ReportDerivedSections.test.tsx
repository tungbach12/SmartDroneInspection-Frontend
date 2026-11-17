import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  EvidenceItem,
  InspectionReport,
  Finding,
} from '@/features/inspections/api/inspectionApi';
import { getOrGeneratePersistedAiSummary } from './ReportAiSummaryCard';
import { ReportDerivedSections } from './ReportDerivedSections';

vi.mock('@/shared/ui/AuthenticatedImage', () => ({
  AuthenticatedImage: ({ src }: { src: string }) => (
    <div data-testid="authenticated-image" data-src={src} />
  ),
}));

vi.mock('@/shared/ui/AuthenticatedMedia', () => ({
  AuthenticatedMedia: ({
    src,
    seekRequest,
  }: {
    src: string;
    seekRequest?: { timestampSeconds: number; nonce: number } | null;
  }) => (
    <div
      data-testid="authenticated-media"
      data-src={src}
      data-seek={seekRequest ? String(seekRequest.timestampSeconds) : ''}
    />
  ),
}));

const version: InspectionReport = {
  id: 'version-1',
  inspectionReportId: 'report-1',
  versionNo: 1,
  status: 'SUBMITTED',
  authorUserId: 'author-1',
  submittedAt: null,
  reviewerUserId: null,
  reviewedAt: null,
  returnReason: null,
  publishedAt: null,
  createdAt: '2026-01-01T00:00:00Z',
  omissionDisclosure: null,
  summary: 'North span covered; east face not observed.',
  reportContext: {
    organizationName: 'Northwind Infrastructure',
    assetCode: 'BR-014',
    assetName: 'North span bridge',
    assetLocation: 'District 1',
    assetCategory: 'Bridge',
    assignedDrone: { serialNumber: 'DR-17', manufacturer: 'SurveyCo', model: 'S2' },
    fieldSessions: [
      {
        id: 'session-1',
        status: 'IN_PROGRESS',
        startedAt: '2026-01-02T10:30:00Z',
        endedAt: null,
        preFlightChecklistNote: 'Drone identified; bridge accessible',
        postponementReason: null,
        abortReason: null,
        outcomeNotes: null,
        droneSerialNumber: 'DR-17',
        droneManufacturer: 'SurveyCo',
        droneModel: 'S2',
      },
    ],
    reviewerQualificationDisclosure: null,
    findingsConfirmedAt: '2026-01-02T11:00:00Z',
  },
};

const evidence: EvidenceItem = {
  id: 'evidence-1',
  inspectionId: 'inspection-1',
  fieldSessionId: null,
  fileName: 'spalling.jpg',
  contentType: 'image/jpeg',
  sizeBytes: 10,
  captureTime: null,
  latitude: null,
  longitude: null,
  createdAt: '2026-01-01T00:00:00Z',
  isDeleted: false,
  locationDescription: null,
  deduplicated: false,
};

function finding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: 'finding-1',
    inspectionId: 'inspection-1',
    evidenceId: evidence.id,
    findingCode: 'F-1',
    defectLabel: 'Surface crack',
    severity: 'HIGH',
    technicalNotes: 'Visible crack',
    boundingBox: null,
    modelName: null,
    confidence: null,
    status: 'PENDING',
    isDeleted: false,
    ...overrides,
  };
}

function renderSections(item: EvidenceItem, findings: Finding[]) {
  const { container } = render(
    <ReportDerivedSections
      version={version}
      findings={findings}
      evidenceList={[item]}
      inspectionId="inspection-1"
    />,
  );
  const labels = Array.from(container.querySelectorAll('p'));
  const locationLabel = labels.find((label) => label.textContent === 'Capture location' && label.closest('section')?.querySelector('h2')?.textContent === 'Evidence register');
  return {
    container,
    locationElement: locationLabel?.parentElement?.lastElementChild,
  };
}
function renderConfirmedFindings(findings: Finding[]) {
  const { container } = render(
    <ReportDerivedSections
      version={version}
      findings={findings}
      evidenceList={[evidence]}
      inspectionId="inspection-1"
    />,
  );
  return Array.from(container.querySelectorAll('section')).find(
    (section) =>
      section.querySelector('h2')?.textContent === 'Evidence register' ||
      section.querySelector('h2')?.textContent === 'Confirmed findings',
  );
}

afterEach(() => {
  cleanup();
});

describe('ReportDerivedSections source context', () => {
  it('shows source-backed asset, drone and session details without legacy Organization or raw UUIDs', () => {
    const { container } = render(
      <ReportDerivedSections
        version={version}
        findings={[]}
        evidenceList={[]}
        inspectionId="inspection-1"
      />,
    );

    expect(container.textContent).not.toContain('Northwind Infrastructure');
    expect(container.textContent).toContain('North span bridge');
    expect(container.textContent).toContain('BR-014');
    expect(container.textContent).toContain('SurveyCo S2 · DR-17');
    expect(container.textContent).toContain('Drone identified; bridge accessible');
    expect(container.textContent).not.toContain('author-1');
    expect(container.textContent).not.toContain('title={t(');
  });

  it('renders structured field-session checklists and View permit button when provided', () => {
    const versionWithChecklists: InspectionReport = {
      ...version,
      reportContext: {
        ...version.reportContext!,
        flightPermitFileName: 'sitl-test-flight-permit.pdf',
        fieldSessions: [
          {
            id: 'session-2',
            status: 'FIELD_COMPLETED',
            startedAt: '2026-11-06T22:11:00Z',
            endedAt: '2026-11-07T10:59:00Z',
            preFlightChecklistNote:
              '[✓] Airframe, propellers & gimbal camera intact · [✓] Battery >= 85% — ok',
            postponementReason: null,
            abortReason: null,
            outcomeNotes:
              '[✓] Drone landed safely, motors disarmed & airframe undamaged',
            droneSerialNumber: 'DR-17',
            droneManufacturer: 'SurveyCo',
            droneModel: 'S2',
          },
        ],
      },
    };

    render(
      <ReportDerivedSections
        version={versionWithChecklists}
        findings={[]}
        evidenceList={[]}
        inspectionId="inspection-1"
      />,
    );

    const preBtn = screen.getByRole('button', { name: /Pre-flight safety checklist/i });
    const postBtn = screen.getByRole('button', {
      name: /Post-flight checklist/i,
    });
    expect(preBtn.getAttribute('aria-expanded')).toBe('false');
    expect(postBtn.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(preBtn);
    expect(preBtn.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('Airframe, propellers & gimbal camera intact')).toBeTruthy();

    fireEvent.click(postBtn);
    expect(postBtn.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('Drone landed safely, motors disarmed & airframe undamaged')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'View permit' })).toBeTruthy();
  });

  it('separates Inspected items into an independent collapsed Inspection items checklist card', () => {
    const versionWithInspectedItems: InspectionReport = {
      ...version,
      reportContext: {
        ...version.reportContext!,
        fieldSessions: [
          {
            id: 'session-insp-items',
            status: 'FIELD_COMPLETED',
            startedAt: '2026-11-15T13:15:00Z',
            endedAt: '2026-11-15T13:20:00Z',
            preFlightChecklistNote: '[✓] Airframe, propellers & mounting secure',
            postponementReason: null,
            abortReason: null,
            outcomeNotes:
              '[✓] Aircraft landed safely & propulsion disarmed · [✓] Inspected: Tru thap chinh T1 · [✓] Inspected: He cap vang chinh',
            droneSerialNumber: 'DR-17',
            droneManufacturer: 'SurveyCo',
            droneModel: 'S2',
          },
        ],
      },
    };

    render(
      <ReportDerivedSections
        version={versionWithInspectedItems}
        findings={[]}
        evidenceList={[]}
        inspectionId="inspection-1"
      />,
    );

    const postBtn = screen.getByRole('button', {
      name: /Post-flight checklist/i,
    });
    const inspItemsBtn = screen.getByRole('button', { name: /Inspection items/i });
    expect(postBtn.getAttribute('aria-expanded')).toBe('false');
    expect(inspItemsBtn.getAttribute('aria-expanded')).toBe('false');
    expect(within(postBtn).getByText('1 verified')).toBeTruthy();
    expect(within(inspItemsBtn).getByText('2 verified')).toBeTruthy();

    fireEvent.click(inspItemsBtn);
    expect(inspItemsBtn.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('Tru thap chinh T1')).toBeTruthy();
    expect(screen.getByText('He cap vang chinh')).toBeTruthy();
  });
});

describe('ReportDerivedSections evidence location', () => {
  it('omits empty capture location instead of falling back to Not supplied or GPS coordinates', () => {
    const item = { ...evidence, latitude: 48.123, longitude: -123.456 };
    const { container, locationElement } = renderSections(item, [finding()]);

    expect(locationElement).toBeUndefined();
    expect(container.textContent).not.toContain('Not supplied');
    expect(container.textContent).not.toContain('48.123, -123.456');
  });

  it('does not infer a shared evidence location from linked findings', () => {
    const { locationElement } = renderSections(evidence, [finding()]);

    expect(locationElement).toBeUndefined();
  });

  it('shows the shared capture location before reviewer decision', () => {
    const { locationElement } = renderSections(
      { ...evidence, locationDescription: 'Girder G4 east face' },
      [finding({ status: 'PENDING' })],
    );

    expect(locationElement?.textContent).toContain('Girder G4 east face');
  });
});

describe('ReportDerivedSections confirmed findings', () => {
  it('lists an Inspector-confirmed finding before reviewer decision', () => {
    const section = renderConfirmedFindings([
      finding({ defectLabel: 'GussetPlateSectionLoss', status: 'CONFIRMED' }),
    ]);

    expect(section?.textContent).toContain('GussetPlateSectionLoss');
    expect(within(section!).getByText(/GussetPlateSectionLoss/)).toBeTruthy();
    expect(within(section!).getByText('HIGH')).toBeTruthy();
  });

  it('excludes reviewer-rejected findings from the section', () => {
    const section = renderConfirmedFindings([
      finding({ defectLabel: 'spurious-seam', status: 'PENDING' }),
    ]);

    expect(section?.textContent).not.toContain('spurious-seam');
  });

  it('omits empty Note and duplicate defect-label notes', () => {
    const section = renderConfirmedFindings([
      finding({
        defectLabel: 'abscission',
        status: 'CONFIRMED',
        technicalNotes: 'abscission',
      }),
    ]);

    expect(within(section!).queryByText(/Note:/)).toBeNull();
  });

  it('displays unified Note content when provided', () => {
    const section = renderConfirmedFindings([
      finding({
        defectLabel: 'Corrosion',
        status: 'CONFIRMED',
        technicalNotes: 'Surface rust visible on bracket · Apply anti-corrosion primer',
      }),
    ]);

    expect(within(section!).getByText(/Note:/)).toBeTruthy();
    expect(within(section!).getByText(/Surface rust visible on bracket/)).toBeTruthy();
    expect(within(section!).getByText(/Apply anti-corrosion primer/)).toBeTruthy();
  });

  it('renders confirmed findings inline next to the evidence thumbnail without a redundant details modal link', () => {
    render(
      <ReportDerivedSections
        version={version}
        findings={[
          finding({
            defectLabel: 'Surface crack',
            severity: 'HIGH',
            status: 'CONFIRMED',
            technicalNotes: 'Longitudinal crack near seam · Seal and monitor',
          }),
        ]}
        evidenceList={[evidence]}
        inspectionId="inspection-1"
      />,
    );

    expect(screen.queryByText('Findings preview')).toBeNull();
    expect(screen.getByText(/Surface crack/)).toBeTruthy();
    expect(screen.getByText('HIGH')).toBeTruthy();
    expect(
      screen.getByTestId('authenticated-image').getAttribute('data-src'),
    ).toBe('/api/v1/inspections/inspection-1/evidence/evidence-1/content?variant=thumb');

    expect(screen.queryByRole('button', { name: /View finding details/i })).toBeNull();
    expect(screen.getByText(/Longitudinal crack near seam/)).toBeTruthy();
    expect(screen.getByText(/Seal and monitor/)).toBeTruthy();
  });

  it('organizes defect photos, flight video, and clear captures into 3 separate tiers with video seek', () => {
    const flightVideo: EvidenceItem = {
      ...evidence,
      id: 'video-1',
      fileName: 'tower_orbit.mp4',
      contentType: 'video/mp4',
      durationSeconds: 20,
    };
    const defectFromVideo: EvidenceItem = {
      ...evidence,
      id: 'defect-img-1',
      fileName: 'defect_parapet.jpg',
      sourceVideoEvidenceId: 'video-1',
      sourceTimestampSeconds: 8,
    };
    const clearPhoto: EvidenceItem = {
      ...evidence,
      id: 'clear-img-1',
      fileName: 'clear_curtainwall.jpg',
    };

    render(
      <ReportDerivedSections
        version={version}
        findings={[
          finding({
            id: 'f-confirmed',
            evidenceId: 'defect-img-1',
            defectLabel: 'abscission',
            status: 'CONFIRMED',
          }),
        ]}
        evidenceList={[flightVideo, defectFromVideo, clearPhoto]}
        inspectionId="inspection-1"
      />,
    );

    // Tier 1 (Defect evidence), Tier 2 (Flight videos), and Tier 3 (Clear captures) all render as standalone sections without collapsible thumbnail toggles
    expect(screen.getByText(/Defect evidence & confirmed findings \(1\)/i)).toBeTruthy();
    expect(screen.getByText(/Flight video captures \(1\)/i)).toBeTruthy();
    expect(screen.getByText(/Clear \/ reference captures \(no findings\) \(1\)/i)).toBeTruthy();
    expect(screen.getByText('clear_curtainwall.jpg')).toBeTruthy();
    expect(screen.queryByText(/Hide thumbnails|Show thumbnails/i)).toBeNull();

    // Filter chips let reviewer focus a single evidence tier or restore all
    fireEvent.click(screen.getByRole('button', { name: /1 clear captures/i }));
    expect(screen.queryByText(/Defect evidence & confirmed findings/i)).toBeNull();
    expect(screen.getByText('clear_curtainwall.jpg')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /All \(3\)/i }));
    expect(screen.getByText(/Defect evidence & confirmed findings \(1\)/i)).toBeTruthy();

    // Video trace button opens modal seeking the flight video to 00:08
    const watchBtn = screen.getByRole('button', { name: /Watch in video @ 00:08/i });
    fireEvent.click(watchBtn);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/Focused at timestamp @ 00:08/i)).toBeTruthy();
    expect(within(dialog).getByTestId('authenticated-media').getAttribute('data-seek')).toBe('8');
  });

  it('formats raw JSON assetLocation text instead of rendering raw JSON in Identification', () => {
    const versionWithJsonLocation: InspectionReport = {
      ...version,
      reportContext: {
        ...version.reportContext!,
        assetLocation:
          '{"label": "Ha Noi, Viet Nam", "latitude": 21.0921, "longitude": 105.8194}',
      },
    };
    const { container } = render(
      <ReportDerivedSections
        version={versionWithJsonLocation}
        findings={[]}
        evidenceList={[]}
        inspectionId="inspection-1"
      />,
    );

    expect(container.textContent).toContain('Ha Noi, Viet Nam');
    expect(container.textContent).not.toContain('{"label"');
  });

  it('shows telemetry acquisition origin in Field session and normalizes legacy Vietnamese crop notes in EN locale', () => {
    const cropItem: EvidenceItem = {
      ...evidence,
      id: 'crop-1',
      fileName: 'crop_01.jpg',
      locationDescription: 'Trích xuất & cắt từ video site_tour.mp4 tại 00m03s',
    };

    render(
      <ReportDerivedSections
        version={version}
        findings={[
          finding({
            id: 'f-crop',
            evidenceId: 'crop-1',
            status: 'CONFIRMED',
          }),
        ]}
        evidenceList={[cropItem]}
        fieldSessions={[
          {
            id: 'session-1',
            inspectionId: 'inspection-1',
            status: 'FIELD_COMPLETED',
            preFlightChecklistNote: null,
            startedAt: '2026-01-02T10:30:00Z',
            endedAt: '2026-01-02T10:50:00Z',
            postponementReason: null,
            abortReason: null,
            outcomeNotes: null,
            telemetrySource: 'IMPORTED_LOG_SRT',
          },
        ]}
        inspectionId="inspection-1"
      />,
    );

    expect(screen.getByText('Telemetry source: Uploaded flight log file (SRT)')).toBeTruthy();
    expect(screen.getByText('Extracted from video site_tour.mp4 @ 00m03s')).toBeTruthy();
    expect(screen.queryByText(/Trích xuất & cắt từ video/)).toBeNull();
  });

  it('renders Findings location map with clickable pins and 1-row-per-evidence layout with inline findings', () => {
    const northPhoto: EvidenceItem = {
      ...evidence,
      id: 'ev-north',
      fileName: 'photo-01-defect-north.jpg',
      latitude: 10.875333,
      longitude: 106.800525,
      locationDescription: 'North Crown',
    };
    const eastPhoto: EvidenceItem = {
      ...evidence,
      id: 'ev-east',
      fileName: 'photo-02-defect-east.jpg',
      latitude: 10.875167,
      longitude: 106.801028,
      locationDescription: 'East Wing',
    };

    const { container } = render(
      <ReportDerivedSections
        version={version}
        findings={[
          finding({
            id: 'f-north',
            evidenceId: 'ev-north',
            findingCode: 'F-1',
            defectLabel: 'crack',
            severity: 'HIGH',
            status: 'CONFIRMED',
            technicalNotes: 'North parapet crack · Inject epoxy',
          }),
          finding({
            id: 'f-east',
            evidenceId: 'ev-east',
            findingCode: 'F-2',
            defectLabel: 'abscission',
            severity: 'MEDIUM',
            status: 'CONFIRMED',
            technicalNotes: 'East facade coat delamination · Patch render',
          }),
        ]}
        evidenceList={[northPhoto, eastPhoto]}
        inspectionId="inspection-1"
      />,
    );

    // Findings location map shows clickable pins for both geotagged captures
    const mapSection = container.querySelector('#report-findings-map') as HTMLElement;
    expect(mapSection).toBeTruthy();
    expect(within(mapSection).getByText('Findings location map')).toBeTruthy();

    // Clicking pin F-2 updates the map's right-hand findings summary to ev-east
    fireEvent.click(within(mapSection).getByRole('button', { name: 'Finding pin photo-02-defect-east.jpg' }));
    expect(within(mapSection).getAllByText('F-2').length).toBeGreaterThanOrEqual(2);
    expect(within(mapSection).getByText('abscission')).toBeTruthy();
    expect(within(mapSection).getByText('MEDIUM')).toBeTruthy();
    expect(within(mapSection).queryByText(/East facade coat delamination/)).toBeNull();

    // Tier 1 renders 1 evidence row per capture with inline confirmed finding details & clickable View on map
    const northRow = container.querySelector('#report-evidence-ev-north') as HTMLElement;
    expect(northRow).toBeTruthy();
    expect(within(northRow).getByText(/North parapet crack/)).toBeTruthy();
    expect(within(northRow).getByText(/Inject epoxy/)).toBeTruthy();
    expect(within(northRow).queryByText(/10\.875333/)).toBeNull();

    // Clicking the single "View on map" chip (next to filename, outside findings box) switches the map back to northPhoto
    const northMapButtons = within(northRow).getAllByRole('button', { name: /View on map/i });
    expect(northMapButtons).toHaveLength(1);
    fireEvent.click(northMapButtons[0]!);
    expect(within(mapSection).getAllByText('F-1').length).toBeGreaterThanOrEqual(2);
    expect(within(mapSection).getByText('crack')).toBeTruthy();
    expect(within(mapSection).getByText('HIGH')).toBeTruthy();
  });

  it('hides KPI bottom subtitle descriptions and renders AI Executive Summary collapsed by default until clicked', () => {
    window.localStorage.clear();
    render(
      <ReportDerivedSections
        version={version}
        findings={[
          finding({
            id: 'f-ai-1',
            defectLabel: 'Spalling',
            severity: 'HIGH',
            status: 'CONFIRMED',
            technicalNotes: 'Exposed rebar on north column · Patch spalled concrete',
          }),
        ]}
        evidenceList={[evidence]}
        inspectionId="inspection-ai-test"
      />,
    );

    expect(screen.queryByText('Confirmed on inspection captures')).toBeNull();
    expect(screen.queryByText('Checklist items verified')).toBeNull();
    expect(screen.queryByText('Field session status')).toBeNull();

    expect(screen.getByText('AI Executive Summary')).toBeTruthy();
    expect(screen.queryByText('Auto-generated')).toBeNull();
    expect(screen.queryByText('North span covered; east face not observed.')).toBeNull();
    expect(screen.queryByText('Key Highlights')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Show details/i }));

    expect(screen.getByText('North span covered; east face not observed.')).toBeTruthy();
    expect(screen.getByText('Key Highlights')).toBeTruthy();
    expect(screen.getByText('Recommended Actions')).toBeTruthy();
  });

  it('auto-generates and persists grouped AI Executive Summary without duplicate note echo', () => {
    window.localStorage.clear();
    const findingsSet: Finding[] = [
      finding({
        id: 'f-persist-1',
        findingCode: 'F-9',
        defectLabel: 'leakage',
        severity: 'MEDIUM',
        status: 'CONFIRMED',
        confidence: 0.88,
        technicalNotes: 'leakage',
      }),
      finding({
        id: 'f-persist-2',
        findingCode: 'F-10',
        defectLabel: 'abscission',
        severity: 'MEDIUM',
        status: 'CONFIRMED',
        confidence: 0.86,
        technicalNotes: 'abscission',
      }),
    ];

    const firstRun = getOrGeneratePersistedAiSummary({
      inspectionId: 'inspection-persist-1',
      assetName: 'North span bridge',
      findings: findingsSet,
      evidenceCount: 15,
      locale: 'en',
    });
    expect(firstRun.wasCached).toBe(false);
    expect(firstRun.summaryData.overallRisk).toBe('MEDIUM');
    expect(firstRun.summaryData.summary).toContain('2 confirmed defects');
    expect(firstRun.summaryData.summary).toContain('86%–88%');
    expect(firstRun.summaryData.keyHighlights.some((h) => h.includes('F-9 · leakage'))).toBe(true);
    expect(firstRun.summaryData.keyHighlights.some((h) => h.includes('— leakage'))).toBe(false);
    expect(firstRun.summaryData.recommendedActions).toContain('waterproof');

    const secondRun = getOrGeneratePersistedAiSummary({
      inspectionId: 'inspection-persist-1',
      assetName: 'North span bridge',
      findings: findingsSet,
      evidenceCount: 15,
      locale: 'en',
    });
    expect(secondRun.wasCached).toBe(true);
    expect(secondRun.summaryData).toEqual(firstRun.summaryData);
  });
});
