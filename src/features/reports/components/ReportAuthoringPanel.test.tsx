import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { EvidenceItem, Finding, InspectionReport } from '@/features/inspections/api/inspectionApi';
import { renderWithRouter } from '@/test/renderWithRouter';
import { ReportAuthoringPanel } from './ReportAuthoringPanel';

const version: InspectionReport = {
  id: 'version-1',
  inspectionReportId: 'report-1',
  versionNo: 1,
  status: 'DRAFT',
  authorUserId: 'inspector-1',
  submittedAt: null,
  reviewerUserId: null,
  reviewedAt: null,
  returnReason: null,
  publishedAt: null,
  createdAt: '2026-10-30T08:00:00Z',
  omissionDisclosure: null,
  sections: {},
};

const findings: Finding[] = [];
const evidenceList: EvidenceItem[] = [];

afterEach(() => cleanup());

describe('ReportAuthoringPanel', () => {
  it('renders report details and action buttons', () => {
    renderWithRouter(
      <ReportAuthoringPanel
        version={version}
        findings={findings}
        evidenceList={evidenceList}
        inspectionId="inspection-1"
        canEdit
      />,
    );

    expect(screen.getByText('Report details')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Preview PDF' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Download report' })).toBeTruthy();
  });
});
