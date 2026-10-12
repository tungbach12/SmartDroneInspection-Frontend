import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import InspectionDetailPage from './InspectionDetailPage';
import { renderWithRouter as render } from '@/test/renderWithRouter';
import { useAuthStore } from '@/features/auth/store/authStore';

const mocks = vi.hoisted(() => ({
  evidenceQuery: {
    data: [] as unknown[] | undefined,
    isLoading: false,
    error: null as Error | null,
    refetch: vi.fn(),
  },
  findingsQuery: {
    data: [] as unknown[] | undefined,
    isLoading: false,
    error: null as Error | null,
    refetch: vi.fn(),
  },
  versionsQuery: {
    data: [] as unknown[] | undefined,
    isLoading: false,
    error: null as Error | null,
    refetch: vi.fn(),
  },
  decideFinding: {
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null as Error | null,
  },
}));

vi.mock('@/features/inspections/hooks/useInspections', () => ({
  useInspectionEvidence: () => mocks.evidenceQuery,
  useInspectionFindings: () => mocks.findingsQuery,
  useReportVersions: () => mocks.versionsQuery,
  useDecideFinding: () => mocks.decideFinding,
}));

// The MF3 workflow has its own suite; this page composes it and owns the register and findings.
vi.mock('@/features/inspections/components/InspectorWorkspace', () => ({
  InspectorWorkspace: ({ isInspector }: { isInspector: boolean }) => (
    <div data-testid="mf3-workspace" data-is-inspector={String(isInspector)} />
  ),
}));

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({ inspectionId: 'inspection-1' }),
  };
});

function signInAsInspector() {
  useAuthStore.getState().setSession({
    accessToken: 'test-token',
    user: {
      id: 'inspector-1',
      email: 'inspector@example.test',
      fullName: 'Inspector',
      roles: ['INSPECTOR'],
      actorZone: 'CUSTOMER_ORGANIZATION',
      organizationId: 'org-1',
    },
  });
}

function signInAsReviewer() {
  useAuthStore.getState().setSession({
    accessToken: 'test-token',
    user: {
      id: 'admin-1',
      email: 'admin@example.test',
      fullName: 'Reviewer',
      roles: ['ORG_ADMIN'],
      actorZone: 'CUSTOMER_ORGANIZATION',
      organizationId: 'org-1',
    },
  });
}

/** An MF3-06 finding the qualified reviewer has not decided, so it is not official yet. */
function undecidedFinding() {
  return {
    id: 'finding-1',
    inspectionId: 'inspection-1',
    evidenceId: 'evidence-1',
    aiCandidateId: null,
    source: 'MANUAL',
    findingCode: 'F-0001',
    defectLabel: 'Coating blistering',
    severity: 'HIGH',
    locationDescription: 'Girder G4',
    technicalNotes: 'Roughly 60mm across.',
    recommendedAction: 'Repaint.',
    component: null,
    description: null,
    observedCondition: null,
    priority: null,
    measurement: null,
    decision: null,
    repairRequired: true,
    status: 'ACTIVE',
  };
}

beforeEach(() => {
  navigateMock.mockClear();
  signInAsInspector();
  mocks.evidenceQuery.data = [];
  mocks.findingsQuery.data = [];
  mocks.versionsQuery.data = [];
  mocks.decideFinding.isPending = false;
  mocks.decideFinding.isError = false;
  mocks.decideFinding.error = null;
  mocks.decideFinding.mutate.mockReset();
});

afterEach(() => {
  cleanup();
  useAuthStore.getState().clearSession();
});

