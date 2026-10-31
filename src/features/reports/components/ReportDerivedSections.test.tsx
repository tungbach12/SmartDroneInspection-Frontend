import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  EvidenceItem,
  InspectionReport,
  Finding,
} from '@/features/inspections/api/inspectionApi';
import { ReportDerivedSections } from './ReportDerivedSections';

vi.mock('@/shared/ui/AuthenticatedImage', () => ({
  AuthenticatedImage: () => <div />,
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
  sections: { inspectorCoverageAssessment: 'North span covered; east face not observed.' },
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
    forwardedToMaintenanceAt: null,
    findingCode: 'F-1',
    defectLabel: 'Surface crack',
    severity: 'HIGH',
    technicalNotes: 'Visible crack',
    boundingBox: null,
    modelName: null,
    confidence: null,
    recommendedAction: null,
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
  const locationLabel = labels.find((label) => label.textContent === 'Asset location' && label.closest('section')?.querySelector('h2')?.textContent === 'Evidence register');
  return locationLabel?.parentElement?.lastElementChild;
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
  it('shows source-backed organization, asset, drone and session details without legacy fields or raw UUIDs', () => {
    const { container } = render(
      <ReportDerivedSections
        version={version}
        findings={[]}
        evidenceList={[]}
        inspectionId="inspection-1"
      />,
    );

    expect(container.textContent).toContain('Northwind Infrastructure');
    expect(container.textContent).toContain('North span bridge');
    expect(container.textContent).toContain('BR-014');
    expect(container.textContent).toContain('SurveyCo · S2 · DR-17');
    expect(container.textContent).toContain('Drone identified; bridge accessible');
    expect(container.textContent).not.toContain('author-1');
    expect(container.textContent).not.toContain('title={t(');
  });
});

describe('ReportDerivedSections evidence location', () => {
  it('does not confuse GPS with the evidence asset location', () => {
    const item = { ...evidence, latitude: 48.123, longitude: -123.456 };
    const location = renderSections(item, [finding()]);

    expect(location?.textContent).toContain('Not supplied');
    expect(location?.textContent).not.toContain('48.123, -123.456');
  });

  it('does not infer a shared evidence location from linked findings', () => {
    const location = renderSections(evidence, [finding()]);

    expect(location?.textContent).toContain('Not supplied');
  });

  it('shows the shared evidence location before reviewer decision', () => {
    const location = renderSections(
      { ...evidence, locationDescription: 'Girder G4 east face' },
      [finding({ status: 'PENDING' })],
    );

    expect(location?.textContent).toContain('Girder G4 east face');
  });
});

describe('ReportDerivedSections confirmed findings', () => {
  it('lists an Inspector-confirmed finding before reviewer decision', () => {
    const section = renderConfirmedFindings([
      finding({ defectLabel: 'GussetPlateSectionLoss', status: 'CONFIRMED' }),
    ]);

    expect(section?.textContent).toContain('GussetPlateSectionLoss');
    fireEvent.click(screen.getByRole('button', { name: /View finding details/i }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Inspector-confirmed')).toBeTruthy();
  });

  it('excludes reviewer-rejected findings from the section', () => {
    const section = renderConfirmedFindings([
      finding({ defectLabel: 'spurious-seam', status: 'PENDING' }),
    ]);

    expect(section?.textContent).not.toContain('spurious-seam');
  });

  it('always displays Technical notes and Recommended action even when empty or null', () => {
    renderConfirmedFindings([
      finding({
        defectLabel: 'Crack',
        status: 'CONFIRMED',
        technicalNotes: '',
        recommendedAction: null,
      }),
    ]);

    fireEvent.click(screen.getByRole('button', { name: /View finding details/i }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/Technical notes:/)).toBeTruthy();
    expect(within(dialog).getByText(/Recommended action:/)).toBeTruthy();
  });

  it('displays Technical notes and Recommended action content when provided', () => {
    renderConfirmedFindings([
      finding({
        defectLabel: 'Corrosion',
        status: 'CONFIRMED',
        technicalNotes: 'Surface rust visible on bracket',
        recommendedAction: 'Apply anti-corrosion primer',
      }),
    ]);

    fireEvent.click(screen.getByRole('button', { name: /View finding details/i }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/Surface rust visible on bracket/)).toBeTruthy();
    expect(within(dialog).getByText(/Apply anti-corrosion primer/)).toBeTruthy();
  });

  it('renders findings preview on evidence item and opens modal via the small link', () => {
    render(
      <ReportDerivedSections
        version={version}
        findings={[
          finding({
            defectLabel: 'Surface crack',
            severity: 'HIGH',
            status: 'CONFIRMED',
            technicalNotes: 'Longitudinal crack near seam',
            recommendedAction: 'Seal and monitor',
          }),
        ]}
        evidenceList={[evidence]}
        inspectionId="inspection-1"
      />,
    );

    expect(screen.getByText('Findings preview')).toBeTruthy();
    expect(screen.getByText('Surface crack · HIGH')).toBeTruthy();

    const openModalBtn = screen.getByRole('button', { name: /View finding details/i });
    expect(openModalBtn).toBeTruthy();

    fireEvent.click(openModalBtn);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeTruthy();
    expect(within(dialog).getByText('Surface crack')).toBeTruthy();
    expect(within(dialog).getByText(/Longitudinal crack near seam/)).toBeTruthy();
    expect(within(dialog).getByText(/Seal and monitor/)).toBeTruthy();
  });
});
