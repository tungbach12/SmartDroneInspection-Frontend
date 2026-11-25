import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Role } from '@/features/auth/store/authStore';
import { useAuthStore } from '@/features/auth/store/authStore';
import { theme } from '@/app/theme/theme';
import DashboardPage from './DashboardPage';

const mocks = vi.hoisted(() => ({
  useAssets: vi.fn(),
  useDashboardAnalytics: vi.fn(),
  useInspections: vi.fn(),
}));
vi.mock('@/features/assets/hooks/useAssets', () => ({
  useAssets: (...args: unknown[]) => mocks.useAssets(...args),
}));
vi.mock('../hooks/useDashboardAnalytics', () => ({
  useDashboardAnalytics: (...args: unknown[]) => mocks.useDashboardAnalytics(...args),
}));
vi.mock('@/features/inspections/hooks/useInspections', () => ({
  useInspections: (...args: unknown[]) => mocks.useInspections(...args),
}));

const assetRows = [
  { id: 'asset-1', code: 'BR-014', name: 'North Bridge', locationText: 'River district', status: 'ACTIVE' },
  { id: 'asset-2', code: 'BL-032', name: 'Harbor building', locationText: 'Pier 4', status: 'PENDING_REVIEW' },
] as const;

function renderDashboard(roles: Role[], path = '/client/dashboard') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  useAuthStore.setState({ roles, userName: 'Alex Rivera' });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={[path]}>
          <DashboardPage />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('dashboard', () => {
  afterEach(cleanup);
  beforeEach(() => {
    mocks.useAssets.mockReset().mockReturnValue({
      data: { items: assetRows, totalCount: 12 },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mocks.useDashboardAnalytics.mockReset().mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mocks.useInspections.mockReset().mockReturnValue({
      data: { items: [], totalCount: 0, totalPages: 0 },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('shows organization-scoped asset metrics, defect health donut, and asset register for Customer', () => {
    renderDashboard(['CUSTOMER']);
    expect(screen.getByRole('heading', { name: 'Asset overview' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Mức độ khuyết tật công trình|Asset Defect Health/i })).toBeTruthy();
    expect(screen.getByRole('group', { name: /registered assets: 12/i })).toBeTruthy();
    expect(screen.getByText('North Bridge')).toBeTruthy();
    expect(document.querySelector('a[href="/client/assets"]')).toBeTruthy();
    expect(document.querySelector('a[href="/admin/asset-catalog"]')).toBeNull();
    expect(mocks.useAssets).toHaveBeenCalledWith({ page: 1, pageSize: 50 }, true);
  });

  it('shows upcoming missions card and revenue dashboard for Inspector', () => {
    renderDashboard(['INSPECTOR'], '/operations/dashboard');
    expect(screen.getByRole('heading', { name: 'Inspector Dashboard' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Nhiệm vụ sắp tới|Upcoming Missions/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /All Inspections/i })).toBeTruthy();
    expect(mocks.useAssets).not.toHaveBeenCalled();
  });

  it('shows dedicated AI, MF1 review queue, and Audit dashboard for ADMIN', () => {
    renderDashboard(['ADMIN'], '/admin/dashboard');
    expect(screen.getByRole('heading', { name: 'Platform overview' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Hàng đợi thẩm định MF1|Pending MF1 Reviews/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Hoạt động gần đây|Recent Activities/i })).toBeTruthy();
    expect(document.querySelector('a[href="/admin/onboarding-reviews"]')).toBeTruthy();
    expect(document.querySelector('a[href="/admin/audit-logs"]')).toBeTruthy();
    expect(document.querySelector('a[href="/client/assets"]')).toBeNull();
    expect(mocks.useAssets).toHaveBeenCalledWith({ page: 1, pageSize: 50 }, false);
    expect(mocks.useDashboardAnalytics).toHaveBeenCalledWith('ADMIN');
  });

  it('shows dedicated commercial funnel, action queue, and schedule dashboard for MANAGER', () => {
    renderDashboard(['MANAGER'], '/manager/dashboard');
    expect(screen.getByRole('heading', { name: /Điều phối & Thương mại|Operations & Commercial Overview/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Phễu tiến độ dịch vụ|Service Pipeline/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Việc cần xử lý ngay|Action Queue/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Lịch bay sắp tới|Upcoming Flight Schedule/i })).toBeTruthy();
    expect(document.querySelector('a[href="/manager/contracts"]')).toBeTruthy();
    expect(mocks.useAssets).toHaveBeenCalledWith({ page: 1, pageSize: 50 }, false);
    expect(mocks.useDashboardAnalytics).toHaveBeenCalledWith('MANAGER');
  });

  it('keeps cross-portal roles in their selected client workspace', () => {
    renderDashboard(['CUSTOMER', 'INSPECTOR'], '/client/dashboard');
    expect(screen.getByRole('heading', { name: 'Asset overview' })).toBeTruthy();
    expect(document.querySelector('a[href="/client/assets"]')).toBeTruthy();
    expect(document.querySelector('a[href="/operations/inspections"]')).toBeNull();
  });
});
