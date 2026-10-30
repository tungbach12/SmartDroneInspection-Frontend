import { ThemeProvider } from '@mui/material/styles';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { theme } from '@/app/theme/theme';
import Mf1ReviewPage from './Mf1ReviewPage';
import { mf1ReviewApi } from '../api/mf1ReviewApi';

const originalCreateObjectUrl = URL.createObjectURL;

vi.mock('../api/mf1ReviewApi', () => ({
  mf1ReviewApi: {
    pendingCustomers: vi.fn(), approveCustomer: vi.fn(), rejectCustomer: vi.fn(),
    pendingPartners: vi.fn(), approvePartner: vi.fn(), rejectPartner: vi.fn(),
    partnerLicenseDocument: vi.fn(), droneEvidence: vi.fn(),
    pendingDrones: vi.fn(), approveDrone: vi.fn(), rejectDrone: vi.fn(),
  },
}));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<ThemeProvider theme={theme}><QueryClientProvider client={queryClient}><Mf1ReviewPage /></QueryClientProvider></ThemeProvider>);
}

describe('MF1 review queues', () => {
  afterEach(() => {
    cleanup();
    URL.createObjectURL = originalCreateObjectUrl;
  });
  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn().mockReturnValue('blob:license-evidence');
    vi.mocked(mf1ReviewApi.pendingCustomers).mockResolvedValue([{ id: 'review-1', userId: 'user-1', organizationName: 'Bridge Co', organizationCode: 'BRIDGE', assetName: 'Main bridge', assetCode: 'AST-1', airspaceClassification: 'UNKNOWN', status: 'PENDING', reviewNote: null, reviewedByUserId: null, reviewedAt: null, createdAt: '2026-10-29T00:00:00Z' }]);
    vi.mocked(mf1ReviewApi.pendingPartners).mockResolvedValue([{ id: 'partner-1', email: 'pilot@example.test', fullName: 'Pilot One', phone: null, pilotLicenseNumber: 'LIC-1', pilotLicenseClass: 'A', pilotLicenseExpiresAt: '2027-12-31', pilotLicenseFileKey: 'licenses/lic-1', partnerContractFileKey: null, status: 'PENDING', reviewNote: null, createdAt: '2026-10-29T00:00:00Z' }]);
    vi.mocked(mf1ReviewApi.partnerLicenseDocument).mockResolvedValue(new Blob(['%PDF-1.7']));
    vi.mocked(mf1ReviewApi.droneEvidence).mockResolvedValue(new Blob(['%PDF-1.7']));
    vi.mocked(mf1ReviewApi.pendingDrones).mockResolvedValue([{ id: 'drone-application-1', inspectorUserId: 'pilot-1', serialNumber: 'SN-1', model: 'Surveyor', manufacturer: 'Aero', registrationNumber: 'REG-1', registrationFileKey: 'drone/reg', registrationExpiresAt: '2027-12-31T00:00:00Z', ownershipFileKey: 'drone/owner', inspectionFileKey: 'drone/inspection', status: 'PENDING', reviewNote: null, droneId: null, createdAt: '2026-10-29T00:00:00Z' }]);
  });

  it('requires an administrator note before approving an unknown-airspace prospect', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Review' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Approve' }));
    expect(await screen.findByText('An administrator review note is required for non-clear locations.')).toBeTruthy();
    expect(mf1ReviewApi.approveCustomer).not.toHaveBeenCalled();
  });

  it('loads the submitted pilot license evidence before an admin reviews the partner', async () => {
    const createObjectUrl = vi.mocked(URL.createObjectURL);
    renderPage();
    fireEvent.click(await screen.findByRole('tab', { name: /Inspector partners/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Review' }));
    expect(await screen.findByTitle('Pilot license')).toBeTruthy();
    expect(mf1ReviewApi.partnerLicenseDocument).toHaveBeenCalledWith('partner-1');
    expect(createObjectUrl).toHaveBeenCalled();
  });

  it('blocks partner approval when the license evidence cannot be loaded', async () => {
    vi.mocked(mf1ReviewApi.partnerLicenseDocument).mockRejectedValue(new Error('not found'));
    renderPage();
    fireEvent.click(await screen.findByRole('tab', { name: /Inspector partners/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Review' }));

    expect(await screen.findByText('Evidence documents could not be loaded. Refresh the queue and try again.')).toBeTruthy();
    expect((await screen.findByRole('button', { name: 'Approve' })).hasAttribute('disabled')).toBe(true);
  });

  it('requires a partner contract file key before inspector approval', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('tab', { name: /Inspector partners/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Review' }));
    await screen.findByTitle('Pilot license');
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(await screen.findByText('A verified partner contract file key is required before approval.')).toBeTruthy();
    expect(mf1ReviewApi.approvePartner).not.toHaveBeenCalled();
  });

  it('requires a rejection reason before refusing a drone application', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('tab', { name: /Drone registrations/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Review' }));
    fireEvent.mouseDown(screen.getByLabelText('Decision'));
    fireEvent.click(await screen.findByRole('option', { name: 'Reject' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    await waitFor(() => expect(screen.getByText('A reason is required to reject an application.')).toBeTruthy());
    expect(mf1ReviewApi.rejectDrone).not.toHaveBeenCalled();
  });
});
