import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InspectorScheduleCalendar } from './InspectorScheduleCalendar';
import type { InspectionListItem } from '../api/inspectionApi';

const mockUseInspections = vi.fn();
vi.mock('../hooks/useInspections', () => ({
  useInspections: (filters: { page: number; pageSize: number }) => mockUseInspections(filters),
}));

const mockItems: InspectionListItem[] = [
  {
    id: 'insp-001',
    organizationId: 'org-111',
    assetId: 'asset-1',
    inspectorId: 'ins-1',
    objective: 'Quarterly Cable Inspection',
    plannedStartAt: '2026-11-10T09:00:00Z',
    plannedEndAt: '2026-11-10T12:00:00Z',
    status: 'READY_FOR_FLIGHT',
    reportId: null,
    reportStatus: null,
    reportVersionNo: null,
    pendingAction: 'NONE',
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  },
  {
    id: 'insp-002',
    organizationId: 'org-111',
    assetId: 'asset-2',
    inspectorId: 'ins-1',
    objective: 'PV Panel Thermal Scanning',
    plannedStartAt: '2026-11-15T14:00:00Z',
    plannedEndAt: '2026-11-15T16:00:00Z',
    status: 'ASSIGNED',
    reportId: null,
    reportStatus: null,
    reportVersionNo: null,
    pendingAction: 'NONE',
    createdAt: '2026-10-02T00:00:00Z',
    updatedAt: '2026-10-02T00:00:00Z',
  },
  {
    id: 'insp-003-unscheduled',
    organizationId: 'org-111',
    assetId: 'asset-3',
    inspectorId: 'ins-1',
    objective: 'Blade Tip Erosion Check',
    plannedStartAt: null,
    plannedEndAt: null,
    status: 'ASSIGNED',
    reportId: null,
    reportStatus: null,
    reportVersionNo: null,
    pendingAction: 'NONE',
    createdAt: '2026-10-03T00:00:00Z',
    updatedAt: '2026-10-03T00:00:00Z',
  },
];

describe('InspectorScheduleCalendar', () => {
  const initialDate = new Date('2026-11-01T00:00:00Z');

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseInspections.mockReturnValue({
      data: {
        items: mockItems,
        totalCount: mockItems.length,
        page: 1,
        pageSize: 100,
        totalPages: 1,
      },
      isLoading: false,
      isError: false,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders calendar toolbar with month title and view toggles', () => {
    render(
      <InspectorScheduleCalendar
        onSelectInspection={vi.fn()}
        initialDate={initialDate}
      />,
    );

    expect(screen.getByText('November 2026')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Month/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Week/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Agenda/i })).toBeTruthy();
  });

  it('renders scheduled inspection items in month view and triggers selection on click', () => {
    const handleSelect = vi.fn();
    render(
      <InspectorScheduleCalendar
        onSelectInspection={handleSelect}
        initialDate={initialDate}
      />,
    );

    // The chip for insp-001 should be displayed in the calendar
    const chip = screen.getByText('Quarterly Cable Inspection');
    expect(chip).toBeTruthy();

    fireEvent.click(chip);
    expect(handleSelect).toHaveBeenCalledWith('insp-001');
  });

  it('displays unscheduled inspections banner and permits inspection selection from unscheduled items', () => {
    const handleSelect = vi.fn();
    render(
      <InspectorScheduleCalendar
        onSelectInspection={handleSelect}
        initialDate={initialDate}
      />,
    );

    expect(screen.getByText(/Unscheduled Inspections \(1\)/i)).toBeTruthy();
    expect(screen.getByText('Blade Tip Erosion Check')).toBeTruthy();

    const unscheduledCard = screen.getByText('Blade Tip Erosion Check');
    fireEvent.click(unscheduledCard);
    expect(handleSelect).toHaveBeenCalledWith('insp-003-unscheduled');
  });

  it('switches view to Week mode and renders weekly schedule columns', () => {
    render(
      <InspectorScheduleCalendar
        onSelectInspection={vi.fn()}
        initialDate={new Date('2026-11-10T00:00:00Z')}
      />,
    );

    const weekBtn = screen.getByRole('button', { name: /Week/i });
    fireEvent.click(weekBtn);

    // Week view displays items with start time
    expect(screen.getByText('Quarterly Cable Inspection')).toBeTruthy();
  });

  it('switches view to Agenda mode and lists inspections sequentially', () => {
    const handleSelect = vi.fn();
    render(
      <InspectorScheduleCalendar
        onSelectInspection={handleSelect}
        initialDate={initialDate}
      />,
    );

    const agendaBtn = screen.getByRole('button', { name: /Agenda/i });
    fireEvent.click(agendaBtn);

    expect(screen.getByText('Quarterly Cable Inspection')).toBeTruthy();
    expect(screen.getByText('PV Panel Thermal Scanning')).toBeTruthy();

    const row = screen.getByText('Quarterly Cable Inspection');
    fireEvent.click(row);
    expect(handleSelect).toHaveBeenCalledWith('insp-001');
  });

  it('navigates previous and next months when arrow buttons are clicked', () => {
    render(
      <InspectorScheduleCalendar
        onSelectInspection={vi.fn()}
        initialDate={initialDate}
      />,
    );

    expect(screen.getByText('November 2026')).toBeTruthy();

    const nextBtn = screen.getByLabelText('Next');
    fireEvent.click(nextBtn);
    expect(screen.getByText('December 2026')).toBeTruthy();

    const prevBtn = screen.getByLabelText('Previous');
    fireEvent.click(prevBtn);
    expect(screen.getByText('November 2026')).toBeTruthy();
  });
});
