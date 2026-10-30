import { ThemeProvider } from '@mui/material/styles';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { theme } from '@/app/theme/theme';
import { useAuthStore } from '../store/authStore';
import RegisterPage from './RegisterPage';

const mocks = vi.hoisted(() => ({
  evaluateAirspace: vi.fn(),
  getAuthErrorMessage: vi.fn(() => 'Registration failed.'),
  registerOrganization: vi.fn(),
  categories: vi.fn(),
}));

vi.mock('../api/authApi', () => ({
  evaluateAirspace: mocks.evaluateAirspace,
  getAuthErrorMessage: mocks.getAuthErrorMessage,
  registerOrganization: mocks.registerOrganization,
}));
vi.mock('@/shared/api/client', () => ({
  api: { get: vi.fn().mockResolvedValue({ data: [{ id: 'cat-1', name: 'Bridge', active: true }] }) },
}));

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="Current location">{location.pathname}{location.search}</output>;
}

function renderRegister() {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={['/register']}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

async function fillRegistrationForm() {
  const fields = [
    ['Your full name', 'Customer Admin'],
    ['Work email', 'customer@example.test'],
    ['Organization name', 'Example Infrastructure'],
    ['Organization code', 'EXAMPLE'],
    ['Asset code', 'AST-001'],
    ['Asset name', 'Main bridge'],
    ['Location description', 'District 1, HCMC'],
    ['Latitude', '10.9'],
    ['Longitude', '106.7'],
    ['Password', 'a sufficiently long password'],
    ['Confirm password', 'a sufficiently long password'],
  ];
  for (const [label, value] of fields) {
    fireEvent.change(screen.getByLabelText(label!), { target: { value } });
  }
  fireEvent.mouseDown(screen.getByLabelText('Asset category'));
  const listbox = await screen.findByRole('listbox');
  fireEvent.click(within(listbox).getByRole('option', { name: 'Bridge' }));
}

describe('customer organization registration', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().clearSession();
    mocks.evaluateAirspace.mockResolvedValue({ classification: 'UNKNOWN', advisoryMessage: 'Partial advisory data; review required.' });
  });

  it('requires the first asset and its location as part of registration', async () => {
    renderRegister();
    await fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Asset code is required.')).toBeTruthy();
    expect(mocks.registerOrganization).not.toHaveBeenCalled();
  });

  it('sends first-asset data and keeps pending airspace registration out of login', async () => {
    mocks.registerOrganization.mockResolvedValue({
      registrationStatus: 'PENDING_AIRSPACE_REVIEW',
      organizationId: null,
      reviewMessage: 'An administrator must review your location.',
      user: { id: 'prospect-1', email: 'customer@example.test', fullName: 'Customer Admin', roles: ['CUSTOMER'], actorZone: 'PROSPECT_CUSTOMER', organizationId: null },
    });
    renderRegister();
    await fillRegistrationForm();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() => {
      expect(mocks.registerOrganization).toHaveBeenCalled();
      expect(screen.getByText('An administrator must review your location.')).toBeTruthy();
    });
    expect(mocks.registerOrganization).toHaveBeenCalledWith(expect.objectContaining({
      firstAsset: expect.objectContaining({ code: 'AST-001', categoryId: 'cat-1', latitude: 10.9, longitude: 106.7 }),
    }));
    expect(screen.getByLabelText('Current location').textContent).toContain('/register');
  });

  it('blocks submission when the advisory evaluation reports a no-fly zone', async () => {
    mocks.evaluateAirspace.mockResolvedValue({ classification: 'NO_FLY_ZONE', advisoryMessage: 'Registration is blocked in this no-fly zone.' });
    mocks.registerOrganization.mockResolvedValue({ registrationStatus: 'ACTIVE' });
    renderRegister();
    await fillRegistrationForm();
    await waitFor(() => expect(mocks.evaluateAirspace).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText('Registration is blocked in this no-fly zone.')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(mocks.registerOrganization).not.toHaveBeenCalled());
  });
});
