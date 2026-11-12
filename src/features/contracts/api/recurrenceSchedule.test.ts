import { describe, expect, it } from 'vitest';
import {
  addAnchoredMonths,
  addCalendarDays,
  enumerateMonthlySchedule,
  MINIMUM_INSPECTION_LEAD_DAYS,
} from './recurrenceSchedule';

describe('monthly recurrence schedule', () => {
  it('keeps a month-end anchor across shorter months', () => {
    expect(
      enumerateMonthlySchedule('2027-01-31', 1, { count: 4 }),
    ).toEqual(['2027-01-31', '2027-02-28', '2027-03-31', '2027-04-30']);
  });

  it('supports presets and custom month intervals', () => {
    expect(addAnchoredMonths('2027-01-31', 3)).toBe('2027-04-30');
    expect(addAnchoredMonths('2027-01-31', 6)).toBe('2027-07-31');
    expect(addAnchoredMonths('2027-01-31', 9)).toBe('2027-10-31');
    expect(addAnchoredMonths('2027-01-31', 12)).toBe('2028-01-31');
    expect(addAnchoredMonths('2027-01-31', 18)).toBe('2028-07-31');
  });

  it('enumerates an end-date schedule inclusively', () => {
    expect(
      enumerateMonthlySchedule('2027-01-31', 3, { endDate: '2027-10-31' }),
    ).toEqual(['2027-01-31', '2027-04-30', '2027-07-31', '2027-10-31']);
  });

  it('returns an overflow sentinel when an end-date schedule exceeds the cap', () => {
    expect(
      enumerateMonthlySchedule('2027-01-01', 1, { endDate: '2036-01-01', maxOccurrences: 100 }),
    ).toHaveLength(101);
  });

  it('uses the inclusive 20-calendar-day lead-time minimum', () => {
    expect(addCalendarDays('2026-11-11', MINIMUM_INSPECTION_LEAD_DAYS)).toBe('2026-12-01');
    expect(addCalendarDays('2026-11-30', MINIMUM_INSPECTION_LEAD_DAYS)).toBe('2026-12-20');
  });
});
