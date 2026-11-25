import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
};

const MANAGER_USER = {
  id: 'manager-1',
  email: 'manager@example.test',
  fullName: 'Manager User',
  roles: ['MANAGER'],
};

const CUSTOMER = {
  id: 'customer-1',
  email: 'customer@example.test',
  fullName: 'Customer User',
  roles: ['CUSTOMER'],
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
    mocks.list.mockResolvedValue([PLATFORM_ADMIN, MANAGER_USER, CUSTOMER]);
    mocks.create.mockResolvedValue({
      user: { ...PLATFORM_ADMIN, id: 'new-1', email: 'new.admin@example.test' },
      temporaryPassword: 'Temp-Password-123',
    });
    mocks.resetPassword.mockResolvedValue({
      user: CUSTOMER,
      temporaryPassword: 'Reset-Password-456',
    });
    mocks.updateStatus.mockResolvedValue(CUSTOMER);
  });

  afterEach(() => {
    cleanup();
  });

  it('lists the administrator-managed accounts with their roles in a clean table', async () => {
    renderWithClient();

    expect(await screen.findByText('platform.admin@example.test')).toBeTruthy();
    expect(screen.getByText('customer@example.test')).toBeTruthy();
    expect(screen.getAllByText('ADMIN').length).toBeGreaterThan(0);
    expect(screen.getAllByText('CUSTOMER').length).toBeGreaterThan(0);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('filters accounts by role and search query', async () => {
    renderWithClient();
    await screen.findByText('platform.admin@example.test');

    fireEvent.change(screen.getByLabelText('Search accounts'), {
      target: { value: 'customer@example' },
    });
    expect(screen.getByText('customer@example.test')).toBeTruthy();
    expect(screen.queryByText('platform.admin@example.test')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Role' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Admin' }));
    expect(screen.getByText('platform.admin@example.test')).toBeTruthy();
    expect(screen.queryByText('customer@example.test')).toBeNull();
  });

  it('opens a centered account dialog with the account and security tab', async () => {
    renderWithClient();

    fireEvent.click(await screen.findByText('Platform Admin'));

    expect(await screen.findByRole('tab', { name: 'Account & Security' })).toBeTruthy();
    expect(screen.getByText('Admin')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reset password' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Suspend' })).toBeTruthy();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeTruthy();
  });

  it('protects the last active administrator from suspension', async () => {
    renderWithClient();

    fireEvent.click(await screen.findByText('Platform Admin'));
    await screen.findByRole('tab', { name: 'Account & Security' });

    expect(
      screen.getByText(
        /last active administrator/i,
      ),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Suspend' }).hasAttribute('disabled')).toBe(true);
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

  it('allows selecting Manager role when creating an account', async () => {
    renderWithClient();

    fireEvent.click(await screen.findByRole('button', { name: 'New account' }));
    const createDialog = await screen.findByRole('dialog');
    fireEvent.change(within(createDialog).getByLabelText(/Email address/), {
      target: { value: 'pm@example.test' },
    });
    fireEvent.change(within(createDialog).getByLabelText(/Full name/), {
      target: { value: 'Manager Account' },
    });
    fireEvent.mouseDown(within(createDialog).getByLabelText(/^Role$/));
    fireEvent.click(await screen.findByRole('option', { name: 'Manager' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith({
        email: 'pm@example.test',
        fullName: 'Manager Account',
        roles: ['MANAGER'],
      }),
    );
  });

  it('resets the password of another account from the account dialog', async () => {
    renderWithClient();

    fireEvent.click(await screen.findByText('Customer User'));
    await screen.findByRole('tab', { name: 'Account & Security' });
    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));

    const dialogs = await screen.findAllByRole('dialog');
    const confirmDialog = dialogs.at(-1);
    const confirmBtn = Array.from(confirmDialog?.querySelectorAll('button') ?? []).find((b) =>
      b.textContent?.includes('Reset password'),
    );
    if (!confirmBtn) throw new Error('expected confirm reset button');
    fireEvent.click(confirmBtn);

    await waitFor(() => expect(mocks.resetPassword).toHaveBeenCalled());
    expect(await screen.findByText('Reset-Password-456')).toBeTruthy();
  });

  it('suspends an account through the named status change', async () => {
    renderWithClient();

    fireEvent.click(await screen.findByText('Customer User'));
    await screen.findByRole('tab', { name: 'Account & Security' });
    fireEvent.click(screen.getByRole('button', { name: 'Suspend' }));

    const dialogs = await screen.findAllByRole('dialog');
    const confirmDialog = dialogs.at(-1);
    const confirmBtn = Array.from(confirmDialog?.querySelectorAll('button') ?? []).find((b) =>
      b.textContent?.includes('Suspend'),
    );
    if (!confirmBtn) throw new Error('expected confirm suspend button');
    fireEvent.click(confirmBtn);

    await waitFor(() =>
      expect(mocks.updateStatus).toHaveBeenCalledWith(expect.any(String), {
        status: 'SUSPENDED',
      }),
    );
  });

  it('paginates accounts across pages when more than ten exist', async () => {
    const manyUsers = Array.from({ length: 12 }, (_, index) => ({
      id: `user-${index + 1}`,
      email: `user${index + 1}@example.test`,
      fullName: `Account ${String(index + 1).padStart(2, '0')}`,
      roles: ['CUSTOMER'],
    }));
    mocks.list.mockResolvedValue(manyUsers);

    renderWithClient();

    expect(await screen.findByText('Showing 1–10 of 12')).toBeTruthy();
    expect(screen.getByText('user1@example.test')).toBeTruthy();
    expect(screen.queryByText('user11@example.test')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Go to page 2' }));

    expect(screen.getByText('Showing 11–12 of 12')).toBeTruthy();
    expect(screen.getByText('user11@example.test')).toBeTruthy();
    expect(screen.queryByText('user1@example.test')).toBeNull();
  });
});
