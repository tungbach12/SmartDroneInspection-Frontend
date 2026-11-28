import { describe, expect, it } from 'vitest';
import { parseCccdOcrText } from './cccdOcr';

describe('parseCccdOcrText', () => {
  it('extracts citizenId and multi-line address from 2021 chip CCCD front and back MRZ', () => {
    const frontText = `
      CĂN CƯỚC CÔNG DÂN
      Số / No.: 079204012345
      Họ và tên / Full name: NGUYỄN VĂN AN
      Ngày sinh / Date of birth: 19/10/1998
      Nơi thường trú / Place of residence: 45 Lê Lợi, Phường Bến Nghé
      Quận 1, TP. Hồ Chí Minh
      Có giá trị đến / Date of expiry: 19/10/2038
    `;
    const result = parseCccdOcrText({ frontText, backText: '' });
    expect(result.citizenId).toBe('079204012345');
    expect(result.address).toBe('45 Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh');
    expect(result.fullName).toBe('NGUYỄN VĂN AN');
  });

  it('extracts citizenId from front and residence from back on 2024 Căn cước cards', () => {
    const frontText = `
      CĂN CƯỚC
      Số định danh cá nhân / Personal identification number: 001 098 056789
      Họ, chữ đệm và tên khai sinh: TRẦN MINH KHÔI
    `;
    const backText = `
      Nơi cư trú / Place of residence: Khu Công Nghệ Cao, Phường Tăng Nhơn Phú A
      TP. Thủ Đức, TP. Hồ Chí Minh
      Ngày, tháng, năm cấp / Date of issue: 01/08/2024
      IDVNM0980567890001098056789<<4
      9805121M3805128VNM<<<<<<<<<<<2
      TRAN<<MINH<KHOI<<<<<<<<<<<<<<<
    `;
    const result = parseCccdOcrText({ frontText, backText });
    expect(result.citizenId).toBe('001098056789');
    expect(result.address).toBe(
      'Khu Công Nghệ Cao, Phường Tăng Nhơn Phú A, TP. Thủ Đức, TP. Hồ Chí Minh',
    );
  });

  it('falls back to back MRZ when front OCR misses the citizenId', () => {
    const backText = `
      IDVNM0960123457079096012345<<9
      9601011M3601018VNM<<<<<<<<<<<0
      LE<<MINH<NAM<<<<<<<<<<<<<<<<<<
    `;
    const result = parseCccdOcrText({ frontText: '', backText });
    expect(result.citizenId).toBe('079096012345');
    expect(result.fullName).toBe('LE MINH NAM');
  });
});
