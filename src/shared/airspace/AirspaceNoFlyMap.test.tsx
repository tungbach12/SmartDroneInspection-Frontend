import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AirspaceNoFlyMap } from './AirspaceNoFlyMap';
import {
  calculatePolygonPerimeterAndArea,
  evaluateAirspace,
  extractCoordinates,
  formatLocation,
  searchVietnamLandmarks,
} from './airspaceZones';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe('airspaceZones & AirspaceNoFlyMap', () => {
  it('evaluates prohibited, restricted, and clear coordinates with MSG28', () => {
    const noFly = evaluateAirspace(10.8188, 106.6519);
    expect(noFly.classification).toBe('NO_FLY_ZONE');
    expect(noFly.messageCode).toBe('MSG28');
    expect(noFly.matchingZones.some((z) => z.code === 'VN-NFZ-SGN-TSN-CORE')).toBe(true);

    const restricted = evaluateAirspace(10.7789, 106.7082);
    expect(restricted.classification).toBe('RESTRICTED_ZONE');
    expect(restricted.messageCode).toBe('MSG28');
    expect(restricted.matchingZones.some((z) => z.code === 'VN-RES-SGN-SAIGON-RIVER')).toBe(true);

    const clear = evaluateAirspace(10.55, 106.85);
    expect(clear.classification).toBe('CLEAR_ZONE');
    expect(clear.messageCode).toBe('AIRSPACE_CLEAR');
  });

  it('extracts coordinates from explicit numbers or JSON locationText', () => {
    expect(extractCoordinates('{"latitude":10.7789,"longitude":106.7082,"label":"Bridge"}')).toEqual({
      latitude: 10.7789,
      longitude: 106.7082,
      label: 'Bridge',
    });

    expect(extractCoordinates('District 1', 10.7769, 106.6953)).toEqual({
      latitude: 10.7769,
      longitude: 106.6953,
      label: 'District 1',
    });
  });

  it('renders MSG28 warning, zone details, and cambay.mod.gov.vn link for restricted asset coordinates', () => {
    render(
      <AirspaceNoFlyMap
        assetName="Cầu Thủ Thiêm 2 (Cầu Ba Son)"
        locationText='{"latitude":10.7789,"longitude":106.7082,"label":"Quận 1 - TP. Thủ Đức"}'
      />,
    );

    expect(screen.getAllByText(/MSG28/).length).toBeGreaterThan(0);
    expect(
      screen.getByText(
        /A possible restriction is indicated\. Verify current applicable authority permission; this lookup is not a flight permit\./i,
      ),
    ).toBeTruthy();
    expect(
      screen.getAllByText(/Hành Lang An Toàn Hàng Không & Cầu Trọng Điểm Sông Sài Gòn/i).length,
    ).toBeGreaterThan(0);

    const portalLink = screen.getByRole('link', { name: /cambay\.mod\.gov\.vn/i });
    expect(portalLink.getAttribute('href')).toBe('https://cambay.mod.gov.vn');
  });

  it('invokes onSelectCoordinates when interactive map picker is clicked', () => {
    const onSelect = vi.fn();
    render(
      <AirspaceNoFlyMap
        assetName="New Asset"
        latitude={10.7789}
        longitude={106.7082}
        onSelectCoordinates={onSelect}
      />,
    );

    const mapSurface = screen.getByTestId('airspace-map-surface');
    fireEvent.click(mapSurface, { clientX: 250, clientY: 160 });
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('distinguishes Asset Target Pin from Pilot GPS location and evaluates take-off point airspace', () => {
    const getCurrentPositionMock = vi.fn((success: PositionCallback) => {
      success({
        coords: {
          latitude: 10.7769,
          longitude: 106.6953,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
          toJSON: () => ({}),
        },
        timestamp: Date.now(),
        toJSON: () => ({}),
      });
    });

    Object.defineProperty(globalThis.navigator, 'geolocation', {
      value: { getCurrentPosition: getCurrentPositionMock },
      configurable: true,
    });

    render(
      <AirspaceNoFlyMap
        assetName="Cầu Thủ Thiêm 2 (Cầu Ba Son)"
        latitude={10.7789}
        longitude={106.7082}
      />,
    );

    expect(screen.getAllByText(/Mục tiêu công trình cần kiểm tra/i).length).toBeGreaterThan(0);

    const myGpsButton = screen.getByRole('button', { name: /Vị trí của tôi \(GPS\)/i });
    fireEvent.click(myGpsButton);

    expect(getCurrentPositionMock).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText(/Vị trí người điều khiển \/ Điểm cất cánh/i).length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText(/Cảnh báo điểm đứng cất cánh/i)).toBeTruthy();
  });

  it('supports dragging with mouse to pan the map without triggering coordinate click selection', () => {
    const onSelect = vi.fn();
    render(
      <AirspaceNoFlyMap
        assetName="Draggable Map"
        latitude={10.7789}
        longitude={106.7082}
        onSelectCoordinates={onSelect}
      />,
    );

    const mapSurface = screen.getByTestId('airspace-map-surface');
    fireEvent.mouseDown(mapSurface, { clientX: 300, clientY: 200, button: 0 });
    fireEvent.mouseMove(mapSurface, { clientX: 180, clientY: 120 });
    fireEvent.mouseUp(mapSurface, { clientX: 180, clientY: 120 });
    fireEvent.click(mapSurface, { clientX: 180, clientY: 120 });

    // Because the mouse moved > 4px during drag, onSelectCoordinates should NOT be called
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('automatically places simulated take-off point outside NO_FLY_ZONE and evaluates take-off point airspace', () => {
    render(
      <AirspaceNoFlyMap
        assetName="Cầu Thủ Thiêm 2 (Cầu Ba Son)"
        latitude={10.7805}
        longitude={106.7108}
      />,
    );

    const simulateBtn = screen.getByRole('button', { name: /Giả lập điểm đứng cất cánh/i });
    fireEvent.click(simulateBtn);

    // Should NOT be in Vùng Cấm Bay Tuyệt Đối; should report an eligible take-off point outside No-Fly Zone
    expect(screen.getByText(/Điểm đứng cất cánh hợp lệ \(Ngoài vùng cấm bay đỏ\)/i)).toBeTruthy();
  });

  it('allows clicking multiple points freely in target adjustment mode and saves only when clicking Xác nhận mục tiêu', () => {
    render(
      <AirspaceNoFlyMap
        assetName="Cầu Thủ Thiêm 2 (Cầu Ba Son)"
        latitude={10.7805}
        longitude={106.7108}
      />,
    );

    const adjustBtn = screen.getByRole('button', { name: /Điều chỉnh mục tiêu/i });
    fireEvent.click(adjustBtn);

    const mapSurface = screen.getByTestId('airspace-map-surface');
    // User can click multiple times at different positions without exiting adjustment mode
    fireEvent.click(mapSurface, { clientX: 220, clientY: 160 });
    fireEvent.click(mapSurface, { clientX: 440, clientY: 130 });

    const confirmBtn = screen.getByRole('button', { name: /Xác nhận mục tiêu/i });
    fireEvent.click(confirmBtn);

    expect(screen.getByText(/Đã điều chỉnh điểm mục tiêu/i)).toBeTruthy();

    // Unmount and remount to simulate browser reload (F5): confirmed target must persist
    cleanup();
    render(
      <AirspaceNoFlyMap
        assetName="Cầu Thủ Thiêm 2 (Cầu Ba Son)"
        latitude={10.7805}
        longitude={106.7108}
      />,
    );
    expect(screen.getByText(/Đã điều chỉnh điểm mục tiêu/i)).toBeTruthy();

    const resetBtn = screen.getByRole('button', { name: /Khôi phục vị trí gốc/i });
    fireEvent.click(resetBtn);

    expect(screen.queryByText(/Đã điều chỉnh điểm mục tiêu/i)).toBeNull();
  });

  it('calculates polygon perimeter and area correctly using geodesic metrics', () => {
    const triangle = [
      { lat: 10.7805, lon: 106.7108 },
      { lat: 10.7825, lon: 106.7108 },
      { lat: 10.7825, lon: 106.7138 },
    ];
    const metrics = calculatePolygonPerimeterAndArea(triangle);
    expect(metrics.pointCount).toBe(3);
    expect(metrics.perimeterMeters).toBeGreaterThan(500);
    expect(metrics.areaSquareMeters).toBeGreaterThan(10000);
    expect(metrics.areaHectares).toBeGreaterThan(1);

    expect(calculatePolygonPerimeterAndArea([]).perimeterMeters).toBe(0);
    expect(calculatePolygonPerimeterAndArea([{ lat: 10, lon: 10 }]).areaSquareMeters).toBe(0);
  });

  it('searches popular Vietnam landmarks and matches infrastructure locations', () => {
    const baSon = searchVietnamLandmarks('Ba Son');
    expect(baSon.length).toBeGreaterThan(0);
    expect(baSon[0]?.name).toContain('Cầu Ba Son');
    expect(baSon[0]?.latitude).toBe(10.7805);

    const phuMy = searchVietnamLandmarks('Phú Mỹ');
    expect(phuMy.length).toBeGreaterThan(0);
    expect(phuMy[0]?.name).toContain('Cầu Phú Mỹ');

    expect(searchVietnamLandmarks('khongtonlocationxyz').length).toBe(0);
  });

  it('searches address on map, flies to location, and updates coordinates', () => {
    const onSelect = vi.fn();
    render(
      <AirspaceNoFlyMap
        assetName="New Asset"
        latitude={10.7805}
        longitude={106.7108}
        onSelectCoordinates={onSelect}
      />,
    );

    const searchInput = screen.getByPlaceholderText(/Tìm kiếm công trình, địa chỉ/i);
    fireEvent.change(searchInput, { target: { value: 'Cầu Phú Mỹ' } });

    // Click on the autocomplete suggestion
    const suggestions = screen.getAllByText('Cầu Phú Mỹ');
    fireEvent.click(suggestions[0]!);

    expect(onSelect).toHaveBeenCalledWith(10.7492, 106.7456, 'Cầu Phú Mỹ');
    expect(screen.getByText(/Đã chọn: Cầu Phú Mỹ/i)).toBeTruthy();
  });

  it('renders clean search bar and updates coordinates on landmark selection without extra chips', () => {
    const onSelect = vi.fn();
    render(
      <AirspaceNoFlyMap
        assetName="Clean Map"
        latitude={10.7805}
        longitude={106.7108}
        onSelectCoordinates={onSelect}
      />,
    );

    // Verify search input is present and ready
    const searchInput = screen.getByPlaceholderText(/Tìm kiếm công trình, địa chỉ/i);
    expect(searchInput).toBeTruthy();

    // Verify no quick chips next to search bar
    expect(screen.queryByRole('button', { name: /Khoanh vùng \(Polygon\)/i })).toBeNull();
  });

  it('formats JSON location strings into clean human-readable text', () => {
    expect(
      formatLocation('{"label": "Hẻm 40 Đường Hàng Tre", "latitude": 10.847804, "longitude": 106.812573}'),
    ).toBe('Hẻm 40 Đường Hàng Tre');

    expect(
      formatLocation('{"address": "Quận 1 - TP. Thủ Đức, TP.HCM", "latitude": 10.7805, "longitude": 106.7108}'),
    ).toBe('Quận 1 - TP. Thủ Đức, TP.HCM');

    expect(formatLocation('{"latitude": 10.7805, "longitude": 106.7108}')).toBe('10.7805, 106.7108');

    expect(formatLocation('Plain location text')).toBe('Plain location text');
    expect(formatLocation(null)).toBe('—');
    expect(formatLocation('')).toBe('—');
  });
});
