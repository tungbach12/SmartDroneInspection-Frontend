import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { theme } from '@/app/theme/theme';
import InspectorRegisterPage from './InspectorRegisterPage';
import { extractCccdImageText } from '../utils/cccdOcr';

const originalCreateObjectUrl = URL.createObjectURL;
const originalRevokeObjectUrl = URL.revokeObjectURL;

vi.mock('../utils/cccdOcr', async () => {
  const actual = await vi.importActual<typeof import('../utils/cccdOcr')>('../utils/cccdOcr');
  return {
    ...actual,
    extractCccdImageText: vi.fn(),
  };
});

vi.mock('../api/pilotLicenseClassApi', () => ({
  pilotLicenseClassApi: {
    listActive: vi.fn().mockResolvedValue([
      { id: 'class-b', name: 'CLASS_B', description: 'Class B', active: true },
    ]),
  },
}));

vi.mock('@/features/auth/store/authStore', () => ({
  useAuthStore: (selector: (state: { status: string; roles: string[] }) => unknown) =>
    selector({ status: 'unauthenticated', roles: [] }),
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <InspectorRegisterPage />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('InspectorRegisterPage CCCD front and back scan auto-fill', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn().mockReturnValue('blob:cccd-preview');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    URL.createObjectURL = originalCreateObjectUrl;
    URL.revokeObjectURL = originalRevokeObjectUrl;
  });

  it('auto-fills citizenId from front CCCD scan and permanent address from back CCCD scan', async () => {
    vi.mocked(extractCccdImageText)
      .mockResolvedValueOnce(
        'CĂN CƯỚC\nSố định danh cá nhân: 079204012345\nHọ và tên: LÊ MINH PHI CÔNG',
      )
      .mockResolvedValueOnce(
        'Nơi cư trú / Place of residence: Khu Công Nghệ Cao\nTP. Thủ Đức, TP. Hồ Chí Minh\nIDVNM040123450079204012345<<1',
      );

    renderPage();

    fireEvent.change(screen.getByLabelText(/Họ và tên đầy đủ/i), {
      target: { value: 'Lê Minh Phi Công' },
    });
    fireEvent.change(screen.getByLabelText(/Email đăng ký/i), {
      target: { value: 'pilot@sdi.vn' },
    });
    fireEvent.change(screen.getByLabelText(/^Mật khẩu \*/i), {
      target: { value: 'StrongPass1!' },
    });
    fireEvent.change(screen.getByLabelText(/Xác nhận mật khẩu/i), {
      target: { value: 'StrongPass1!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục/i }));

    expect(await screen.findByText(/Quét ảnh CCCD tự động điền/i)).toBeTruthy();

    const frontInput = document.getElementById('cccd-front-scan-input') as HTMLInputElement;
    const frontFile = new File(['front-img'], 'cccd-front.jpg', { type: 'image/jpeg' });
    fireEvent.change(frontInput, { target: { files: [frontFile] } });

    await waitFor(() => {
      expect((screen.getByLabelText(/Số CCCD \/ Hộ chiếu/i) as HTMLInputElement).value).toBe(
        '079204012345',
      );
    });

    const backInput = document.getElementById('cccd-back-scan-input') as HTMLInputElement;
    const backFile = new File(['back-img'], 'cccd-back.jpg', { type: 'image/jpeg' });
    fireEvent.change(backInput, { target: { files: [backFile] } });

    await waitFor(() => {
      expect(
        (screen.getByLabelText(/Địa chỉ thường trú \/ Khu vực hoạt động/i) as HTMLInputElement)
          .value,
      ).toBe('Khu Công Nghệ Cao, TP. Thủ Đức, TP. Hồ Chí Minh');
    });
  });
});
