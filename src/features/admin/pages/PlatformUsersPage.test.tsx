import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  resetPassword: vi.fn(),
  updateRoles: vi.fn(),
  updateStatus: vi.fn(),
}));

vi.mock('../api/platformUserApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/platformUserApi')>();
  return {
    ...actual,
    platformUserApi: {
      ...actual.platformUserApi,
      list: mocks.list,
      create: mocks.create,
      resetPassword: mocks.resetPassword,
      updateRoles: mocks.updateRoles,
      updateStatus: mocks.updateStatus,
    },
  };
});

import PlatformUsersPage from './PlatformUsersPage';

const PLATFORM_ADMIN = {
  id: 'admin-1',
  email: 'platform.admin@example.test',
  fullName: 'Platform Admin',
  roles: ['ADMIN'],
  actorZone: 'PLATFORM',
  organizationId: null,
};

const ORG_MANAGER = {
  id: 'org-manager-1',
  email: 'org.manager@example.test',
  fullName: 'Organization Manager',
  roles: ['ORG_MANAGER'],
  actorZone: 'CUSTOMER_ORGANIZATION',
  organizationId: 'org-1',
};

function renderWithClient() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <PlatformUsersPage />
    </QueryClientProvider>,
  );
}

describe('PlatformUsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockResolvedValue([PLATFORM_ADMIN, ORG_MANAGER]);
    mocks.create.mockResolvedValue({
      user: { ...PLATFORM_ADMIN, id: 'new-1', email: 'new.admin@example.test' },
      temporaryPassword: 'Temp-Password-123',
    });
    mocks.resetPassword.mockResolvedValue({
      user: ORG_MANAGER,
      temporaryPassword: 'Reset-Password-456',
    });
    mocks.updateStatus.mockResolvedValue(ORG_MANAGER);
  });

  afterEach(() => {
    cleanup();
  });

  it('lists the administrator-managed accounts with their zone and roles', async () => {
    renderWithClient();

    expect(await screen.findByText('platform.admin@example.test')).toBeTruthy();
    expect(screen.getByText('org.manager@example.test')).toBeTruthy();
    expect(screen.getByText('Customer organization')).toBeTruthy();
    expect(screen.getAllByText('ADMIN').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ORG_MANAGER').length).toBeGreaterThan(0);
  });

  it('shows the one-time temporary password after creating an account', async () => {
    renderWithClient();

    fireEvent.click(await screen.findByRole('button', { name: 'New account' }));
    fireEvent.change(await screen.findByLabelText(/Email address/), {
      target: { value: 'new.admin@example.test' },
    });
    fireEvent.change(screen.getByLabelText(/Full name/), {
      target: { value: 'New Admin' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Temporary password issued')).toBeTruthy();
    expect(screen.getByText('Temp-Password-123')).toBeTruthy();
  });

  it('allows selecting Platform manager role when creating a platform account', async () => {
    renderWithClient();

    fireEvent.click(await screen.findByRole('button', { name: 'New account' }));
    fireEvent.change(await screen.findByLabelText(/Email address/), {
      target: { value: 'pm@example.test' },
    });
    fireEvent.change(screen.getByLabelText(/Full name/), {
      target: { value: 'Platform Manager User' },
    });
    fireEvent.mouseDown(screen.getByLabelText(/Role/));
    fireEvent.click(await screen.findByRole('option', { name: 'Platform manager' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith({
        email: 'pm@example.test',
        fullName: 'Platform Manager User',
        actorZone: 'PLATFORM',
        organizationId: null,
        roles: ['PLATFORM_MANAGER'],
      }),
    );
  });

  it('resets the password of another account', async () => {
    renderWithClient();

    const resetButtons = await screen.findAllByRole('button', { name: 'Reset password' });
    const first = resetButtons[0];
    if (!first) throw new Error('expected a reset button');
    fireEvent.click(first);

    await waitFor(() => expect(mocks.resetPassword).toHaveBeenCalled());
  });

  it('suspends an account through the named status change', async () => {
    renderWithClient();

    const suspendButtons = await screen.findAllByRole('button', { name: 'Suspend' });
    const first = suspendButtons[0];
    if (!first) throw new Error('expected a suspend button');
    fireEvent.click(first);

    await waitFor(() =>
      expect(mocks.updateStatus).toHaveBeenCalledWith(expect.any(String), {
        status: 'SUSPENDED',
      }),
    );
    const [calledUserId] = mocks.updateStatus.mock.calls[0] as [string];
    expect([PLATFORM_ADMIN.id, ORG_MANAGER.id]).toContain(calledUserId);
  });
});
