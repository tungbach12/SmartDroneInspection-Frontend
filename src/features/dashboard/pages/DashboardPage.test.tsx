import { ThemeProvider } from '@mui/material/styles';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Role } from '@/features/auth/store/authStore';
import { useAuthStore } from '@/features/auth/store/authStore';
import { theme } from '@/app/theme/theme';
import DashboardPage from './DashboardPage';

const mocks = vi.hoisted(() => ({ useAssets: vi.fn() }));
vi.mock('@/features/assets/hooks/useAssets', () => ({
  useAssets: (...args: unknown[]) => mocks.useAssets(...args),
}));

const assetRows = [
  { id: 'asset-1', code: 'BR-014', name: 'North Bridge', locationText: 'River district', status: 'ACTIVE' },
  { id: 'asset-2', code: 'BL-032', name: 'Harbor building', locationText: 'Pier 4', status: 'PENDING_REVIEW' },
] as const;

function renderDashboard(roles: Role[], path = '/client/dashboard') {
  useAuthStore.setState({ roles, userName: 'Alex Rivera' });
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[path]}><DashboardPage /></MemoryRouter>
    </ThemeProvider>,
  );
}

describe('dashboard', () => {
  afterEach(cleanup);
  beforeEach(() => {
    mocks.useAssets.mockReset().mockReturnValue({ data: { items: assetRows, totalCount: 12 }, isLoading: false, error: null, refetch: vi.fn() });
  });

  it('shows organization-scoped asset metrics and the asset register', () => {
    renderDashboard(['ORG_ADMIN']);
    expect(screen.getByRole('heading', { name: 'Asset overview' })).toBeTruthy();
    expect(screen.getByRole('group', { name: /registered assets: 12/i })).toBeTruthy();
    expect(screen.getByText('North Bridge')).toBeTruthy();
    expect(document.querySelector('a[href="/client/assets"]')).toBeTruthy();
    expect(document.querySelector('a[href="/admin/asset-catalog"]')).toBeNull();
    expect(mocks.useAssets).toHaveBeenCalledWith({ page: 1, pageSize: 50 }, true);
  });

  it('shows inspection-specific shortcuts without requesting out-of-scope asset data', () => {
    renderDashboard(['INSPECTOR'], '/operations/dashboard');
    expect(screen.getByRole('heading', { name: 'Inspection workload' })).toBeTruthy();
    expect(document.querySelector('a[href="/operations/inspections"]')).toBeTruthy();
    expect(document.querySelector('a[href="/operations/maintenance"]')).toBeNull();
    expect(mocks.useAssets).toHaveBeenCalledWith({ page: 1, pageSize: 50 }, false);
  });

  it('shows only maintenance shortcuts for maintenance engineers', () => {
    renderDashboard(['MAINTENANCE_ENGINEER'], '/operations/dashboard');
    expect(screen.getByRole('heading', { name: 'Maintenance workload' })).toBeTruthy();
    expect(screen.getByText('Assigned repair work')).toBeTruthy();
    expect(document.querySelector('a[href="/operations/maintenance"]')).toBeTruthy();
    expect(document.querySelector('a[href="/operations/inspections"]')).toBeNull();
    expect(mocks.useAssets).toHaveBeenCalledWith({ page: 1, pageSize: 50 }, false);
  });

  it('shows shared Lytic-style metrics with platform-only shortcuts for administrators', () => {
    renderDashboard(['ADMIN'], '/admin/dashboard');
    expect(screen.getByRole('heading', { name: 'Platform overview' })).toBeTruthy();
    expect(screen.getByRole('group', { name: /organizations: —/i })).toBeTruthy();
    expect(document.querySelector('a[href="/admin/asset-catalog"]')).toBeTruthy();
    expect(document.querySelector('a[href="/client/assets"]')).toBeNull();
    expect(mocks.useAssets).toHaveBeenCalledWith({ page: 1, pageSize: 50 }, false);
  });

  it('keeps cross-portal roles in their selected client workspace', () => {
    renderDashboard(['ORG_ADMIN', 'INSPECTOR'], '/client/dashboard');
    expect(screen.getByRole('heading', { name: 'Asset overview' })).toBeTruthy();
    expect(document.querySelector('a[href="/client/assets"]')).toBeTruthy();
    expect(document.querySelector('a[href="/operations/inspections"]')).toBeNull();
  });

  it('combines both operations workspaces only within the operations portal', () => {
    renderDashboard(['INSPECTOR', 'MAINTENANCE_ENGINEER'], '/operations/dashboard');
    expect(document.querySelector('a[href="/operations/inspections"]')).toBeTruthy();
    expect(document.querySelector('a[href="/operations/maintenance"]')).toBeTruthy();
    expect(mocks.useAssets).toHaveBeenCalledWith({ page: 1, pageSize: 50 }, false);
  });
});
