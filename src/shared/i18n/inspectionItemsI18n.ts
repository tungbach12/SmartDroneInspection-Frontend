import type { Locale } from './localeContext';
import { viCatalog } from './viCatalog';

const INSPECTION_ITEM_PAIRS: ReadonlyArray<readonly [vi: string, en: string]> = [
  // High-rise office
  [
    'Hệ vách kính mặt dựng (Curtain Wall) & Kính cường lực ngoài trời',
    'Curtain Wall Glass Facade & Exterior Tempered Glazing',
  ],
  [
    'Đường keo Silicone chống thấm & Gioăng cao su liên kết kính',
    'Waterproof Silicone Sealant Joints & Glass Retaining Gaskets',
  ],
  [
    'Khung nhôm định hình (Mullion / Transom) & Lam chắn nắng (Louvers)',
    'Extruded Aluminum Framing (Mullion / Transom) & Sun Louvers',
  ],
  [
    'Sàn mái thượng, Tường chắn mái (Parapet) & Hệ thống chống sét',
    'Main Rooftop Deck, Parapet Wall & Lightning Protection System',
  ],
  [
    'Cụm tháp giải nhiệt (Cooling Tower), Chiller & Dàn nóng VRV/VRF trên mái',
    'Rooftop Cooling Towers, Chillers & VRV/VRF Condensing Units',
  ],
  [
    'Hệ thống ray tời Gondola bảo trì tòa nhà & Móc neo an toàn',
    'Building Maintenance Gondola Rail Track & Safety Anchors',
  ],
  // Residential tower
  [
    'Tường ngoài bê tông, Lớp sơn chống thấm & Vết nứt chân chim mặt đứng',
    'Exterior Concrete Walls, Waterproof Coating & Facade Hairline Cracks',
  ],
  [
    'Hệ thống ban công, Lan can sắt/kính & Lưới an toàn các tầng căn hộ',
    'Apartment Balconies, Steel/Glass Guardrails & Safety Mesh',
  ],
  [
    'Khu vực Lô-gia, Dàn nóng điều hòa treo tường & Ống thoát nước ngoài trời',
    'Loggia Areas, Exterior AC Condensing Units & Outdoor Drain Pipes',
  ],
  [
    'Khe co giãn nhiệt giữa các nguyên đơn (Block) tòa chung cư',
    'Thermal Expansion Joints Between Residential Building Blocks',
  ],
  [
    'Mái Bê tông cốt thép, Bồn nước mái, Quạt tăng áp cầu thang & Chống sét',
    'Reinforced Concrete Roof Deck, Rooftop Water Tanks, Stairwell Pressurization & Lightning Arresters',
  ],
  // Commercial mall
  [
    'Mái kính giếng trời (Skylight / Canopy) & Khung thép chịu lực mái',
    'Skylight / Canopy Glazing & Structural Steel Roof Framing',
  ],
  [
    'Tấm ốp nhôm Aluminium (ACP) mặt tiền & Mối ghép chống thấm',
    'Facade Aluminum Composite Panels (ACP) & Weatherproof Seams',
  ],
  [
    'Hệ thống khung biển quảng cáo, Màn hình LED & Logo khổ lớn mặt ngoài',
    'Exterior Signage Framing, LED Screens & Facade Logo Mounts',
  ],
  [
    'Máng thu nước mưa mái khối đế (Podium) & Phễu thoát nước Siphonic',
    'Podium Roof Rainwater Gutters & Siphonic Drainage Outlets',
  ],
  [
    'Hệ thống ống gió xả khí thải & Cụm AHU/Chiller trên mái',
    'Rooftop Exhaust Ductwork & AHU/Chiller Plant Units',
  ],
  // Industrial factory
  [
    'Mái tôn công nghiệp, Đinh vít lợp mái & Các điểm rỉ sét / dột nước',
    'Industrial Metal Roofing, Fasteners & Rust / Leakage Points',
  ],
  [
    'Hệ thống máng xối thu nước mưa (Gutter) & Ống thoát nước đứng',
    'Industrial Rainwater Gutters & Vertical Downspouts',
  ],
  [
    'Khung vì kèo thép tiền chế, Cột biên & Quạt thông gió mái (Louvers)',
    'Pre-Engineered Steel Roof Trusses, Perimeter Columns & Roof Louvers',
  ],
  [
    'Tấm Pin năng lượng mặt trời áp mái (Rooftop Solar Panels) & Điểm nóng',
    'Rooftop Solar PV Arrays & Thermal Hotspot Checks',
  ],
  [
    'Ống khói công nghiệp, Silo chứa & Đường ống kỹ thuật ngoài trời',
    'Industrial Chimneys, Storage Silos & Exterior Utility Piping',
  ],
  // Hotel / hospital complex
  [
    'Mặt dựng kiến trúc, Mái vòm sảnh chính & Ban công phòng nghỉ',
    'Architectural Facade, Main Lobby Canopy Arch & Guestroom Balconies',
  ],
  [
    'Hệ thống xử lý khí thải y tế / ống thông hơi & Cụm bơm nhiệt trên mái',
    'Medical Exhaust / Vent Risers & Rooftop Heat Pump Units',
  ],
  [
    'Bãi đáp trực thăng sân thượng (Helipad), Đèn hiệu & Lưới bảo vệ',
    'Rooftop Helipad Deck, Beacon Lighting & Perimeter Safety Netting',
  ],
  [
    'Hồ bơi vô cực trên mái / Sân vườn thượng uyển & Chống thấm cổ ống',
    'Rooftop Infinity Pool / Sky Garden & Pipe-Penetration Waterproofing',
  ],
  // Telecom rooftop tower
  [
    'Bệ móng bê tông & Bản mã bu-lông neo chân cột Anten trên mái tòa nhà',
    'Concrete Pedestal & Anchor-Bolt Baseplates on Rooftop Telecom Mast',
  ],
  [
    'Thân tháp thép tự đứng / Dây co cáp giằng (Guy Wires) & Tăng-đơ',
    'Self-Supporting Steel Mast / Guy Wires & Turnbuckles',
  ],
  [
    'Cụm Anten phát sóng RRU, Chảo viba & Giá đỡ (Mounting Brackets)',
    'RRU Antenna Arrays, Microwave Dishes & Mounting Brackets',
  ],
  [
    'Thang leo cáp, Máng cáp Feeder & Hộp tiếp địa chống sét lan truyền',
    'Cable Ladder, Feeder Cable Trays & Surge Grounding Box',
  ],
  [
    'Kim thu sét đỉnh tháp & Đèn báo không chướng ngại vật ban đêm (Aviation Light)',
    'Tower-Top Lightning Rod & Night Aviation Obstruction Warning Light',
  ],
  // Standard building & bridge seeded items
  [
    'Mặt dựng kính & Tường bao ngoài tòa nhà (Exterior Facade & Curtain Wall)',
    'Exterior Facade & Curtain Wall',
  ],
  [
    'Mặt dựng kính & Tường bao ngoài tòa nhà',
    'Exterior Facade & Curtain Wall',
  ],
  [
    'Kết cấu sàn mái, Tường chắn mái & Hệ thống thoát nước mưa',
    'Roof Slab Structure, Parapet Wall & Rainwater Drainage',
  ],
  [
    'Ban công, Lan can bảo vệ & Khe co giãn kết cấu',
    'Balconies, Guardrails & Structural Expansion Joints',
  ],
  [
    'Hệ thống cơ điện trên mái (Chiller, Cooling Tower, Thông gió & Chống sét)',
    'Rooftop MEP Systems (Chiller, Cooling Tower, Ventilation & Lightning Protection)',
  ],
  [
    'Mố cầu & Trụ đỡ (Abutments & Piers)',
    'Bridge Abutments & Piers',
  ],
  [
    'Dầm chính & Dầm biên (Girders & Beams)',
    'Main Girders & Edge Beams',
  ],
  [
    'Khe co giãn & Khớp nối (Expansion Joints)',
    'Bridge Expansion Joints & Bearings',
  ],
  [
    'Hệ cáp văng / Cáp treo (Stay Cables)',
    'Stay Cables & Hanger Assemblies',
  ],
  [
    'Mặt đường & Lan can hộ lan (Deck Surface & Railings)',
    'Bridge Deck Surface & Safety Railings',
  ],
];

