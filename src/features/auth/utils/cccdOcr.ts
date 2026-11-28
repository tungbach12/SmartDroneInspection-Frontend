const CCCD_OCR_TIMEOUT_MS = 25_000;

export interface CccdExtractionResult {
  citizenId: string | null;
  address: string | null;
  fullName: string | null;
}

function stripAccents(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

function normalizeSpace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function cleanTrailingLabelNoise(value: string): string {
  return value.replace(/^[:/\-.\s]+/, '').replace(/\s{2,}/g, ' ').trim();
}

const STOP_LINE_PATTERNS = [
  /co gia tri/i,
  /date of expiry/i,
  /ngay cap/i,
  /date of issue/i,
  /noi dang ky khai sinh/i,
  /place of birth/i,
  /dac diem nhan dang/i,
  /personal identification/i,
  /que quan/i,
  /place of origin/i,
  /quoc tich/i,
  /nationality/i,
  /gioi tinh/i,
  /^\s*sex\b/i,
  /ngay.*thang.*nam/i,
  /cuc truong/i,
  /bo cong an/i,
  /canh sat quan ly/i,
  /idvnm/i,
  /<<</,
  /^\s*\d{2}\/\d{2}\/\d{4}\s*$/,
];

function isStopLine(rawLine: string): boolean {
  const normalized = stripAccents(rawLine).trim();
  if (!normalized) return true;
  return STOP_LINE_PATTERNS.some((pattern) => pattern.test(normalized));
}

function extractCitizenIdFromText(text: string): string | null {
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    const normalized = stripAccents(line);
    if (
      /(?:so\s*dinh\s*danh\s*ca\s*nhan|personal\s*identification\s*number|so\s*\/?\s*no\.?|so\s*cccd|cccd|so\s*cmnd|id\s*no)/i.test(
        normalized,
      )
    ) {
      const compactDigits = line.replace(/(?<=\d)\s+(?=\d)/g, '');
      const twelve = compactDigits.match(/\b(0\d{11})\b/);
      if (twelve?.[1]) return twelve[1];
      const nine = compactDigits.match(/\b(\d{9})\b/);
      if (nine?.[1]) return nine[1];
    }
  }

  // ICAO TD1 MRZ on the back of Vietnamese CCCD: IDVNM + 9-digit doc + 1 check digit + 12-digit CCCD
  const mrzCompact = text.replace(/[^A-Za-z0-9<\n]/g, '').toUpperCase();
  for (const mrzLine of mrzCompact.split(/\r?\n/)) {
    if (mrzLine.includes('IDVNM') || mrzLine.includes('VNM')) {
      const td1Match =
        mrzLine.match(/IDVNM\d{10}(0\d{11})/) ??
        mrzLine.match(/(0\d{11})</) ??
        mrzLine.match(/(0\d{11})/);
      if (td1Match?.[1]) return td1Match[1];
    }
  }

  // General fallback: standalone 12-digit Vietnamese CCCD starting with 0
  const fallback = text.replace(/(?<=\d)\s+(?=\d)/g, '').match(/\b(0\d{11})\b/);
  return fallback?.[1] ?? null;
}

function extractAddressFromText(text: string): string | null {
  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? '';
    const normalized = stripAccents(line);
    const labelMatch = normalized.match(
      /(?:noi\s*(?:thuong|cu)\s*tru(?:\s*\/\s*place\s*of\s*residence)?|place\s*of\s*residence|thuong\s*tru|dia\s*chi)\s*[:/\-]?\s*(.*)$/i,
    );
    if (!labelMatch) continue;

    // Slice from the original accented line using the matched label prefix length
    const prefixEnd = line.length - (labelMatch[1]?.length ?? 0);
    const firstSegment = cleanTrailingLabelNoise(line.slice(Math.max(0, prefixEnd)));
    const collected: string[] = [];
    if (firstSegment && !isStopLine(firstSegment)) {
      collected.push(firstSegment);
    }

    for (let offset = 1; offset <= 2 && i + offset < lines.length; offset += 1) {
      const nextLine = normalizeSpace(lines[i + offset] ?? '');
      if (!nextLine || isStopLine(nextLine)) break;
      const cleanedNext = cleanTrailingLabelNoise(nextLine);
      if (cleanedNext) {
        collected.push(cleanedNext);
      }
    }

    const joined = normalizeSpace(collected.join(', ')).replace(/,\s*,+/g, ',');
    if (joined.length >= 4) {
      return joined;
    }
  }

  return null;
}

