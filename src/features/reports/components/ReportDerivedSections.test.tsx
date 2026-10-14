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
  llmModel: null,
  promptVersion: null,
  generatedAt: null,
  evidenceSnapshotHash: null,
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
    repairRequired: false,
    status: 'OPEN',
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

  it('does not use a pending finding location', () => {
    const location = renderSections(evidence, [finding({ decision: null })]);

    expect(location?.textContent).toContain('Not supplied');
    expect(location?.textContent).not.toContain('Pier 2 north face');
  });
});