const VI_TO_EN = new Map<string, string>();
const EN_TO_VI = new Map<string, string>();

for (const [vi, en] of INSPECTION_ITEM_PAIRS) {
  VI_TO_EN.set(vi.trim().toLowerCase(), en);
  if (!EN_TO_VI.has(en.trim().toLowerCase())) {
    // Prefer the clean Vietnamese label without redundant inline English suffix when displaying in VI
    const cleanVi =
      vi === 'Mặt dựng kính & Tường bao ngoài tòa nhà (Exterior Facade & Curtain Wall)'
        ? 'Mặt dựng kính & Tường bao ngoài tòa nhà'
        : vi;
    EN_TO_VI.set(en.trim().toLowerCase(), cleanVi);
  }
}

const REVERSE_VI_CATALOG = new Map<string, string>();
for (const [en, vi] of Object.entries(viCatalog)) {
  if (!REVERSE_VI_CATALOG.has(vi.trim().toLowerCase())) {
    REVERSE_VI_CATALOG.set(vi.trim().toLowerCase(), en);
  }
}

const OUTCOME_ITEM_PREFIX = /^(Inspected|Đã kiểm tra|Skipped|Bỏ qua)\s*:\s*/i;

/**
 * Translates a building inspection item label cleanly between Vietnamese and English,
 * preserving user-authored custom items and optional "Inspected:" / "Skipped:" prefixes.
 */
