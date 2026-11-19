import { ThemeProvider } from '@mui/material/styles';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { theme } from '@/app/theme/theme';
import PlatformSettingsHubPage from './PlatformSettingsHubPage';

vi.mock('./PlatformFinanceSettingsPage', () => ({
  default: () => <div>Finance settings panel</div>,
}));

vi.mock('./PlatformOperationsSettingsPage', () => ({
  default: () => <div>Operations settings panel</div>,
}));

vi.mock('./PlatformAiSettingsPage', () => ({
  default: () => <div>AI settings panel</div>,
}));

function renderPage(entry = '/admin/platform-settings') {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[entry]}>
        <PlatformSettingsHubPage />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('PlatformSettingsHubPage', () => {
  afterEach(cleanup);

  it('renders the three consolidated settings workspaces', () => {
    renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Platform settings' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /Finance & Tax/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /Operations & Dispatch/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /AI & Model Performance/i })).toBeTruthy();
    expect(screen.getByText('Finance settings panel')).toBeTruthy();
  });

  it('opens the tab requested by a legacy redirect deep link', () => {
    renderPage('/admin/platform-settings?tab=operations');
    expect(screen.getByText('Operations settings panel')).toBeTruthy();
    expect(screen.queryByText('Finance settings panel')).toBeNull();
  });

  it('switches to the AI settings workspace', () => {
    renderPage();

    fireEvent.click(screen.getByRole('tab', { name: /AI & Model Performance/i }));
    expect(screen.getByText('AI settings panel')).toBeTruthy();
  });
});
