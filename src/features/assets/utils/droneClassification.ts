export interface DroneLegalClassification {
  mtowKg: number | null;
  categoryCode: 'CATEGORY_1' | 'CATEGORY_2' | 'CATEGORY_3' | 'CATEGORY_4' | 'CATEGORY_5';
  shortLabel: string;
  categoryLabel: string;
  requiredLicenseClass: 'CLASS_A' | 'CLASS_B';
  requiredLicenseLabel: string;
  requiresClassB: boolean;
}

/**
 * Classifies an unmanned aircraft into the 5 statutory MTOW tiers under
 * Article 4 & Article 27 of Decree 288/2025/ND-CP:
 * - Category 1: < 0.25 kg (Class A)
 * - Category 2: 0.25 kg to < 2 kg (Class A for VLOS, Class B for BVLOS)
 * - Category 3: 2 kg to < 25 kg (Class B mandatory)
 * - Category 4: 25 kg to < 150 kg (Class B mandatory)
 * - Category 5: >= 150 kg (Class B mandatory)
 */
export function classifyDroneByMtow(
  rawModelOrMetadata?: string | null,
  explicitMtowKg?: number | null,
): DroneLegalClassification {
  const text = (rawModelOrMetadata ?? '').toLowerCase();
  let mtow: number | null =
    typeof explicitMtowKg === 'number' && Number.isFinite(explicitMtowKg) && explicitMtowKg > 0
      ? explicitMtowKg
      : null;

  if (mtow === null && rawModelOrMetadata) {
    const match = rawModelOrMetadata.match(
      /(?:mtow\s*[:=]?\s*|"mtowKg"\s*:\s*)(\d+(?:[.,]\d+)?)\s*(?:kg)?/i,
    );
    if (match?.[1]) {
      const parsed = Number(match[1].replace(',', '.'));
      if (Number.isFinite(parsed) && parsed > 0) {
        mtow = parsed;
      }
    }
  }

  if (mtow === null && text) {
    if (text.includes('matrice 350') || text.includes('m350') || text.includes('matrice 300') || text.includes('m300')) {
      mtow = 9.2;
    } else if (text.includes('matrice 30') || text.includes('m30t') || text.includes('m30')) {
      mtow = 4.07;
    } else if (text.includes('wingtra')) {
      mtow = 4.5;
    } else if (text.includes('elios 3')) {
      mtow = 2.5;
    } else if (text.includes('inspire')) {
      mtow = 4.0;
    } else if (text.includes('agras')) {
      mtow = 40.0;
    } else if (text.includes('mavic 3') || text.includes('m3e') || text.includes('m3t')) {
      mtow = 1.05;
    } else if (text.includes('mini')) {
      mtow = 0.249;
    }
  }

  const effectiveMtow = mtow ?? 0.92;

  if (effectiveMtow < 0.25) {
    return {
      mtowKg: mtow,
      categoryCode: 'CATEGORY_1',
      shortLabel: 'Loại 1 (< 0.25 kg)',
      categoryLabel: 'Loại 1 (< 0.25 kg) · Điều 4 NĐ 288/2025/NĐ-CP',
      requiredLicenseClass: 'CLASS_A',
      requiredLicenseLabel: 'Bằng Hạng A',
      requiresClassB: false,
    };
  }
  if (effectiveMtow < 2) {
    return {
      mtowKg: mtow,
      categoryCode: 'CATEGORY_2',
      shortLabel: 'Loại 2 (0.25 – < 2 kg)',
      categoryLabel: 'Loại 2 (0.25 – < 2 kg) · Điều 4 NĐ 288/2025/NĐ-CP',
      requiredLicenseClass: 'CLASS_A',
      requiredLicenseLabel: 'Bằng Hạng A (VLOS) / Hạng B',
      requiresClassB: false,
    };
  }
  if (effectiveMtow < 25) {
    return {
      mtowKg: mtow,
      categoryCode: 'CATEGORY_3',
      shortLabel: 'Loại 3 (2 – < 25 kg)',
      categoryLabel: 'Loại 3 (2 – < 25 kg) · Điều 4 NĐ 288/2025/NĐ-CP',
      requiredLicenseClass: 'CLASS_B',
      requiredLicenseLabel: 'Bắt buộc Bằng Hạng B (≥ 2 kg)',
      requiresClassB: true,
    };
  }
  if (effectiveMtow < 150) {
    return {
      mtowKg: mtow,
      categoryCode: 'CATEGORY_4',
      shortLabel: 'Loại 4 (25 – < 150 kg)',
      categoryLabel: 'Loại 4 (25 – < 150 kg) · Điều 4 NĐ 288/2025/NĐ-CP',
      requiredLicenseClass: 'CLASS_B',
      requiredLicenseLabel: 'Bắt buộc Bằng Hạng B (≥ 2 kg)',
      requiresClassB: true,
    };
  }
  return {
    mtowKg: mtow,
    categoryCode: 'CATEGORY_5',
    shortLabel: 'Loại 5 (≥ 150 kg)',
    categoryLabel: 'Loại 5 (≥ 150 kg) · Điều 4 NĐ 288/2025/NĐ-CP',
    requiredLicenseClass: 'CLASS_B',
    requiredLicenseLabel: 'Bắt buộc Bằng Hạng B (≥ 2 kg)',
    requiresClassB: true,
  };
}
