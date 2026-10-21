import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type {
  EvidenceItem,
  InspectionReportVersion,
  Finding,
} from '@/features/inspections/api/inspectionApi';
import { ReportDerivedSections } from './ReportDerivedSections';

vi.mock('@/shared/ui/AuthenticatedImage', () => ({
  AuthenticatedImage: () => <div />,
}));

const version: InspectionReportVersion = {
  id: 'version-1',
  inspectionReportId: 'report-1',
  versionNo: 1,
  status: 'DRAFT',
  authorUserId: 'author-1',
  authorVerifiedAt: null,
  reviewerUserId: null,
  reviewedAt: null,
  reviewReason: null,
  returnReasonType: null,
  withdrawnByUserId: null,
  withdrawnAt: null,
  withdrawalReason: null,
  llmModel: null,
  promptVersion: null,
  generatedAt: null,
  evidenceSnapshotHash: null,
  findingsSnapshotHash: null,
  publishedAt: null,
  createdAt: '2026-01-01T00:00:00Z',
  narrative: null,
  omissionDisclosure: null,
  reportContext: {
    organizationName: 'Northwind Infrastructure',
    assetCode: 'BR-014',
    assetName: 'North span bridge',
    assetLocation: 'District 1',
    assetCategory: 'Bridge',
    assignedDrone: { serialNumber: 'DR-17', manufacturer: 'SurveyCo', model: 'S2' },
    preparation: {
      version: 2,
      status: 'READY',
      shotList: 'North span, east face',
      evidenceTypes: 'Visual photographs',
      accessConstraints: 'Pedestrian access only',
      safetyObservations: 'No standing water',
      readinessDecision: 'APPROVED',
      readinessDecisionAt: '2026-01-02T09:00:00Z',
      readinessReason: null,
      permitDocumentReferences: null,
      submittedAt: '2026-01-02T08:00:00Z',
    },
    evidenceQuality: {
      decision: 'ACCEPTED',
      shotListComparison: 'North span covered',
      limitationReason: 'East face partly obscured',
      decidedByUserId: 'inspector-1',
      decidedAt: '2026-01-02T10:00:00Z',
    },
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
        limitations: null,
        droneSerialNumber: 'DR-17',
        droneManufacturer: 'SurveyCo',
        droneModel: 'S2',
      },
    ],
    reviewerQualificationDisclosure: 'Professional qualification was not independently validated.',
    findingsConfirmedBy: 'inspector-1',
    findingsConfirmedAt: '2026-01-02T11:00:00Z',
    findingsSnapshotHash: 'findings-hash',
  },
};

const evidence: EvidenceItem = {
  id: 'evidence-1',
  inspectionId: 'inspection-1',
  fieldSessionId: null,
  fileName: 'spalling.jpg',
  contentType: 'image/jpeg',
  sizeBytes: 10,
  checksumSha256: 'checksum',
  captureTime: null,
  source: 'WEB_UPLOAD',
  latitude: null,
  longitude: null,
  externalReference: null,
  uploadStatus: 'AVAILABLE',
  createdAt: '2026-01-01T00:00:00Z',
  retiredByUserId: null,
  retiredAt: null,
  retirementReason: null,
  locationDescription: null,
  deduplicated: false,
};

function finding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: 'finding-1',
    inspectionId: 'inspection-1',
    evidenceId: evidence.id,
    deletedAt: null,
    deletedByUserId: null,
    deletionReason: null,
    findingCode: 'F-1',
    defectLabel: 'Surface crack',
    severity: 'HIGH',
    locationDescription: 'Pier 2 north face',
    technicalNotes: 'Visible crack',
    boundingBox: null,
    modelName: null,
    modelVersion: null,
    modelProvider: null,
    confidence: null,
    recommendedAction: null,
    component: 'Pier 2',
    description: null,
    observedCondition: null,
    priority: null,
    measurement: null,
    inspectorConfirmedAt: '2026-01-02T00:00:00Z',
    repairRequired: false,
    status: 'PENDING',
    correctiveActionRequired: false,
    correctiveActionPriority: null,
    correctiveActionDueAt: null,
    correctiveActionReviewedByUserId: null,
    correctiveActionReviewedAt: null,
    correctiveActionRationale: null,
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
    (section) => section.querySelector('h2')?.textContent === 'Confirmed findings',
  );
}

describe('ReportDerivedSections source context', () => {
  it('shows source-backed organization, asset, preparation, decision and session details', () => {
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
    expect(container.textContent).toContain('North span, east face');
    expect(container.textContent).toContain('North span covered');
    expect(container.textContent).toContain('Drone identified; bridge accessible');
    expect(container.textContent).toContain('Professional qualification was not independently validated.');
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
      finding({ defectLabel: 'GussetPlateSectionLoss', inspectorConfirmedAt: '2026-01-02T00:00:00Z' }),
    ]);

    expect(section?.textContent).toContain('GussetPlateSectionLoss');
    expect(section?.textContent).toContain('Inspector-confirmed');
    expect(section?.textContent).not.toContain('await Organization Admin decision');
    expect(section?.textContent).not.toContain('additional finding(s)');
    expect(section?.textContent).not.toContain('No confirmed findings were recorded');
  });

  it('excludes reviewer-rejected findings from the section', () => {
    const section = renderConfirmedFindings([
      finding({ defectLabel: 'spurious-seam', inspectorConfirmedAt: null }),
    ]);

    expect(section?.textContent).not.toContain('spurious-seam');
  });
});
