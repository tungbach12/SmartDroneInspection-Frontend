import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type {
  EvidenceItem,
  InspectionReportVersion,
  VerifiedFinding,
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
};

function finding(overrides: Partial<VerifiedFinding> = {}): VerifiedFinding {
  return {
    id: 'finding-1',
    inspectionId: 'inspection-1',
    evidenceId: evidence.id,
    aiCandidateId: null,
    source: 'MANUAL',
    findingCode: 'F-1',
    defectLabel: 'Surface crack',
    severity: 'HIGH',
    locationDescription: 'Pier 2 north face',
    technicalNotes: 'Visible crack',
    recommendedAction: null,
    component: 'Pier 2',
    description: null,
    observedCondition: null,
    priority: null,
    measurement: null,
    decision: 'CONFIRMED',
    decidedByUserId: 'reviewer-1',
    decidedAt: '2026-01-02T00:00:00Z',
    repairRequired: false,
    status: 'OPEN',
    correctiveActionRequired: false,
    correctiveActionPriority: null,
    correctiveActionDueAt: null,
    correctiveActionReviewedByUserId: null,
    correctiveActionReviewedAt: null,
    correctiveActionRationale: null,
    ...overrides,
  };
}

function renderSections(item: EvidenceItem, findings: VerifiedFinding[]) {
  const { container } = render(
    <ReportDerivedSections
      version={version}
      findings={findings}
      evidenceList={[item]}
      inspectionId="inspection-1"
    />,
  );
  const labels = container.querySelectorAll('p');
  const locationLabel = Array.from(labels).find((label) => label.textContent === 'Location' && label.closest('section')?.querySelector('h2')?.textContent === 'Evidence register');
  return locationLabel?.parentElement?.lastElementChild;
}
function renderConfirmedFindings(findings: VerifiedFinding[]) {
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

describe('ReportDerivedSections evidence location', () => {
  it('prefers supplied capture GPS over the linked official finding location', () => {
    const item = { ...evidence, latitude: 48.123, longitude: -123.456 };
    const location = renderSections(item, [finding()]);

    expect(location?.textContent).toContain('48.123, -123.456');
    expect(location?.textContent).not.toContain('Pier 2 north face');
  });

  it('uses the component and location of a linked official finding when GPS is absent', () => {
    const location = renderSections(evidence, [finding()]);

    expect(location?.textContent).toContain('Pier 2 — Pier 2 north face');
  });

  it('uses the location of an Inspector-confirmed finding before reviewer decision', () => {
    const location = renderSections(
      evidence,
      [finding({ decision: null, decidedByUserId: null, decidedAt: null })],
    );

    expect(location?.textContent).toContain('Pier 2 — Pier 2 north face');
  });
});

describe('ReportDerivedSections confirmed findings', () => {
  it('lists an Inspector-confirmed finding before reviewer decision', () => {
    const section = renderConfirmedFindings([
      finding({ defectLabel: 'GussetPlateSectionLoss', decision: null, decidedByUserId: null, decidedAt: null }),
    ]);

    expect(section?.textContent).toContain('GussetPlateSectionLoss');
    expect(section?.textContent).toContain('UNREVIEWED');
    expect(section?.textContent).toContain('Inspector-proposed finding(s) in this list await Organization Admin decision in Findings.');
    expect(section?.textContent).not.toContain('additional finding(s)');
    expect(section?.textContent).not.toContain('No confirmed findings were recorded');
  });

  it('excludes reviewer-rejected findings from the section', () => {
    const section = renderConfirmedFindings([
      finding({ defectLabel: 'spurious-seam', decision: 'REJECTED' }),
    ]);

    expect(section?.textContent).not.toContain('spurious-seam');
  });
});
