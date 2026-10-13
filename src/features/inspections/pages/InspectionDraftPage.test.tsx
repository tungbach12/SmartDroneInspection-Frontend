import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithRouter } from '@/test/renderWithRouter';
import { useAuthStore } from '@/features/auth/store/authStore';

const mocks = vi.hoisted(() => ({
  qualityQuery: {
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
  createDraft: { mutate: vi.fn(), isPending: false, isError: false, error: null as Error | null },
  authorManualDraft: {
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null as Error | null,
  },
}));

vi.mock('../hooks/useInspections', () => ({
  useEvidenceQualityHistory: () => mocks.qualityQuery,
  useReportVersions: () => mocks.versionsQuery,
  useGenerateReportDraft: () => mocks.createDraft,
  useAuthorManualDraft: () => mocks.authorManualDraft,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ inspectionId: 'inspection-1' }),
  };
});

import InspectionDraftPage from './InspectionDraftPage';

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

describe('InspectionDraftPage', () => {
  beforeEach(() => {
    cleanup();
    signInAsInspector();
    mocks.qualityQuery = { data: [], isLoading: false, error: null, refetch: vi.fn() };
    mocks.versionsQuery = { data: [], isLoading: false, error: null, refetch: vi.fn() };
    mocks.createDraft.mutate.mockReset();
    mocks.authorManualDraft.mutate.mockReset();
  });

  afterEach(() => {
    cleanup();
    useAuthStore.getState().clearSession();
  });

  it('keeps draft generation blocked until the evidence set is accepted', () => {
    renderWithRouter(<InspectionDraftPage />);

    expect(
      (screen.getByRole('button', { name: 'Generate report draft' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(screen.getByText(/Accept the evidence set before generating/)).toBeTruthy();
  });

  it('generates a draft once accepted', () => {
    mocks.qualityQuery = {
      data: [{ id: 'decision-1', inspectionId: 'inspection-1', decision: 'ACCEPTED' }],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderWithRouter(<InspectionDraftPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Generate report draft' }));
    expect(mocks.createDraft.mutate).toHaveBeenCalledOnce();
  });

  it('keeps the report link disabled until a version exists', () => {
    renderWithRouter(<InspectionDraftPage />);

    expect(
      (screen.getByRole('button', { name: 'Open the report document' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it('opens the report document once a version exists', () => {
    mocks.versionsQuery = {
      data: [{ id: 'version-1', inspectionId: 'inspection-1', versionNo: 1, status: 'DRAFT' }],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderWithRouter(<InspectionDraftPage />);

    const link = screen.getByRole('link', { name: 'Open the report document' });
    expect(link.getAttribute('href')).toContain('inspection-1');
  });

  it('seeds a manual draft with the narrative and disclosure', () => {
    renderWithRouter(<InspectionDraftPage />);

    fireEvent.change(screen.getByLabelText('Narrative'), {
      target: { value: 'Span inspected from the ground.' },
    });
    fireEvent.change(screen.getByLabelText('Omitted analysis disclosure'), {
      target: { value: 'No model run; east face omitted.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save structured draft' }));

    expect(mocks.authorManualDraft.mutate).toHaveBeenCalledWith({
      narrative: 'Span inspected from the ground.',
      omissionDisclosure: 'No model run; east face omitted.',
    });
  });
});
