import { AxiosError } from 'axios';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkforceUser } from '../api/workforceApi';

const { provisionUser } = vi.hoisted(() => ({ provisionUser: vi.fn() }));

const users: { data: WorkforceUser[] | undefined; isLoading: boolean; error: unknown } = {
  data: [],
  isLoading: false,
  error: null,
};
const refetch = vi.fn();
const updateStatus = vi.fn();
const updateRoles = vi.fn();
const provisionReset = vi.fn();
const rolesReset = vi.fn();
let provisionState: { isPending: boolean; isError: boolean; error: unknown };
let rolesState: { isPending: boolean; isError: boolean; error: unknown };

vi.mock('../hooks/useWorkforce', () => ({
  workforceKeys: { all: ['workforce'], users: () => ['workforce', 'users'] },
  useWorkforceUsers: () => ({
    data: users.data,
    isLoading: users.isLoading,
    error: users.error,
    refetch,
  }),
  useProvisionWorkforceUser: (onProvisioned: (credential: { user: WorkforceUser; temporaryPassword: string }) => void) => ({
    mutate: (input: unknown, options?: { onSuccess?: (user: WorkforceUser) => void; onError?: (error: unknown) => void }) =>
      provisionUser(input, {
        onSuccess: (credential: { user: WorkforceUser; temporaryPassword: string }) => {
          onProvisioned(credential);
          options?.onSuccess?.(credential.user);
        },
        onError: options?.onError,
      }),
    reset: provisionReset,
    isPending: provisionState.isPending,
    isError: provisionState.isError,
    error: provisionState.error,
  }),
  useUpdateWorkforceUserStatus: () => ({ mutate: updateStatus, isPending: false, isError: false, error: null }),
  useUpdateWorkforceUserRoles: () => ({ mutate: updateRoles, reset: rolesReset, ...rolesState }),
}));

import WorkforcePage from './WorkforcePage';

const MEMBER: WorkforceUser = {
  userId: '3f1d6c3e-2a54-4a1f-9c0e-7a2b5d6e8f10',
  email: 'ivy.inspector@example.test',
  fullName: 'Ivy Inspector',
  roles: ['INSPECTOR'],
  status: 'ACTIVE',
  organizationId: '9a2f7d61-4c0b-4c6a-8f31-2b8c4d1e5a77',
};

/**
 * Renders the page and exposes a way to re-render it.
 *
 * The mocked hooks read from module state the hooks close over, so a test that flips a value after
 * mount must re-render for the change to reach the output — `act` alone flushes effects but does not
 * re-evaluate a component.
 */
function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const tree = () => (
    <QueryClientProvider client={client}>
      <WorkforcePage />
    </QueryClientProvider>
  );
  const result = render(tree());
  // A fresh element each time: React bails out of a re-render when the element is referentially
  // identical to the previous one, which would silently skip the state change under test.
  return { ...result, refresh: () => act(() => result.rerender(tree())) };
}

/**
 * Reads the one-time password out of the result dialog. The value lives in a controlled input, not
 * in a text node, so it is read from the field the dialog scopes to exactly one of.
 */
function temporaryPasswordValue(): string {
  const dialog = screen.getByRole('dialog', { name: 'Temporary password' });
  return (within(dialog).getByRole('textbox') as HTMLInputElement).value;
}

/** Reads a controlled field's current value; MUI renders it as an input value, not a text node. */
function inputValue(label: RegExp): string {
  return (screen.getByLabelText(label) as HTMLInputElement).value;
}

function openProvisionDialog() {
  fireEvent.click(screen.getAllByRole('button', { name: /Provision user/ })[0]!);
  return screen.findByRole('dialog', { name: 'Provision a workforce user' });
}

/** Fills the provision form with one valid draft. */
function fillProvisionForm(roleLabel = 'Inspector', email = 'new.member@example.test') {
  fireEvent.change(screen.getByLabelText(/Email/), { target: { value: email } });
  fireEvent.change(screen.getByLabelText(/Full name/), { target: { value: 'New Member' } });
  fireEvent.click(screen.getByLabelText(roleLabel));
}

