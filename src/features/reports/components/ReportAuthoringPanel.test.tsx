import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
  sections: { executiveSummary: 'Original summary.' },
};

const findings: Finding[] = [];
const evidenceList: EvidenceItem[] = [];

afterEach(() => cleanup());

describe('ReportAuthoringPanel', () => {
  it('shows unsaved state and reports it to the workflow shell, then clears after save', async () => {
    const onDirtyChange = vi.fn();
    const onSaveSections = vi.fn().mockResolvedValue(undefined);
    renderWithRouter(
      <ReportAuthoringPanel
        version={version}
        findings={findings}
        evidenceList={evidenceList}
        inspectionId="inspection-1"
        canEdit
        onSaveSections={onSaveSections}
        onDirtyChange={onDirtyChange}
      />,
    );

    expect(screen.getByRole('status').textContent).toContain('All changes saved');
    fireEvent.change(screen.getByLabelText('Executive summary text'), {
      target: { value: 'Updated summary.' },
    });
    expect(screen.getByRole('status').textContent).toContain('Unsaved changes');
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);

    fireEvent.click(screen.getByRole('button', { name: 'Save sections' }));
    expect(onSaveSections).toHaveBeenCalledOnce();
  });
});