function extractFullNameFromText(frontText: string, backText: string): string | null {
  const frontLines = frontText.split(/\r?\n/);
  for (let i = 0; i < frontLines.length; i += 1) {
    const line = frontLines[i] ?? '';
    const normalized = stripAccents(line);
    const match = normalized.match(
      /(?:ho\s*(?:va|&)\s*ten(?:\s*\/\s*full\s*name)?|full\s*name)\s*[:/\-]?\s*(.*)$/i,
    );
    if (!match) continue;
    const prefixEnd = line.length - (match[1]?.length ?? 0);
    const sameLine = cleanTrailingLabelNoise(line.slice(Math.max(0, prefixEnd)));
    if (sameLine && !isStopLine(sameLine) && sameLine.length >= 3) {
      return sameLine;
    }
    const nextLine = cleanTrailingLabelNoise(frontLines[i + 1] ?? '');
    if (nextLine && !isStopLine(nextLine) && nextLine.length >= 3) {
      return nextLine;
    }
  }

  // Fallback to MRZ line 3 (SURNAME<<GIVEN<NAMES)
  for (const rawLine of backText.split(/\r?\n/)) {
    const line = rawLine.trim().toUpperCase();
    if (/^[A-Z]+<<[A-Z<]+$/.test(line)) {
      const formatted = line.replace(/<+/g, ' ').trim();
      if (formatted.length >= 3) return formatted;
    }
  }

  return null;
}

/**
 * Parses Vietnamese Citizen ID (CCCD / Căn cước) front and back OCR text into structured form fields.
 */
export function parseCccdOcrText({
  frontText = '',
  backText = '',
}: {
  frontText?: string;
  backText?: string;
}): CccdExtractionResult {
  const citizenId =
    extractCitizenIdFromText(frontText) ?? extractCitizenIdFromText(backText);
  // 2021 chip CCCD prints residence on the front; 2024 ID card prints residence on the back.
  const address =
    extractAddressFromText(frontText) ?? extractAddressFromText(backText);
  const fullName = extractFullNameFromText(frontText, backText);

  return {
    citizenId,
    address,
    fullName,
  };
}

/**
 * Runs browser-side OCR (Vietnamese + English with English fallback) on a CCCD front or back photo.
 */
export async function extractCccdImageText(file: File): Promise<string> {
  if (!file.type.startsWith('image/') || typeof Worker === 'undefined') {
    return '';
  }

  const runWithLang = async (lang: string): Promise<string> => {
    let worker: Awaited<ReturnType<typeof import('tesseract.js')['createWorker']>> | null = null;
    try {
      const { createWorker } = await import('tesseract.js');
      worker = await createWorker(lang);
      const timeoutPromise = new Promise<string>((resolve) => {
        window.setTimeout(() => resolve(''), CCCD_OCR_TIMEOUT_MS);
      });
      const ocrPromise = worker
        .recognize(file)
        .then((result) => result.data.text?.trim() ?? '');
      return await Promise.race([ocrPromise, timeoutPromise]);
    } catch {
      return '';
    } finally {
      if (worker) {
        await worker.terminate().catch(() => undefined);
      }
    }
  };

  const vietnameseText = await runWithLang('vie+eng');
  if (vietnameseText) return vietnameseText;
  return runWithLang('eng');
}
