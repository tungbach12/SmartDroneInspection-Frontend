/**
 * Standardized Vietnamese bank catalog matching VietQR / SePay bank short codes.
 *
 * Keeping the UI selector bound to this list guarantees generated `qr.sepay.vn` / `vietqr.app`
 * bank query parameters resolve cleanly across Vietnamese banking apps.
 */
export interface VietQrBank {
  /** Canonical VietQR short code sent to SePay/VietQR endpoints (e.g. `VCB`, `MB`, `TPB`). */
  code: string;
  /** Short trading name commonly recognized by users. */
  shortName: string;
  /** Full Vietnamese bank name. */
  name: string;
  /** Known aliases used in legacy/manual entries to preserve backward compatibility. */
  aliases?: readonly string[];
}

export const VIETQR_BANKS: readonly VietQrBank[] = [
  { code: 'VCB', shortName: 'Vietcombank', name: 'Ngân hàng TMCP Ngoại thương Việt Nam', aliases: ['NGAN HANG NGOAI THUONG'] },
  { code: 'TCB', shortName: 'Techcombank', name: 'Ngân hàng TMCP Kỹ thương Việt Nam', aliases: ['KY THUONG'] },
  { code: 'MB', shortName: 'MBBank', name: 'Ngân hàng TMCP Quân đội', aliases: ['MB BANK', 'QUAN DOI'] },
  { code: 'ICB', shortName: 'VietinBank', name: 'Ngân hàng TMCP Công thương Việt Nam', aliases: ['VIETIN BANK', 'CONG THUONG', 'CTG'] },
  { code: 'BIDV', shortName: 'BIDV', name: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam', aliases: ['DAU TU VA PHAT TRIEN', 'BID'] },
  { code: 'VBA', shortName: 'Agribank', name: 'Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam', aliases: ['AGRI', 'NONG NGHIEP'] },
  { code: 'ACB', shortName: 'ACB', name: 'Ngân hàng TMCP Á Châu', aliases: ['A CHAU'] },
  { code: 'VPB', shortName: 'VPBank', name: 'Ngân hàng TMCP Việt Nam Thịnh Vượng', aliases: ['VP BANK', 'VIET NAM THINH VUONG'] },
  { code: 'TPB', shortName: 'TPBank', name: 'Ngân hàng TMCP Tiên Phong', aliases: ['TP BANK', 'TIEN PHONG'] },
  { code: 'STB', shortName: 'Sacombank', name: 'Ngân hàng TMCP Sài Gòn Thương Tín', aliases: ['SACOM'] },
  { code: 'VIB', shortName: 'VIB', name: 'Ngân hàng TMCP Quốc tế Việt Nam', aliases: ['QUOC TE'] },
  { code: 'HDB', shortName: 'HDBank', name: 'Ngân hàng TMCP Phát triển TP.HCM', aliases: ['HD BANK'] },
  { code: 'SHB', shortName: 'SHB', name: 'Ngân hàng TMCP Sài Gòn - Hà Nội', aliases: ['SAI GON HA NOI'] },
  { code: 'OCB', shortName: 'OCB', name: 'Ngân hàng TMCP Phương Đông', aliases: ['PHUONG DONG'] },
  { code: 'MSB', shortName: 'MSB', name: 'Ngân hàng TMCP Hàng Hải Việt Nam', aliases: ['MARITIME', 'HANG HAI'] },
  { code: 'EIB', shortName: 'Eximbank', name: 'Ngân hàng TMCP Xuất Nhập Khẩu Việt Nam', aliases: ['EXIM'] },
  { code: 'LPB', shortName: 'LPBank', name: 'Ngân hàng TMCP Lộc Phát Việt Nam', aliases: ['LIENVIETPOSTBANK', 'LIEN VIET', 'LOC PHAT'] },
  { code: 'SEAB', shortName: 'SeABank', name: 'Ngân hàng TMCP Đông Nam Á', aliases: ['SEA BANK', 'DONG NAM A'] },
  { code: 'SCB', shortName: 'SCB', name: 'Ngân hàng TMCP Sài Gòn', aliases: ['SAI GON'] },
  { code: 'NAB', shortName: 'Nam A Bank', name: 'Ngân hàng TMCP Nam Á', aliases: ['NAM A'] },
  { code: 'BAB', shortName: 'Bac A Bank', name: 'Ngân hàng TMCP Bắc Á', aliases: ['BAC A'] },
  { code: 'ABB', shortName: 'ABBank', name: 'Ngân hàng TMCP An Bình', aliases: ['AN BINH'] },
  { code: 'VAB', shortName: 'VietABank', name: 'Ngân hàng TMCP Việt Á', aliases: ['VIET A'] },
  { code: 'BVB', shortName: 'BaoViet Bank', name: 'Ngân hàng TMCP Bảo Việt', aliases: ['BAO VIET'] },
  { code: 'KLB', shortName: 'KienLongBank', name: 'Ngân hàng TMCP Kiên Long', aliases: ['KIEN LONG'] },
  { code: 'PGB', shortName: 'PGBank', name: 'Ngân hàng TMCP Thịnh vượng và Phát triển', aliases: ['PG BANK'] },
  { code: 'SGB', shortName: 'SaigonBank', name: 'Ngân hàng TMCP Sài Gòn Công Thương', aliases: ['SAIGON BANK'] },
  { code: 'NVB', shortName: 'NCB', name: 'Ngân hàng TMCP Quốc Dân', aliases: ['QUOC DAN'] },
  { code: 'VCCB', shortName: 'BVBank', name: 'Ngân hàng TMCP Bản Việt', aliases: ['BAN VIET', 'VIET CAPITAL'] },
  { code: 'VBB', shortName: 'Vietbank', name: 'Ngân hàng TMCP Việt Nam Thương Tín', aliases: ['VIET BANK'] },
  { code: 'OCEANBANK', shortName: 'OceanBank', name: 'Ngân hàng TMCP Đại Dương', aliases: ['MBV', 'DAI DUONG'] },
  { code: 'CBB', shortName: 'CB Bank', name: 'Ngân hàng TM Xây dựng Việt Nam', aliases: ['VNCB', 'XAY DUNG'] },
  { code: 'GPB', shortName: 'GPBank', name: 'Ngân hàng TM Dầu khí Toàn cầu', aliases: ['GP BANK'] },
  { code: 'CAKE', shortName: 'CAKE', name: 'Ngân hàng số CAKE by VPBank', aliases: ['CAKE BY VPBANK'] },
  { code: 'Ubank', shortName: 'Ubank', name: 'Ngân hàng số Ubank by VPBank', aliases: ['UBANK BY VPBANK'] },
  { code: 'TIMO', shortName: 'Timo', name: 'Ngân hàng số Timo by Ban Viet Bank', aliases: ['TIMO PLUS'] },
  { code: 'CIMB', shortName: 'CIMB', name: 'Ngân hàng TNHH MTV CIMB Việt Nam' },
  { code: 'WVN', shortName: 'Woori Bank', name: 'Ngân hàng TNHH MTV Woori Việt Nam', aliases: ['WOORI'] },
  { code: 'SHBVN', shortName: 'Shinhan Bank', name: 'Ngân hàng TNHH MTV Shinhan Việt Nam', aliases: ['SHINHAN'] },
  { code: 'HSBC', shortName: 'HSBC', name: 'Ngân hàng TNHH MTV HSBC Việt Nam' },
];

function normalizeToken(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^A-Z0-9]/g, '');
}

/** Matches a stored bank code, short name, or legacy free-text bank name to a VietQR bank entry. */
export function findVietQrBank(value: string | null | undefined): VietQrBank | null {
  if (!value?.trim()) return null;
  const target = normalizeToken(value);
  if (!target) return null;

  return (
    VIETQR_BANKS.find((bank) => {
      if (normalizeToken(bank.code) === target || normalizeToken(bank.shortName) === target) {
        return true;
      }
      return Boolean(bank.aliases?.some((alias) => normalizeToken(alias) === target));
    }) ?? null
  );
}

/** Formats a stored bank code or legacy bank string cleanly (e.g. `Vietcombank (VCB)`). */
export function formatVietQrBankDisplay(value: string | null | undefined): string {
  if (!value?.trim()) return '—';
  const matched = findVietQrBank(value);
  if (!matched) return value.trim();
  return matched.shortName.toUpperCase() === matched.code.toUpperCase()
    ? matched.shortName
    : `${matched.shortName} (${matched.code})`;
}
