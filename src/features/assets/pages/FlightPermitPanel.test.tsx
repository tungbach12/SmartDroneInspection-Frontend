import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useCreateFlightPermit, useFlightPermits, useReviewFlightPermit } from '../hooks/useFlightPermits';
import { FlightPermitPanel } from './FlightPermitPanel';

vi.mock('@/features/auth/store/authStore', () => ({ useAuthStore: vi.fn() }));
vi.mock('../hooks/useFlightPermits', () => ({
  useCreateFlightPermit: vi.fn(),
  useFlightPermits: vi.fn(),
  useReviewFlightPermit: vi.fn(),
}));

const PERMIT = {
  id: 'permit-1',
  organizationId: 'org-1',
  assetId: null,
  areaReference: 'North sector',
  permitType: 'FLIGHT',
  issuingAuthority: 'Aviation Office',
  permitReference: 'REF-001',
  geographicScope: '{"zone":"north"}',
  validFrom: '2026-10-13T00:00:00Z',
  validUntil: '2026-12-13T00:00:00Z',
  conditions: '["daylight only"]',
  status: 'APPLICATION' as const,
  sourceEvidenceId: null,
  reviewedByUserId: null,
  reviewedAt: null,
  reviewReason: null,
  createdAt: '2026-10-13T00:00:00Z',
};

const createMutate = vi.fn();
const reviewMutate = vi.fn();

function setDefaults() {
  vi.mocked(useAuthStore).mockImplementation(((selector: (state: { roles: string[] }) => unknown) =>
    selector({ roles: ['ORG_ADMIN'] })) as never);
  vi.mocked(useFlightPermits).mockReturnValue({ data: [PERMIT], isLoading: false, error: null, refetch: vi.fn() } as never);
  vi.mocked(useCreateFlightPermit).mockReturnValue({ mutate: createMutate, isPending: false, isError: false, error: null, reset: vi.fn() } as never);
  vi.mocked(useReviewFlightPermit).mockReturnValue({ mutate: reviewMutate, isPending: false, isError: false, error: null } as never);
}

describe('FlightPermitPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDefaults();
  });
  afterEach(() => cleanup());

  it('identifies statuses as organization-recorded, not externally verified', () => {
    render(<FlightPermitPanel />);
    expect(screen.getByText(/organization-recorded permit status/i)).toBeTruthy();
    expect(screen.getByText(/no authority or registry verification is performed/i)).toBeTruthy();
    expect(screen.queryByText(/verified|approved by authority|cleared to fly/i)).toBeNull();
  });

  it('renders all six recorded status values', () => {
    const statuses = ['APPLICATION', 'ACTIVE', 'EXPIRED', 'REJECTED', 'REVOKED', 'NOT_APPLICABLE'] as const;
    vi.mocked(useFlightPermits).mockReturnValue({
      data: statuses.map((status, index) => ({ ...PERMIT, id: `permit-${index}`, status })),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as never);
    render(<FlightPermitPanel />);
    for (const status of statuses) expect(screen.getAllByText(status).length).toBeGreaterThan(0);
  });

  it('creates permit with valid JSON and no fabricated resource selection', () => {
    render(<FlightPermitPanel />);
    fireEvent.click(screen.getByRole('button', { name: /record permit/i }));
    const dialog = screen.getByRole('dialog', { name: /record organization permit/i });
    fireEvent.change(within(dialog).getByLabelText(/permit type/i), { target: { value: 'FLIGHT' } });
    fireEvent.change(within(dialog).getByLabelText(/geographic scope json/i), {
      target: { value: '{"zone":"south"}' },
    });
    fireEvent.change(within(dialog).getByLabelText(/conditions json/i), {
      target: { value: '["daytime"]' },
    });
    fireEvent.submit(dialog.querySelector('form')!);

    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        permitType: 'FLIGHT',
        geographicScope: '{"zone":"south"}',
        conditions: '["daytime"]',
      }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    const input = createMutate.mock.calls[0]![0] as Record<string, unknown>;
    expect(input).not.toHaveProperty('organizationId');
    expect(input).not.toHaveProperty('assetId');
    expect(input).not.toHaveProperty('sourceEvidenceId');
  });

  it('clears an unsaved draft when the create dialog is cancelled', () => {
    render(<FlightPermitPanel />);
    fireEvent.click(screen.getByRole('button', { name: /record permit/i }));
    let dialog = screen.getByRole('dialog', { name: /record organization permit/i });
    const typeInput = within(dialog).getByLabelText(/permit type/i);
    fireEvent.change(typeInput, { target: { value: 'DRAFT TYPE' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /cancel/i }));

    fireEvent.click(screen.getByRole('button', { name: /record permit/i }));
    dialog = screen.getByRole('dialog', { name: /record organization permit/i });
    expect((within(dialog).getByLabelText(/permit type/i) as HTMLInputElement).value).toBe('');
  });

  it('blocks malformed JSON and invalid date order', () => {
    render(<FlightPermitPanel />);
    fireEvent.click(screen.getByRole('button', { name: /record permit/i }));
    const dialog = screen.getByRole('dialog', { name: /record organization permit/i });
    fireEvent.change(within(dialog).getByLabelText(/geographic scope json/i), { target: { value: '{bad' } });
    fireEvent.change(within(dialog).getByLabelText(/valid from/i), { target: { value: '2026-12-01T00:00' } });
    fireEvent.change(within(dialog).getByLabelText(/valid until/i), { target: { value: '2026-11-01T00:00' } });
    fireEvent.submit(dialog.querySelector('form')!);

    expect(screen.getByText(/enter valid json/i)).toBeTruthy();
    expect(screen.getByText(/valid until must be after valid from/i)).toBeTruthy();
    expect(createMutate).not.toHaveBeenCalled();
  });

  it('requires a reason for internal review and limits review controls to ORG_ADMIN', () => {
    render(<FlightPermitPanel />);
    fireEvent.click(screen.getByRole('button', { name: /review permit/i }));
    const dialog = screen.getByRole('dialog', { name: /internal permit record review/i });
    fireEvent.change(within(dialog).getByLabelText(/reason/i), { target: { value: 'Recorded from organization-held document' } });
    fireEvent.submit(dialog.querySelector('form')!);
    expect(reviewMutate).toHaveBeenCalledWith(
      { id: 'permit-1', input: { status: 'APPLICATION', reason: 'Recorded from organization-held document' } },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );

    cleanup();
    vi.mocked(useAuthStore).mockImplementation(((selector: (state: { roles: string[] }) => unknown) =>
      selector({ roles: ['ADMIN'] })) as never);
    render(<FlightPermitPanel />);
    expect(screen.queryByRole('button', { name: /record permit/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /review permit/i })).toBeNull();
  });

  it('renders list loading, retry and empty states', () => {
    vi.mocked(useFlightPermits).mockReturnValue({ data: undefined, isLoading: true, error: null, refetch: vi.fn() } as never);
    const { rerender } = render(<FlightPermitPanel />);
    expect(screen.getByRole('status').textContent).toMatch(/loading permit records/i);

    const retry = vi.fn();
    vi.mocked(useFlightPermits).mockReturnValue({ data: undefined, isLoading: false, error: new Error('offline'), refetch: retry } as never);
    rerender(<FlightPermitPanel />);
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(retry).toHaveBeenCalledOnce();

    vi.mocked(useFlightPermits).mockReturnValue({ data: [], isLoading: false, error: null, refetch: vi.fn() } as never);
    rerender(<FlightPermitPanel />);
    expect(screen.getByText(/no permit records yet/i)).toBeTruthy();
  });
});
