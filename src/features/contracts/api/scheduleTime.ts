const DATE_TIME_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

function zonedParts(instant: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
  };
}

function localEpoch(parts: ZonedParts): number {
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
}

function isSameLocalMinute(left: ZonedParts, right: ZonedParts): boolean {
  return (
    left.year === right.year &&
    left.month === right.month &&
    left.day === right.day &&
    left.hour === right.hour &&
    left.minute === right.minute
  );
}

export function instantToDateTimeInput(instant: string, timeZone: string): string {
  const date = new Date(instant);
  if (!Number.isFinite(date.getTime())) throw new Error('Invalid scheduled time.');
  const { year, month, day, hour, minute } = zonedParts(date, timeZone);
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** Convert a customer-local datetime input to the instant expected by the Backend API. */
export function dateTimeInputToInstant(value: string, timeZone: string): string {
  const match = DATE_TIME_INPUT_PATTERN.exec(value);
  if (!match) throw new Error('Choose a valid start and end time.');
  const [, yearText, monthText, dayText, hourText, minuteText] = match;
  const local = {
    year: Number(yearText),
    month: Number(monthText),
    day: Number(dayText),
    hour: Number(hourText),
    minute: Number(minuteText),
  };
  const localDate = new Date(localEpoch(local));
  if (
    localDate.getUTCFullYear() !== local.year ||
    localDate.getUTCMonth() + 1 !== local.month ||
    localDate.getUTCDate() !== local.day ||
    local.hour > 23 ||
    local.minute > 59
  ) {
    throw new Error('Choose a valid start and end time.');
  }

  const expectedLocalEpoch = localEpoch(local);
  let candidateEpoch = expectedLocalEpoch;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const candidate = new Date(candidateEpoch);
    const actual = zonedParts(candidate, timeZone);
    const difference = expectedLocalEpoch - localEpoch(actual);
    if (difference === 0) {
      if (!isSameLocalMinute(actual, local)) break;
      return candidate.toISOString();
    }
    candidateEpoch += difference;
  }
  throw new Error('This local time does not exist in the customer timezone. Choose another time.');
}