describe('InspectionDetailPage', () => {
  it('names the inspection it is showing', () => {
    render(<InspectionDetailPage />);

    expect(screen.getByText(/inspection-1/)).toBeTruthy();
  });

  it('offers a way back to the list', () => {
    render(<InspectionDetailPage />);

    const back = screen.getByRole('button', { name: /back to list/i });
    back.click();
    expect(navigateMock).toHaveBeenCalledWith(-1);
  });

  it('renders the MF3 workflow on the inspection route, where a deep link lands', () => {
    render(<InspectionDetailPage />);

    expect(screen.getByTestId('mf3-workspace')).toBeTruthy();
  });

  it('tells the workspace whether this reader is the assigned Inspector', () => {
    signInAsReviewer();

    render(<InspectionDetailPage />);

    expect(screen.getByTestId('mf3-workspace')).toHaveProperty(
      'dataset.isInspector',
      'false',
    );
  });

  it('offers exactly one way to open the report document once MF3-07 produced a version', () => {
    mocks.versionsQuery.data = [
      { id: 'version-1', inspectionId: 'inspection-1', versionNo: 1, status: 'DRAFT' },
    ];

    render(<InspectionDetailPage />);

    // The workflow step that creates the version must not repeat the summary card's action.
    expect(screen.getAllByRole('button', { name: /open report document/i })).toHaveLength(1);
  });

  it('renders the evidence file and its checksum', () => {
    mocks.evidenceQuery.data = [
      {
        id: 'evidence-1',
        fileName: 'north-span-coating.png',
        contentType: 'image/png',
        sizeBytes: 92,
        checksumSha256: 'c03855a05ec95d41c3c7c45a9be1d1af294b0841636dfc077b0bd0dec4cf44b1',
        captureTime: '2026-10-08T08:15:00Z',
        source: 'WEB_UPLOAD',
      },
    ];

    render(<InspectionDetailPage />);

    expect(screen.getByText('north-span-coating.png')).toBeTruthy();
    expect(screen.getByText(/c03855a05ec9/)).toBeTruthy();
  });

  it('previews an image through the stored content endpoint', () => {
    mocks.evidenceQuery.data = [
      {
        id: 'evidence-1',
        fileName: 'north-span-coating.png',
        contentType: 'image/png',
        sizeBytes: 92,
        checksumSha256: 'abc',
        captureTime: null,
        source: 'WEB_UPLOAD',
      },
    ];

    const { container } = render(<InspectionDetailPage />);

    const image = container.querySelector('img');
    expect(image?.getAttribute('src')).toContain(
      '/api/v1/inspections/inspection-1/evidence/evidence-1/content',
    );
  });

  it('says a non-image has no inline preview instead of showing a broken preview', () => {
    mocks.evidenceQuery.data = [
      {
        id: 'evidence-1',
        fileName: 'permit.pdf',
        contentType: 'application/pdf',
        sizeBytes: 2048,
        checksumSha256: 'abc',
        captureTime: null,
        source: 'WEB_UPLOAD',
      },
    ];

    const { container } = render(<InspectionDetailPage />);

    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText(/no inline preview/i)).toBeTruthy();
  });

  it('lists findings with their decision and repair flag', () => {
    mocks.findingsQuery.data = [{ ...undecidedFinding(), decision: 'CONFIRMED' }];

    render(<InspectionDetailPage />);

    expect(screen.getByText('Coating blistering')).toBeTruthy();
    expect(screen.getByText('HIGH')).toBeTruthy();
    expect(screen.getByText('Repair required')).toBeTruthy();
  });

  it('reports an empty evidence set rather than a blank panel', () => {
    render(<InspectionDetailPage />);

    expect(screen.getByText(/no evidence recorded/i)).toBeTruthy();
    expect(screen.getByText(/no findings recorded/i)).toBeTruthy();
  });

  it('withholds MF3-09 from the Inspector, who is the author of the finding', () => {
    mocks.findingsQuery.data = [undecidedFinding()];

    render(<InspectionDetailPage />);

    expect(screen.queryByRole('button', { name: 'Confirm finding' })).toBeNull();
  });

  it('lets a qualified reviewer record the MF3-09 decision the finding needs to be official', () => {
    signInAsReviewer();
    mocks.findingsQuery.data = [undecidedFinding()];

    render(<InspectionDetailPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Confirm finding' }));

    expect(mocks.decideFinding.mutate).toHaveBeenCalledWith({
      findingId: 'finding-1',
      decision: 'CONFIRMED',
      rationale: '',
    });
  });

  it('sends the reviewer rationale with the decision', () => {
    signInAsReviewer();
    mocks.findingsQuery.data = [undecidedFinding()];

    render(<InspectionDetailPage />);

    fireEvent.change(screen.getByLabelText(/reviewer rationale/i), {
      target: { value: 'Blistering visible in the capture and matches the shot-list entry.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reject finding' }));

    expect(mocks.decideFinding.mutate).toHaveBeenCalledWith({
      findingId: 'finding-1',
      decision: 'REJECTED',
      rationale: 'Blistering visible in the capture and matches the shot-list entry.',
    });
  });

  it('does not offer a second decision once the reviewer has made one', () => {
    signInAsReviewer();
    mocks.findingsQuery.data = [{ ...undecidedFinding(), decision: 'CONFIRMED' }];

    render(<InspectionDetailPage />);

    expect(screen.queryByRole('button', { name: 'Confirm finding' })).toBeNull();
    expect(screen.getByText('CONFIRMED')).toBeTruthy();
  });

  it('surfaces a refused reviewer decision instead of dropping it', () => {
    signInAsReviewer();
    mocks.findingsQuery.data = [undecidedFinding()];
    mocks.decideFinding.isError = true;
    mocks.decideFinding.error = new Error('REPORT_SCOPE_DENIED');

    render(<InspectionDetailPage />);

    expect(screen.getByRole('alert').textContent).toContain('REPORT_SCOPE_DENIED');
  });
});