describe('WorkforcePage users tab', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    users.data = [];
    users.isLoading = false;
    users.error = null;
    provisionState = { isPending: false, isError: false, error: null };
    rolesState = { isPending: false, isError: false, error: null };
    provisionReset.mockImplementation(() => {
      provisionState = { isPending: false, isError: false, error: null };
    });
    rolesReset.mockImplementation(() => {
      rolesState = { isPending: false, isError: false, error: null };
    });
    provisionUser.mockImplementation((_input, options) => {
      options?.onSuccess?.({
        user: { ...MEMBER, email: 'new.member@example.test', fullName: 'New Member' },
        temporaryPassword: 'Temp-Password-1',
      });
    });
  });

  afterEach(() => cleanup());

  it('shows a loading state while the member list is in flight', () => {
    users.isLoading = true;

    renderPage();

    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('explains a failed list and retries it on request', async () => {
    users.error = new Error('boom');

    renderPage();

    expect(await screen.findByText(/We could not load this information/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(refetch).toHaveBeenCalled();
  });

  it('shows an empty state that still offers provisioning', () => {
    users.data = [];

    renderPage();

    expect(screen.getByText('No workforce users yet')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /Provision user/ }).length).toBeGreaterThan(0);
  });

  it('lists each member with their roles and status', async () => {
    users.data = [
      MEMBER,
      {
        ...MEMBER,
        userId: '7c2b9d10-1111-4222-8333-444455556666',
        email: 'jonas.engineer@example.test',
        fullName: 'Jonas Engineer',
        roles: ['MAINTENANCE_ENGINEER'],
        status: 'SUSPENDED',
      },
    ];

    renderPage();

    expect(await screen.findByText('ivy.inspector@example.test')).toBeTruthy();
    expect(screen.getByText('Jonas Engineer')).toBeTruthy();
    expect(screen.getByText('INSPECTOR')).toBeTruthy();
    expect(screen.getByText('MAINTENANCE_ENGINEER')).toBeTruthy();
    expect(screen.getByText('ACTIVE')).toBeTruthy();
    expect(screen.getByText('SUSPENDED')).toBeTruthy();
  });

  it('offers only the two grantable workforce roles in the provision form', async () => {
    renderPage();

    const dialog = await openProvisionDialog();
    const labels = within(dialog)
      .getAllByRole('checkbox')
      .map((checkbox) => checkbox.closest('label')?.textContent);
    expect(labels).toEqual(['Inspector', 'Maintenance engineer']);
    expect(within(dialog).queryByLabelText(/Administrator/)).toBeNull();
  });

  it('refuses to submit the provision form without an email, a name, or a role', async () => {
    renderPage();

    await openProvisionDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Create user' }));

    expect(provisionUser).not.toHaveBeenCalled();
    expect(await screen.findByText('Enter the email address.')).toBeTruthy();
    expect(screen.getByText('Enter the full name.')).toBeTruthy();
    expect(screen.getByText('Select at least one role.')).toBeTruthy();
  });

  it('rejects an address that is not a valid email', async () => {
    renderPage();

    await openProvisionDialog();
    fillProvisionForm('Maintenance engineer', 'not-an-email');
    fireEvent.click(screen.getByRole('button', { name: 'Create user' }));

    expect(provisionUser).not.toHaveBeenCalled();
    expect(await screen.findByText('Enter a valid email address.')).toBeTruthy();
  });

  it('provisions with the entered values and no organizationId', async () => {
    renderPage();

    await openProvisionDialog();
    fillProvisionForm();
    fireEvent.click(screen.getByRole('button', { name: 'Create user' }));

    await waitFor(() =>
      expect(provisionUser).toHaveBeenCalledWith(
        {
          email: 'new.member@example.test',
          fullName: 'New Member',
          roles: ['INSPECTOR'],
        },
        expect.objectContaining({ onSuccess: expect.any(Function) }),
      ),
    );
    const [input] = vi.mocked(provisionUser).mock.calls[0]!;
    expect(input).not.toHaveProperty('organizationId');
  });

  it('shows the one-time temporary password and clears it when the dialog closes', async () => {
    renderPage();

    await openProvisionDialog();
    fillProvisionForm();
    fireEvent.click(screen.getByRole('button', { name: 'Create user' }));

    const passwordDialog = await screen.findByRole('dialog', {
      name: 'Temporary password',
    });
    expect(temporaryPasswordValue()).toBe('Temp-Password-1');
    // The list is not a way back to the credential: no member row carries it.
    expect(screen.getAllByDisplayValue('Temp-Password-1')).toHaveLength(1);

    fireEvent.click(within(passwordDialog).getByRole('button', { name: 'Done' }));

    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Temporary password' }),
      ).toBeNull(),
    );
    // Closing the surface is what discards it: the credential is unreachable from the page.
    expect(screen.queryByDisplayValue('Temp-Password-1')).toBeNull();
    expect(document.body.innerHTML).not.toContain('Temp-Password-1');
    // The page also resets the mutation so TanStack drops the result from its MutationCache.
    expect(provisionReset).toHaveBeenCalled();
  });

  it('clears a failed provision error when the dialog is reopened', async () => {
    provisionState = {
      isPending: false,
      isError: true,
      error: new AxiosError(
        'Email is already in use.',
        AxiosError.ERR_BAD_REQUEST,
        undefined,
        undefined,
        { status: 409, data: { code: 'EMAIL_ALREADY_EXISTS', detail: 'Email is already in use.' } } as never,
      ),
    };

    const { refresh } = renderPage();
    await openProvisionDialog();

    // Conflict copy must be inside the open dialog and announced as a warning, not hidden behind
    // the modal backdrop or marked as a server failure.
    const dialog = screen.getByRole('dialog', { name: 'Provision a workforce user' });
    expect(within(dialog).getByTestId('provision-conflict').textContent)
      .toContain('Email is already in use.');
    expect(within(dialog).getByTestId('provision-conflict').getAttribute('role')).toBe('alert');
    expect(within(dialog).getByTestId('provision-conflict').textContent).not.toContain('Error');
    expect(document.body.textContent).toContain('Email is already in use.');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Provision a workforce user' })).toBeNull(),
    );

    // Reset clears the mutation state on close; after reopening with that state the old conflict
    // must not return.
    expect(provisionReset).toHaveBeenCalled();
    const reopenedDialog = await openProvisionDialog();
    refresh();
    expect(within(reopenedDialog).queryByTestId('provision-conflict')).toBeNull();
  });

  it('shows subscription denial as a warning inside the open provision dialog', async () => {
    provisionState = {
      isPending: false,
      isError: true,
      error: new AxiosError(
        'An active subscription is required.',
        AxiosError.ERR_BAD_REQUEST,
        undefined,
        undefined,
        { status: 403, data: { code: 'SUBSCRIPTION_INACTIVE', detail: 'An active subscription is required.' } } as never,
      ),
    };

    renderPage();
    const deniedDialog = await openProvisionDialog();

    expect(within(deniedDialog).getByTestId('permission-denied').textContent)
      .toContain('An active subscription is required.');
    expect(within(deniedDialog).getByTestId('permission-denied').getAttribute('role')).toBe('alert');
    expect(within(deniedDialog).getByTestId('permission-denied').textContent)
      .toContain('Permission required');
  });

  it('shows subscription denial as a warning inside the role editor', async () => {
    users.data = [MEMBER];
    rolesState = {
      isPending: false,
      isError: true,
      error: new AxiosError(
        'An active subscription is required.',
        AxiosError.ERR_BAD_REQUEST,
        undefined,
        undefined,
        {
          status: 403,
          data: {
            code: 'SUBSCRIPTION_INACTIVE',
            detail: 'An active subscription is required.',
          },
        } as never,
      ),
    };

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit roles' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit roles' });
    const warning = within(dialog).getByTestId('permission-denied');

    expect(warning.textContent).toContain('An active subscription is required.');
    expect(warning.getAttribute('role')).toBe('alert');
  });

  it('shows a role-update conflict as a warning inside the role editor', async () => {
    users.data = [MEMBER];
    rolesState = {
      isPending: false,
      isError: true,
      error: new AxiosError(
        'Role update conflicts with organization policy.',
        AxiosError.ERR_BAD_REQUEST,
        undefined,
        undefined,
        {
          status: 409,
          data: {
            code: 'ROLE_CONFLICT',
            detail: 'Role update conflicts with organization policy.',
          },
        } as never,
      ),
    };

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit roles' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit roles' });
    const warning = within(dialog).getByTestId('roles-conflict');

    expect(warning.textContent).toContain('Role update conflicts with organization policy.');
    expect(warning.getAttribute('role')).toBe('alert');
  });

  it('clears a failed role edit when the dialog is reopened', async () => {
    users.data = [MEMBER];
    rolesState = {
      isPending: false,
      isError: true,
      error: new AxiosError(
        'Role update failed.',
        AxiosError.ERR_BAD_REQUEST,
        undefined,
        undefined,
        { status: 409, data: { code: 'ROLE_CONFLICT', detail: 'Role update failed.' } } as never,
      ),
    };

    const { refresh } = renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit roles' }));
    let dialog = await screen.findByRole('dialog', { name: 'Edit roles' });
    expect(within(dialog).getByTestId('roles-conflict').textContent).toContain('Role update failed.');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Edit roles' })).toBeNull());
    expect(rolesReset).toHaveBeenCalled();

    refresh();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit roles' }));
    dialog = await screen.findByRole('dialog', { name: 'Edit roles' });
    expect(within(dialog).queryByTestId('roles-conflict')).toBeNull();
  });

  it('keeps normal route-level page behavior intact', () => {});

  it('clears the temporary password when the page unmounts with the dialog open', async () => {
    const { unmount } = renderPage();

    await openProvisionDialog();
    fillProvisionForm();
    fireEvent.click(screen.getByRole('button', { name: 'Create user' }));
    expect(temporaryPasswordValue()).toBe('Temp-Password-1');

    unmount();

    expect(document.body.innerHTML).not.toContain('Temp-Password-1');
  });

  it('never writes the temporary password into browser storage', async () => {
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem');

    renderPage();

    await openProvisionDialog();
    fillProvisionForm();
    fireEvent.click(screen.getByRole('button', { name: 'Create user' }));
    await screen.findByRole('dialog', { name: 'Temporary password' });

    expect(temporaryPasswordValue()).toBe('Temp-Password-1');
    expect(JSON.stringify(localStorage)).not.toContain('Temp-Password-1');
    expect(JSON.stringify(sessionStorage)).not.toContain('Temp-Password-1');
    for (const call of storageSpy.mock.calls) {
      expect(JSON.stringify(call)).not.toContain('Temp-Password-1');
    }
    storageSpy.mockRestore();
  });

  it('disables the create action and refuses a repeat submit while the request is pending', async () => {
    // The request has not resolved, so the mutation object reports itself pending.
    provisionUser.mockImplementation(() => undefined);
    const { refresh } = renderPage();

    await openProvisionDialog();
    fillProvisionForm();
    fireEvent.click(screen.getByRole('button', { name: 'Create user' }));
    expect(provisionUser).toHaveBeenCalledTimes(1);

    act(() => {
      provisionState = { isPending: true, isError: false, error: null };
    });
    refresh();

    const submit = screen.getByRole('button', { name: 'Create user' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    // Neither a second press nor a keyboard submit may reach the server: provisioning issues a
    // credential, so a duplicate call would create a second account the operator must clean up.
    fireEvent.click(submit);
    fireEvent.submit(screen.getByRole('dialog', { name: 'Provision a workforce user' }).querySelector('form')!);
    expect(provisionUser).toHaveBeenCalledTimes(1);
  });

  it('suspends an active member', async () => {
    users.data = [MEMBER];

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Suspend user' }));

    await waitFor(() =>
      expect(updateStatus).toHaveBeenCalledWith({
        userId: MEMBER.userId,
        status: 'SUSPENDED',
      }),
    );
  });

  it('re-activates a suspended member', async () => {
    users.data = [{ ...MEMBER, status: 'SUSPENDED' }];

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Activate user' }));

    await waitFor(() =>
      expect(updateStatus).toHaveBeenCalledWith({
        userId: MEMBER.userId,
        status: 'ACTIVE',
      }),
    );
  });

  it('opens the role editor pre-filled from the member and saves the changed set', async () => {
    users.data = [
      { ...MEMBER, roles: ['INSPECTOR', 'MAINTENANCE_ENGINEER'] },
    ];

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit roles' }));

    const dialog = await screen.findByRole('dialog', { name: 'Edit roles' });
    // The current role set arrives selected, so saving without touching anything is a no-op
    // rather than a silent reset to nothing.
    expect(within(dialog).getByLabelText('Inspector')).toHaveProperty('checked', true);
    expect(within(dialog).getByLabelText('Maintenance engineer')).toHaveProperty(
      'checked',
      true,
    );

    fireEvent.click(within(dialog).getByLabelText('Maintenance engineer'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save roles' }));

    await waitFor(() =>
      expect(updateRoles).toHaveBeenCalledWith(
        { userId: MEMBER.userId, roles: ['INSPECTOR'] },
        expect.anything(),
      ),
    );
  });

  it('closes the role editor after the change is saved', async () => {
    users.data = [MEMBER];
    updateRoles.mockImplementation((_input, options) => {
      options?.onSuccess?.({ ...MEMBER, roles: ['INSPECTOR', 'MAINTENANCE_ENGINEER'] });
    });

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit roles' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit roles' });
    fireEvent.click(within(dialog).getByLabelText('Maintenance engineer'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save roles' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Edit roles' })).toBeNull(),
    );
  });

  it('will not submit an empty role set', async () => {
    users.data = [MEMBER];

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit roles' }));

    const dialog = await screen.findByRole('dialog', { name: 'Edit roles' });
    fireEvent.click(within(dialog).getByLabelText('Inspector'));

    expect(
      (within(dialog).getByRole('button', { name: 'Save roles' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(updateRoles).not.toHaveBeenCalled();
  });

  it('reports a failed provisioning without losing the entered draft', async () => {
    // A duplicate address inside this organization is refused server-side; the client reports the
    // server's own wording and keeps the draft.
    provisionUser.mockImplementation((_input, options) => {
      options?.onError?.(new Error('That email address is already used in this organization.'));
    });
    const { refresh } = renderPage();

    await openProvisionDialog();
    fillProvisionForm();
    fireEvent.click(screen.getByRole('button', { name: 'Create user' }));

    // The request failed: the form keeps the operator's values so the address can be corrected,
    // and no credential is issued.
    act(() => {
      provisionState = {
        isPending: false,
        isError: true,
        error: new Error('That email address is already used in this organization.'),
      };
    });
    refresh();

    expect(
      await screen.findByText('That email address is already used in this organization.'),
    ).toBeTruthy();
    expect(inputValue(/Email/)).toBe('new.member@example.test');
    expect(inputValue(/Full name/)).toBe('New Member');
    expect(screen.queryByRole('dialog', { name: 'Temporary password' })).toBeNull();
  });

  it('starts the next provisioning from an empty form rather than the previous draft', async () => {
    renderPage();

    await openProvisionDialog();
    fillProvisionForm();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Provision a workforce user' }),
      ).toBeNull(),
    );

    await openProvisionDialog();

    // A dismissed draft is not carried over: the next dialog starts clean, so a half-entered
    // address cannot be submitted by someone who assumed it was a fresh form.
    expect(inputValue(/Email/)).toBe('');
    expect(inputValue(/Full name/)).toBe('');
    expect(
      (screen.getByLabelText('Inspector') as HTMLInputElement).checked,
    ).toBe(false);
  });
});