export function localizeInspectionItemLabel(rawItem: string, locale: Locale | string): string {
  const trimmed = rawItem.trim();
  if (!trimmed) return rawItem;
  const isVi = locale.toLowerCase().startsWith('vi');

  const prefixMatch = trimmed.match(OUTCOME_ITEM_PREFIX);
  const core = prefixMatch ? trimmed.slice(prefixMatch[0].length).trim() : trimmed;
  const lowerCore = core.toLowerCase();

  let localizedCore = core;
  if (isVi) {
    if (core === 'Mặt dựng kính & Tường bao ngoài tòa nhà (Exterior Facade & Curtain Wall)') {
      localizedCore = 'Mặt dựng kính & Tường bao ngoài tòa nhà';
    } else {
      localizedCore = EN_TO_VI.get(lowerCore) ?? viCatalog[core] ?? core;
    }
  } else {
    localizedCore = VI_TO_EN.get(lowerCore) ?? REVERSE_VI_CATALOG.get(lowerCore) ?? core;
  }

  if (!prefixMatch) {
    return localizedCore;
  }
  const rawPrefix = (prefixMatch[1] ?? '').toLowerCase();
  const isSkipped = rawPrefix === 'skipped' || rawPrefix === 'bỏ qua';
  const localizedPrefix = isSkipped
    ? isVi
      ? 'Bỏ qua'
      : 'Skipped'
    : isVi
      ? 'Đã kiểm tra'
      : 'Inspected';
  return `${localizedPrefix}: ${localizedCore}`;
}

/**
 * Translates any checklist item (pre-flight, post-flight, or target inspection item) bidirectionally
 * based on active UI locale, preserving any trailing parenthetical threshold like `(Site cleared)`.
 */
export function localizeChecklistText(rawItem: string, locale: Locale | string): string {
  const trimmed = rawItem.trim();
  if (!trimmed) return rawItem;
  const direct = localizeInspectionItemLabel(trimmed, locale);
  if (direct !== trimmed) {
    return direct;
  }

  const thresholdMatch = trimmed.match(/^(.+?)\s*(\([^()]+\))$/);
  if (thresholdMatch) {
    const [, base, suffix] = thresholdMatch;
    if (base) {
      const translatedBase = localizeInspectionItemLabel(base.trim(), locale);
      if (translatedBase !== base.trim()) {
        return `${translatedBase} ${suffix}`;
      }
    }
  }
  return trimmed;
}
