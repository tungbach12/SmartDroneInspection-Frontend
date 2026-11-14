export const MINIMUM_INSPECTION_LEAD_DAYS = 20;

function parseIsoDate(value: string): { year: number; month: number; day: number } {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day || month < 1 || month > 12 || day < 1 || day > 31) {
    throw new RangeError(`Invalid ISO date: ${value}`);
  }
  return { year, month, day };
}

export function addCalendarDays(date: string, days: number): string {
  if (!Number.isInteger(days)) throw new RangeError('Calendar day offset must be an integer');
  const { year, month, day } = parseIsoDate(date);
  const result = new Date(Date.UTC(year, month - 1, day + days));
  return formatIsoDate(result.getUTCFullYear(), result.getUTCMonth() + 1, result.getUTCDate());
}

export function addAnchoredMonths(date: string, monthOffset: number): string {
  if (!Number.isInteger(monthOffset) || monthOffset < 0) {
    throw new RangeError('Month offset must be a non-negative integer');
  }
  const { year, month, day } = parseIsoDate(date);
  const targetMonth = new Date(Date.UTC(year, month - 1 + monthOffset, 1));
  const targetYearValue = targetMonth.getUTCFullYear();
  const targetMonthValue = targetMonth.getUTCMonth();
  const lastDay = new Date(Date.UTC(targetYearValue, targetMonthValue + 1, 0)).getUTCDate();
  return formatIsoDate(targetYearValue, targetMonthValue + 1, Math.min(day, lastDay));
}

function formatIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function enumerateMonthlySchedule(
  startDate: string,
  intervalMonths: number,
  options: { count?: number; endDate?: string; maxOccurrences?: number },
): string[] {
  if (!Number.isInteger(intervalMonths) || intervalMonths < 1 || intervalMonths > 120) {
    return [];
  }
  const maxOccurrences = options.maxOccurrences ?? 100;
  if (options.count != null) {
    if (!Number.isInteger(options.count) || options.count < 1 || options.count > maxOccurrences) {
      return [];
    }
    return Array.from({ length: options.count }, (_, index) =>
      addAnchoredMonths(startDate, intervalMonths * index),
    );
  }
  if (!options.endDate || options.endDate < startDate) return [];
  const dates: string[] = [];
  for (let index = 0; index < maxOccurrences; index += 1) {
    const date = addAnchoredMonths(startDate, intervalMonths * index);
    if (date > options.endDate) return dates;
    dates.push(date);
  }
  const nextDate = addAnchoredMonths(startDate, intervalMonths * maxOccurrences);
  if (nextDate <= options.endDate) return [...dates, nextDate];
  return dates;
}
