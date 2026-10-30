import { describe, expect, it } from 'vitest';
import { dateTimeInputToInstant, instantToDateTimeInput } from './scheduleTime';

describe('scheduleTime', () => {
  it('converts a customer-local date-time into the matching instant', () => {
    expect(dateTimeInputToInstant('2027-02-10T09:30', 'Asia/Ho_Chi_Minh'))
      .toBe('2027-02-10T02:30:00.000Z');
  });

  it('formats an instant for a customer-local date-time input', () => {
    expect(instantToDateTimeInput('2027-02-10T02:30:00Z', 'Asia/Ho_Chi_Minh'))
      .toBe('2027-02-10T09:30');
  });

  it('rejects local times skipped by a daylight-saving transition', () => {
    expect(() => dateTimeInputToInstant('2027-03-28T02:30', 'Europe/Berlin'))
      .toThrow('does not exist in the customer timezone');
  });
});
